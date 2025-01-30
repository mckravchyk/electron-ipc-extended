/* eslint-disable class-methods-use-this, space-before-function-paren, function-paren-newline */

import type { IpcRenderer, IpcRendererEvent } from 'electron';

import type {
  IpcActionDomain,
  IpcActions,
  IpcInvokeAction,
  IpcInvokeActionDomain,
  UntypedIpcActions,
} from './ipc_actions';

import {
  Ipc,
  type Envelope,
  type MessageId,
  type NativeIpcDep,
  type Options,
} from './ipc';

export interface RendererIpcEvent extends IpcRendererEvent {
  messageId: MessageId;
}

/**
 * Minimal IpcRenderer dependency.
 */
export interface IpcRendererDep extends NativeIpcDep<IpcRendererEvent> {
  send: (channel: string, ...args: unknown[]) => void
}

/**
 * Creates a minimal IpcRenderer dependency that can be passed via Context Bridge.
 *
 * This allows to initialize RendererIpc in the main context of the renderer process, even when
 * nodeIntegration is disabled and contextIsolation is enabled. RendererIpc must be initialized
 * in the main context so that event listeners are removed.
 *
 * The usage is as follows:
 *
 * preload.js:
 *   contextBridge.exposeInMainWorld('ipcRenderer', createIpcRendererBridgePass(ipcRenderer));
 *
 * renderer.js:
 *   const rendererIpc = new RendererIpc(window.ipcRenderer);
 *
 * NOTE: An instance created this way cannot be fully destroyed. Error will be thrown. This is
 * because it can't remove its own listeners to Electron IPC over the bridge.
 *
 * NOTE: This is meant only for renderers that are running local, trusted content. Remote renderers
 * should have the instance fully initialized in the preload script, with the API exposed over well
 * defined functions and masking of event.sender / event.reply.
 */
export function createIpcRendererBridgePass(ipc: IpcRenderer): IpcRendererDep {
  return {
    send: ipc.send.bind(ipc),
    on: ipc.on.bind(ipc),
    off: ipc.off.bind(ipc),
  };
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
  public constructor(
    ipc: IpcRendererDep,
    options: Options = { },
  ) {
    super(ipc, options);
  }

  public destroy(): void {
    // NOTE: ipc_ will be null if already destroyed and then we don't want the type error
    // (destroying again does not throw).
    const isBridgePass = this.ipc_ !== null && typeof (this.ipc_ as IpcRenderer).sendSync !== 'function';
    super.destroy();

    if (isBridgePass) {
      throw new Error('RendererIpc cannot be destroyed fully when initialized with createIpcRendererBridgePass()');
    }
  }

  protected respond_(electronEvent: IpcRendererEvent, envelope: Envelope): void {
    (this.ipc_ as IpcRendererDep).send(Ipc.RESPONSES_CHANNEL, envelope);
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
    (this.ipc_ as IpcRendererDep).send(electronChannel as string, envelope);
  }
}
