/* eslint-disable class-methods-use-this, space-before-function-paren, function-paren-newline */

import type { IpcRenderer, IpcRendererEvent } from 'electron';
import type {
  IpcActionDomain,
  IpcActions,
  IpcInvokeAction,
  IpcInvokeActionDomain,
  UntypedIpcActions,
} from './ipc_actions';

import { Ipc, type Envelope, type MessageId } from './ipc';

export interface RendererIpcEvent extends IpcRendererEvent {
  messageId: MessageId;
}

/**
 * An extended IPC wrapper for `IpcRenderer` that adds type-safety, support for handling commands
 * in the renderer and some other enhancements.
 *
 * NOTE: Its use over the context bridge is meant only for renderers running local content. It
 * should not be used over the context bridge with remote content (in such case the send method
 * should filter allowed commands and the on method should not expose event.sender).
 */
export class RendererIpc<
  RendererActions extends IpcActions = UntypedIpcActions,
  MpActions extends IpcActions = UntypedIpcActions
> extends Ipc<RendererIpcEvent, RendererActions, MpActions> {
  protected respond_(electronEvent: IpcRendererEvent, envelope: Envelope): void {
    (this.ipc_ as IpcRenderer).send(Ipc.RESPONSES_CHANNEL, envelope);
  }

  protected createEvent_(originEvent: IpcRendererEvent, envelope: Envelope): RendererIpcEvent {
    return {
      ...originEvent,
      messageId: envelope.messageId,
    };
  }

  /**
   * Dispatches an event.
   */
  public send<
    Events extends RendererActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    ...args: Args
  ): void {
    this.send_(Ipc.EVENTS_CHANNEL, channel as string, args);
  }

  /**
   * Makes a call.
   */
  public call<
    Calls extends MpActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    ...args: Args
  ): void {
    this.send_(Ipc.CALLS_CHANNEL, channel as string, args);
  }

  /**
   * Invokes a command.
   */
  public invoke<
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    ReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    command: Command,
    ...args: Args
  ): ReturnVal extends Promise<unknown> ? ReturnVal : Promise<ReturnVal> {
    return this.invoke_(
      command as string,
      (messageId) => {
        this.send_(Ipc.COMMANDS_CHANNEL, command as string, args, messageId);
      },
      -1,
    ) as ReturnVal extends Promise<unknown> ? ReturnVal : Promise<ReturnVal>;
  }

  // eslint-disable-next-line max-len, class-methods-use-this
  private send_(
    electronChannel: string,
    channel: string,
    args: unknown[],
    messageId?: MessageId,
  ): void {
    const envelope = Ipc.wrap_(args, channel, messageId || undefined);
    (this.ipc_ as IpcRenderer).send(electronChannel as string, envelope);
  }
}
