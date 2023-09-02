import type {
  IpcMain,
  IpcMainEvent,
  WebContents,
} from 'electron';

import type {
  IpcActionDomain,
  IpcActions,
  IpcInvokeAction,
  IpcInvokeActionDomain,
} from './ipc_actions';

export type FrameTarget = { webContents: WebContents, frameProcessId: number, frameId: number };

export type MessageTarget = WebContents | FrameTarget;

/**
 * A typed IPC interface to communicate with renderers.
 */
export interface MainIpc<
  MpActions extends IpcActions,
  RenderersActions extends IpcActions
> {
  /**
   * Dispatches an event.
   */
  send: <
    Events extends MpActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    target: MessageTarget,
    channel: Channel,
    ...args: Args
  ) => void

  /**
   * Makes a call.
   */
  call: <
    Calls extends RenderersActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    target: MessageTarget,
    channel: Channel,
    ...args: Args
  ) => void

  // TODO: Consider adding an options argument for on/receive/handle and add an option to only
  // accept IPC calls from certain webContents or webContents IDs.

  /**
   * Listens for an event.
   */
  on: <
    Events extends RenderersActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (event: IpcMainEvent, ...args: Args) => void
  ) => void

  once: <
    Events extends RenderersActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (event: IpcMainEvent, ...args: Args) => void
  ) => void

  /**
   * Receives a call.
   */
  receive: <
    Calls extends MpActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    receiver: (event: IpcMainEvent, ...args: Args) => void
  ) => IpcMain

  receiveOnce: <
    Calls extends MpActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    receiver: (event: IpcMainEvent, ...args: Args) => void
  ) => IpcMain

  /**
   * Handles a command.
   */
  handle: <
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    CbReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    command: Command,
    handler: (event: IpcMainEvent, ...args: Args) => CbReturnVal
  ) => void

  handleOnce: <
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    CbReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    command: Command,
    handler: (event: IpcMainEvent, ...args: Args) => CbReturnVal
  ) => void

  /**
   * Removes an event listener.
   */
  removeListener: <
    Events extends RenderersActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (event: IpcMainEvent, ...args: Args) => void
  ) => void

  /**
   * Removes a receiver of a call.
   */
  removeReceiver: <
    Calls extends MpActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    receiver: (event: IpcMainEvent, ...args: Args) => void
  ) => void

  /**
   * Removes a command handler.
   */
  removeHandler: <
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
  >(
    command: Command,
  ) => void
}

export function createMainIpc<
  MpActions extends IpcActions,
  RenderersActions extends IpcActions
>(electronIpcMain: IpcMain): MainIpc<MpActions, RenderersActions> {
  const send = (target: MessageTarget, channel: string, ...args: unknown[]) => {
    if (typeof (target as FrameTarget).webContents === 'undefined') {
      (target as WebContents).send(channel, ...args);
      return;
    }

    const frameTarget = target as FrameTarget;

    frameTarget.webContents.sendToFrame(
      [frameTarget.frameProcessId, frameTarget.frameId],
      channel,
      ...args,
    );
  };

  return {
    on: electronIpcMain.on.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['on'],
    once: electronIpcMain.once.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['once'],
    receive: electronIpcMain.on.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['receive'],
    receiveOnce: electronIpcMain.once.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['receiveOnce'],
    handle: electronIpcMain.handle.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['handle'],
    handleOnce: electronIpcMain.handleOnce.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['handleOnce'],
    removeListener: electronIpcMain.removeListener.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['removeListener'],
    removeReceiver: electronIpcMain.removeListener.bind(electronIpcMain) as MainIpc<MpActions, RenderersActions>['removeReceiver'],
    removeHandler: electronIpcMain.removeHandler.bind(electronIpcMain),
    send,
    call: send,
  };
}
