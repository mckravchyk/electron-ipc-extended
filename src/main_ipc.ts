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
    webContents: WebContents,
    channel: Channel,
    ...args: Args
  ) => void

  /**
   * Calls an (unawaitable) command.
   */
  call: <
    Commands extends RenderersActions['commands'],
    Command extends (Commands extends IpcActionDomain ? keyof Commands : never),
    Args extends (Commands[Command] extends unknown[] ? Commands[Command] : unknown[])
  >(
    webContents: WebContents,
    command: Command,
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
   * Receives an (unawaitable) command.
   */
  receive: <
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcActionDomain ? keyof Commands : never),
    Args extends (Commands[Command] extends unknown[] ? Commands[Command] : unknown[])
  >(
    command: Command,
    receiver: (event: IpcMainEvent, ...args: Args) => void
  ) => IpcMain

  receiveOnce: <
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcActionDomain ? keyof Commands : never),
    Args extends (Commands[Command] extends unknown[] ? Commands[Command] : unknown[])
  >(
    command: Command,
    receiver: (event: IpcMainEvent, ...args: Args) => void
  ) => IpcMain

  /**
   * Handles an awaitable command.
   */
  handle: <
    Commands extends MpActions['awaitableCommands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    CbReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    command: Command,
    handler: (event: IpcMainEvent, ...args: Args) => CbReturnVal
  ) => void

  handleOnce: <
    Commands extends MpActions['awaitableCommands'],
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
   * Removes a receiver of an (unawaitable) command.
   */
  removeReceiver: <
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcActionDomain ? keyof Commands : never),
    Args extends (Commands[Command] extends unknown[] ? Commands[Command] : unknown[])
  >(
    command: Command,
    receiver: (event: IpcMainEvent, ...args: Args) => void
  ) => void

  /**
   * Removes a handler of an awaitable command.
   */
  removeHandler: <
    Commands extends MpActions['awaitableCommands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
  >(
    command: Command,
  ) => void
}

export function createMainIpc<
  MpActions extends IpcActions,
  RenderersActions extends IpcActions
>(electronIpcMain: IpcMain): MainIpc<MpActions, RenderersActions> {
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
    send: (webContents, channel, ...args) => { webContents.send(channel, ...args); },
    call: (webContents, channel, ...args) => { webContents.send(channel, ...args); },
  };
}
