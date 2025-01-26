/* eslint-disable class-methods-use-this, space-before-function-paren, function-paren-newline */

import type {
  IpcMainEvent,
  WebContents,
} from 'electron';

import type {
  IpcActionDomain,
  IpcActions,
  IpcInvokeAction,
  IpcInvokeActionDomain,
  UntypedIpcActions,
} from './ipc_actions';

import { Ipc, type Envelope, type MessageId } from './ipc';

export interface MainIpcEvent extends IpcMainEvent {
  messageId: MessageId;
}

export type FrameTarget = { webContents: WebContents, frameProcessId: number, frameId: number };

/**
 * An extended IPC wrapper for `IpcMain` that adds type-safety and some enhancements.
 */
export class MainIpc<
  MpActions extends IpcActions = UntypedIpcActions,
  RenderersActions extends IpcActions = UntypedIpcActions
> extends Ipc<MainIpcEvent, MpActions, RenderersActions> {
  protected respond_(electronEvent: IpcMainEvent, envelope: Envelope): void {
    electronEvent.reply(Ipc.RESPONSES_CHANNEL, envelope);
  }

  protected createEvent_(electronEvent: IpcMainEvent, envelope: Envelope): MainIpcEvent {
    return {
      ...electronEvent,
      messageId: envelope.messageId,
    };
  }

  /**
   * Dispatches an event.
   */
  public send<
    Events extends MpActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    target: WebContents | FrameTarget,
    channel: Channel,
    ...args: Args
  ): void {
    this.send_(target, Ipc.EVENTS_CHANNEL, channel as string, args);
  }

  /**
   * Makes a call.
   */
  public call<
    Calls extends RenderersActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    target: WebContents | FrameTarget,
    channel: Channel,
    ...args: Args
  ): void {
    this.send_(target, Ipc.CALLS_CHANNEL, channel as string, args);
  }

  /**
   * Invokes a command.
   */
  public invoke<
    Commands extends RenderersActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    ReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    target: WebContents | FrameTarget,
    command: Command,
    ...args: Args
  ): ReturnVal extends Promise<unknown> ? ReturnVal : Promise<ReturnVal> {
    const webContentsId = typeof (target as FrameTarget).webContents === 'undefined'
      ? (target as WebContents).id
      : (target as FrameTarget).webContents.id;

    return this.invoke_(
      command as string,
      (messageId) => {
        this.send_(target, Ipc.COMMANDS_CHANNEL, command as string, args, messageId);
      },
      webContentsId,
    ) as ReturnVal extends Promise<unknown> ? ReturnVal : Promise<ReturnVal>;
  }

  // eslint-disable-next-line max-len, class-methods-use-this
  private send_(
    target: WebContents | FrameTarget,
    electronChannel: string,
    channel: string,
    args: unknown[],
    messageId?: MessageId,
  ): void {
    const envelope = Ipc.wrap_(args, channel, messageId || undefined);

    if (typeof (target as FrameTarget).webContents === 'undefined') {
      (target as WebContents).send(electronChannel as string, envelope);
      return;
    }

    const frameTarget = target as FrameTarget;

    frameTarget.webContents.sendToFrame(
      [frameTarget.frameProcessId, frameTarget.frameId],
      electronChannel as string,
      envelope,
    );
  }
}
