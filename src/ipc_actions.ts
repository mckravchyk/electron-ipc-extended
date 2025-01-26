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
 * confusion, it is recommended to prefix the channels with the name of the emitter (for events)
 * or receiver (for calls and commands) - i.e. 'tabs/create', 'menus/open'.
 */
export type IpcActionDomain = Record<string, IpcActionParameters>;

export interface IpcInvokeAction {
  params: IpcActionParameters,
  returnVal: unknown
}

export type IpcInvokeActionDomain = Record<string, IpcInvokeAction>;

export interface IpcActions {
  /**
   * An event is a plain IPC message that is dispatched from one source to one or more targets.
   * Events are defined by the module that emits them. Events are sent with the `send` method
   * and listened to with the `on` method.
   */
  events?: IpcActionDomain

  /**
   * A command is an IPC request that returns a result. They are defined by the side that handles
   * them and can be invoked from multiple sources. Commands are invoked with the `invoke` method
   * and handled with the `handle` method. A command can have only one handler. If a handler is not
   * registered, invoke() will throw an error after `Options.responseTimeout`.
   */
  commands?: IpcInvokeActionDomain

  /**
   * A call is a plain IPC message that is received in the target and can be called from many
   * sources. They are similar to commands and are defined by the receiving side, with the
   * difference being that they do not expect any data (including any guarantee that it has been
   * picked up on the other side). Calls are effectively the opposite of an event. Calls are called
   * with the `call` method and received with the `receive` method.
   */
  calls?: IpcActionDomain
}

export interface UntypedIpcActions {
  // any is better than unknown for callback parameters in untyped mode
  /* eslint-disable @typescript-eslint/no-explicit-any */
  events: Record<string, any[]>
  calls: Record<string, any[]>
  commands: Record<string, { params: any[], returnVal: unknown }>
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
