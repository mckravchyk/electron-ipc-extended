import type { IpcRenderer, IpcRendererEvent } from 'electron';
import type {
  IpcActionDomain,
  IpcActions,
  IpcInvokeAction,
  IpcInvokeActionDomain,
} from './ipc_actions';

/**
 * A typed IPC interface to communicate with the main process in renderers, ready to be used over
 * the context bridge (with renderers running trusted, local content only).
 *
 * Its use over the context bridge is meant only for renderers running local content. It should
 * absolutely not be used over the context bridge with remote content (in such case the send method
 * should filter allowed commands and the on method should not expose event.sender).
 */
export interface RendererIpc<RendererActions extends IpcActions, MpActions extends IpcActions> {
  /**
   * Dispatches an event.
   */
  send: <
   Events extends RendererActions['events'],
   Channel extends (Events extends IpcActionDomain ? keyof Events : never),
   Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    ...args: Args
  ) => void

  /**
   * Makes a call.
   */
  call: <
    Calls extends MpActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    ...args: Args
  ) => void

  /**
   * Invokes a command.
   */
  invoke: <
    Commands extends MpActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    ReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    command: Command,
    ...args: Args
  ) => ReturnVal extends Promise<unknown> ? ReturnVal : Promise<ReturnVal>

  /**
   * Listens for an event.
   */
  on: <
    Events extends MpActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (event: IpcRendererEvent, ...args: Args) => void
  ) => void

  /**
   * Receives a call.
   */
  receive: <
    Calls extends RendererActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    receiver: (event: IpcRendererEvent, ...args: Args) => void
  ) => void

  // TODO: Implement removeListener and removeReceiver. This cannot be acomplished by just exposing
  // the function as it's not going to work over the context bridge, the wrapper must keep track of
  // listener IDs which can be passed over the bridge. The priority for this is low as usually
  // there's no need to unbind the listeners which are usually initialized on init and are destroyed
  // together with the renderer process.
}

export function createRendererIpc<
  RendererActions extends IpcActions,
  MpActions extends IpcActions,
>(electronIpcRenderer: IpcRenderer): RendererIpc<RendererActions, MpActions> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, max-len
  const on = (channel: string, callback: (e: IpcRendererEvent, ...args: any[]) => void): void => {
    // This is required to make it work with contextBridge.
    electronIpcRenderer.on(channel, (e, ...args) => callback(e, ...args));
  };

  return {
    send: electronIpcRenderer.send,
    call: electronIpcRenderer.send,
    invoke: electronIpcRenderer.invoke as RendererIpc<RendererActions, MpActions>['invoke'],
    on: on as RendererIpc<RendererActions, MpActions>['on'],
    receive: on as RendererIpc<RendererActions, MpActions>['receive'],
  };
}
