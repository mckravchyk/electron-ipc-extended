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

/**
 * Represents a target frame within a webContents.
 */
export interface FrameTarget {
  /**
   * The webContents associated with the frame.
   */
  webContents: WebContents;

  /**
   * The process ID of the frame.
   */
  frameProcessId: number;

  /**
   * The frame ID within the process.
   */
  frameId: number;
}

/**
 * Main process IPC.
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
   * Dispatches an event to the `target`.
   */
  public send<
    Events extends MpActions['events'],
    EventName extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[EventName] extends unknown[] ? Events[EventName] : unknown[])
  >(
    target: WebContents | FrameTarget,
    eventName: EventName,
    ...args: Args
  ): void {
    this.send_(target, Ipc.EVENTS_CHANNEL, eventName, args);
  }

  /**
   * Calls a `route` in the `target`.
   */
  public call<
    Calls extends RenderersActions['calls'],
    Route extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Route] extends unknown[] ? Calls[Route] : unknown[])
  >(
    target: WebContents | FrameTarget,
    route: Route,
    ...args: Args
  ): void {
    this.send_(target, Ipc.CALLS_CHANNEL, route, args);
  }

  /**
   * Invokes a `command` in the `target`.
   *
   * @throws When the command response timed out or an error has been thrown in the handler.
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
