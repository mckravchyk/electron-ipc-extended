/**
 * Action parameters - the array represents parameters of the sending function and the spread
 * arguments in event handlers.
 *
 * To define sending a simple parameter, wrap it in [ ]. To define no arguments, use the empty tuple
 * type [].
 */
export type IpcActionParameters = unknown[];

/**
 * A record of event channel / command name as key and action parameters as value. To avoid
 * confusion, it is recommanded to prefix the channels with the name of the emitter (for events)
 * or receiver (for commands) - i.e. 'renderer/tabs/create', 'main/tabs/handleCreate',
 * 'main/tabs/didFinishLoad'.
 */
export type IpcActionDomain = Record<string, IpcActionParameters>;

export interface IpcInvokeAction {
  params: IpcActionParameters,
  returnVal: unknown
}

export type IpcInvokeActionDomain = Record<string, IpcInvokeAction>;

export interface IpcActions {
  /**
   * An event is a plain IPC message that is dispatched from one source to many targets. Events
   * are defined by the module that emits them. Events are sent with the `send` method and listened
   * to with the `on` method.
   */
  events?: IpcActionDomain

  /**
   * A command is a plain IPC message that is received in the target and can be called from many
   * sources. Commands are defined by the module that handles them. Commands are called with the
   * `call` method and received with the `receive` method.
   *
   * From the runtime perspective, they are identical to events. Command handling functions are just
   * aliases for event handling functions. However, from type and definitions perspective, commands
   * are used in the same way as awaitable commands.
   *
   * Plain (non-awaitable) commands have been introduced because ipcMain cannot invoke to
   * renderers and not all command-type IPC actions should be awaitable. Using awaitable
   * commands when they are not needed is an unncessary runtime overhead.
   */
  commands?: IpcActionDomain

  /**
   * An awaitable command is handled in the target and can be invoked from multiple sources.
   * Awaitable commands are defined by the module that handles them. Awaitable commands are
   * invoked with the `invoke` method and handled with the `handle` method.
   */
  awaitableCommands?: IpcInvokeActionDomain
}
