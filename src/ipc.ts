import type { IpcMainEvent, IpcRendererEvent } from 'electron';

import { ExternalPromise } from 'external-promise';

import type {
  IpcActionDomain,
  IpcActions,
  IpcInvokeAction,
  IpcInvokeActionDomain,
  UntypedIpcActions,
} from './ipc_actions';

import { generateId } from './lib/string';

import type { MainIpcEvent } from './main_ipc';

/* eslint-disable class-methods-use-this, space-before-function-paren, function-paren-newline */

// eslint-disable-next-line @typescript-eslint/no-explicit-any, max-len
type IpcEventParameters<Event> = [event: Event, ...args: any[]];

export type MessageId = `eipce_${string}`;
export type unsubscribeFn = () => void;

export interface Envelope<P extends unknown[] = unknown[]> {
  messageId: MessageId
  actionName: string
  params: P
}

interface CommandResponseOk {
  response: unknown
}

interface CommandResponseError {
  error: {
    message: string
  }
}

type CommandResponseResult = CommandResponseOk | CommandResponseError;

type IpcEventListener<
  Event
> = (...args: IpcEventParameters<Event>) => void

type IpcCommandHandler<
  Event
// eslint-disable-next-line @typescript-eslint/no-explicit-any
> = (...args: IpcEventParameters<Event>) => (Promise<any>) | (any);

interface ListenerEntry<Event> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listener_: (event: Event, ...args: any[]) => void
  once_: boolean
  id_: `lst_${string}`
}

export const DEFAULT_RESPONSE_TIMEOUT = 10000;

/**
 * Minimal Electron IPC dependency (IpcMain/IpcRenderer).
 */
export interface NativeIpcDep<Event> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (channel: string, listener: (event: Event, ...args: any[]) => void) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off: (channel: string, listener: (event: Event, ...args: any[]) => void) => void
}

export interface Options {
  /**
   * Maximum time (ms) allowed to receive, process and return back the response of a command. If
   * this threshold is exceeded the invoke promise will be rejected.
   */
  responseTimeout?: number
}

export abstract class Ipc<
  Event,
  SelfActions extends IpcActions = UntypedIpcActions,
  OtherActions extends IpcActions = UntypedIpcActions,
> {
  public static readonly EVENTS_CHANNEL = 'eipce-event';

  public static readonly CALLS_CHANNEL = 'eipce-call';

  public static readonly COMMANDS_CHANNEL = 'eipce-command';

  public static readonly RESPONSES_CHANNEL = 'eipce-response';

  protected ipc_: NativeIpcDep<Event extends MainIpcEvent ? IpcMainEvent : IpcRendererEvent>;

  private listeners_: Map<string, ListenerEntry<Event>[]> = new Map();

  private receivers_: Map<string, ListenerEntry<Event>[]> = new Map();

  private commandHandlers_: Map<
    string,
    { handler_: IpcCommandHandler<Event>, once_: boolean, id_: `hdl_${string}`, }
  > = new Map();

  private responsePromises_: Map<
    MessageId,
    { p_: ExternalPromise<unknown>, senderId_: number }
  > = new Map();

  private static globalHandlers_: string[] = [];

  private responseTimeout_: number;

  public constructor(
    ipc: NativeIpcDep<Event extends MainIpcEvent ? IpcMainEvent : IpcRendererEvent>,
    options: Options = { },
  ) {
    this.ipc_ = ipc;

    this.responseTimeout_ = typeof options.responseTimeout === 'number' && options.responseTimeout > 0
      ? options.responseTimeout
      : DEFAULT_RESPONSE_TIMEOUT;

    this.ipc_.on(Ipc.EVENTS_CHANNEL, this.handleEventMessage_);
    this.ipc_.on(Ipc.CALLS_CHANNEL, this.handleCallMessage_);
    this.ipc_.on(Ipc.COMMANDS_CHANNEL, this.handleCommandMessage_);
    this.ipc_.on(Ipc.RESPONSES_CHANNEL, this.handleResponseMessage_);
  }

  public destroy() {
    if (this.ipc_ === null) {
      return;
    }

    for (const p of Array.from(this.responsePromises_.values())) {
      p.p_.reject('eipce: Instance destroyed while awaiting response');
    }

    this.removeAllListeners();
    this.removeAllReceivers();
    this.removeAllHandlers();
    this.ipc_.off(Ipc.EVENTS_CHANNEL, this.handleEventMessage_);
    this.ipc_.off(Ipc.CALLS_CHANNEL, this.handleCallMessage_);
    this.ipc_.off(Ipc.COMMANDS_CHANNEL, this.handleCommandMessage_);
    this.ipc_.off(Ipc.RESPONSES_CHANNEL, this.handleResponseMessage_);

    // @ts-expect-error null
    this.ipc_ = null;

    // @ts-expect-error null
    this.listeners_ = null;

    // @ts-expect-error null
    this.receivers_ = null;

    // @ts-expect-error null
    this.commandHandlers_ = null;

    // @ts-expect-error null
    this.responsePromises_ = null;
  }

  /**
   * Sends a response to the command. The implementation must take care to use
   * Ipc.RESPONSES_CHANNEL as the Electron channel.
   */
  protected abstract respond_(
    electronEvent: IpcMainEvent | IpcRendererEvent,
    envelope: Envelope
  ): void;

  protected abstract createEvent_(
    electronEvent: IpcMainEvent | IpcRendererEvent,
    envelope: Envelope,
  ): Event;

  /**
   * @param command Command name
   * @param send A function that sends the command message, along with the args. The implementation
   * must take care to use Ipc.COMMANDS_CHANNEL as the Electron channel.
   */
  protected invoke_(
    command: string,
    send: (messageId: MessageId) => void,
    senderId: number,
  ): Promise<unknown> {
    const messageId = `eipce_${generateId()}` as const;

    const p = new ExternalPromise<unknown>();

    this.responsePromises_.set(messageId, {
      p_: p,
      senderId_: senderId,
    });

    send(messageId);

    setTimeout(() => {
      if (p.getState() === 'pending') {
        p.reject(new Error(`eipce: Command ${command} timed out after ${this.responseTimeout_}ms`));
        this.responsePromises_.delete(messageId);
      }
    }, this.responseTimeout_);

    return p.getPromise();
  }

  /**
   * Listens for an event.
   */
  public addListener<
    Events extends OtherActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (this: this, event: Event, ...args: Args) => void,
  ): unsubscribeFn {
    return Ipc.addListener(
      this.listeners_,
      channel as string,
      listener as IpcEventListener<Event>,
      false,
    );
  }

  /**
   * Listens for an event.
   */
  public on<
    Events extends OtherActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (this: this, event: Event, ...args: Args) => void,
  ): unsubscribeFn {
    return Ipc.addListener(
      this.listeners_,
      channel as string,
      listener as IpcEventListener<Event>,
      false,
    );
  }

  /**
   * Listens for an event, once.
   */
  public once<
    Events extends OtherActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (this: this, event: Event, ...args: Args) => void,
  ) : unsubscribeFn {
    return Ipc.addListener(
      this.listeners_,
      channel as string,
      listener as IpcEventListener<Event>,
      true,
    );
  }

  /**
   * Receives a call.
   */
  public receive<
    Calls extends SelfActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    receiver: (this: this, event: Event, ...args: Args) => void,
  ): unsubscribeFn {
    return Ipc.addListener(
      this.receivers_,
      channel as string,
      receiver as IpcEventListener<Event>,
      false,
    );
  }

  public receiveOnce<
    Calls extends SelfActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    receiver: (this: this, event: Event, ...args: Args) => void,
  ): unsubscribeFn {
    return Ipc.addListener(
      this.receivers_,
      channel as string,
      receiver as IpcEventListener<Event>,
      true,
    );
  }

  /**
   * Handles a command.
   */
  public handle<
    Commands extends SelfActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    CbReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    command: Command,
    handler: (this: this, event: Event, ...args: Args) => CbReturnVal,
  ): unsubscribeFn {
    return this.registerCommandHandler_(
      command as string,
      handler as IpcCommandHandler<Event>,
      false,
    );
  }

  public handleOnce<
    Commands extends SelfActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
    Args extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['params'] : unknown[]),
    CbReturnVal extends(Commands[Command] extends IpcInvokeAction ? Commands[Command]['returnVal'] : unknown)
  >(
    command: Command,
    handler: (this: this, event: Event, ...args: Args) => CbReturnVal,
  ): unsubscribeFn {
    return this.registerCommandHandler_(
      command as string,
      handler as IpcCommandHandler<Event>,
      true,
    );
  }

  /**
   * Removes an event listener.
   */
  public off<
    Events extends OtherActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (this: this, event: Event, ...args: Args) => void,
  ): void {
    Ipc.removeListener(this.listeners_, channel, listener);
  }

  /**
   * Removes an event listener.
   */
  public removeListener<
    Events extends OtherActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
    Args extends (Events[Channel] extends unknown[] ? Events[Channel] : unknown[])
  >(
    channel: Channel,
    listener: (this: this, event: Event, ...args: Args) => void,
  ): void {
    Ipc.removeListener(this.listeners_, channel, listener);
  }

  /**
   * Removes a call receiver.
   */
  public removeReceiver<
    Calls extends SelfActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
    Args extends (Calls[Channel] extends unknown[] ? Calls[Channel] : unknown[])
  >(
    channel: Channel,
    receiver: (this: this, event: Event, ...args: Args) => void,
  ): void {
    Ipc.removeListener(this.receivers_, channel, receiver);
  }

  /**
   * Removes a command handler.
   */
  public removeHandler<
    Commands extends SelfActions['commands'],
    Command extends (Commands extends IpcInvokeActionDomain ? keyof Commands : never),
  >(
    command: Command,
  ): void {
    this.removeCommandHandler(command);
  }

  /**
   * Removes all event listeners for a channel or all if a channel is not set.
   */
  public removeAllListeners<
    Events extends OtherActions['events'],
    Channel extends (Events extends IpcActionDomain ? keyof Events : never),
  >(
    channel?: Channel,
  ): void {
    if (channel) {
      this.listeners_.delete(channel);
    }
    else {
      this.listeners_.clear();
    }
  }

  /**
   * Removes all call receivers for a channel or all if a channel is not set.
   */
  public removeAllReceivers<
    Calls extends SelfActions['calls'],
    Channel extends (Calls extends IpcActionDomain ? keyof Calls : never),
  >(
    channel?: Channel,
  ): void {
    if (channel) {
      this.receivers_.delete(channel);
    }
    else {
      this.receivers_.clear();
    }
  }

  /**
   * Removes all command handlers.
   */
  public removeAllHandlers(): void {
    for (const command of Array.from(this.commandHandlers_.keys())) {
      // NOTE: It must be handled through this function rather than just clearing the map as the
      // command is also bound to the global scope.
      this.removeCommandHandler(command);
    }
  }

  private handleEventMessage_ = (e: IpcMainEvent | IpcRendererEvent, envelope: Envelope) => {
    if (!Ipc.isEnvelope_(envelope)) {
      throw new Error('Invalid event envelope [pF1A93bN6tp9]');
    }

    // eslint-disable-next-line max-len
    Ipc.emitEvent(this, this.listeners_, envelope.actionName, this.createEvent_(e, envelope), ...envelope.params);
  };

  private handleCallMessage_ = (e: IpcMainEvent | IpcRendererEvent, envelope: Envelope) => {
    if (!Ipc.isEnvelope_(envelope)) {
      throw new Error('Invalid call envelope [JDFJLzlwKU2r]');
    }

    // eslint-disable-next-line max-len
    Ipc.emitEvent(this, this.receivers_, envelope.actionName, this.createEvent_(e, envelope), ...envelope.params);
  };

  private handleCommandMessage_ = async (
    e: IpcMainEvent | IpcRendererEvent,
    envelope: Envelope,
  ) => {
    if (!Ipc.isEnvelope_(envelope)) {
      throw new Error('Invalid command envelope [z2M6uCF1xql5]');
    }

    const listener = this.commandHandlers_.get(envelope.actionName);

    if (!listener) {
      return;
    }

    let result: CommandResponseResult;

    if (listener.once_) {
      this.removeCommandHandler(envelope.actionName);
    }

    try {
      result = {
        response: await listener.handler_.apply(
          this,
          [this.createEvent_(e, envelope), ...(envelope as Envelope<unknown[]>).params],
        ),
      };
    }
    catch (err) {
      let message = 'eipce: Unknown error [azPRe972IL2S]';

      if (
        err instanceof Error
        || typeof err === 'object' && err !== null && typeof (err as { message: string }).message === 'string'
      ) {
        message = (err as { message: string }).message;
      }
      else if (typeof err === 'string') {
        message = err;
      }

      result = {
        error: { message },
      };
    }

    const responseEnvelope: Envelope<[CommandResponseResult]> = {
      messageId: envelope.messageId,
      actionName: envelope.actionName,
      params: [result],
    };

    this.respond_(e, responseEnvelope);
  };

  private handleResponseMessage_ = (e: IpcMainEvent | IpcRendererEvent, envelope: Envelope) => {
    if (!Ipc.isEnvelope_(envelope)) {
      throw new Error('Invalid response envelope [De7YLMHfrBPG]');
    }

    const promise = this.responsePromises_.get(envelope.messageId);

    if (!promise) {
      return;
    }

    // Validate that the sender of the reply in the main process is the webContents that message was
    // sent to.
    if (
      // The presence of processId indicates that this is IpcMain
      typeof (e as IpcMainEvent).processId === 'number'
      && (e as IpcMainEvent).sender.id !== promise?.senderId_
    ) {
      throw new Error(`eipce: IPC access violation by webContents id ${(e as IpcMainEvent).sender.id} Response sender does not match the expected sender.`);
    }

    if (typeof (envelope.params[0] as CommandResponseError).error !== 'undefined') {
      const errorData = (envelope.params[0] as CommandResponseError).error || { message: 'eipce: Unknown Error [i5a4Hz90FAMh]' };
      promise.p_.reject(new Error(errorData.message));
    }
    else {
      // Note that payload.response will be undefined if it's a void async function
      promise.p_.resolve((envelope.params[0] as CommandResponseOk).response);
    }

    this.responsePromises_.delete(envelope.messageId);
  };

  private registerCommandHandler_(
    command: string,
    handler: IpcCommandHandler<Event>,
    isOnce: boolean,
  ): unsubscribeFn {
    if (this.commandHandlers_.has(command)) {
      throw new Error(`eipce: Handler for ${command} already registered`);
    }

    if (Ipc.globalHandlers_.includes(command)) {
      throw new Error(`eipce: Handler for ${command} has been registered in another instance`);
    }

    Ipc.globalHandlers_.push(command);

    const id = `hdl_${generateId()}` as const;

    this.commandHandlers_.set(command, {
      handler_: handler,
      once_: isOnce,
      id_: id,
    });

    return () => {
      this.removeCommandHandler(command as string, id);
    };
  }

  /**
   * @param id Pasing the id means that the handler will only be removed if it matches. This is to
   * prevent an obsolete unsubscribe function from removing a handler it did not register.
   */
  private removeCommandHandler(command: string, id?: string): void {
    const handlerEntry = this.commandHandlers_.get(command);

    if (!handlerEntry || typeof id === 'string' && handlerEntry.id_ !== id) {
      return;
    }

    const index = Ipc.globalHandlers_.indexOf(command);

    if (index !== -1) {
      Ipc.globalHandlers_.splice(index, 1);
    }

    this.commandHandlers_.delete(command);
  }

  private static addListener<E>(
    listeners: Map<string, ListenerEntry<E>[]>,
    channel: string,
    listener: IpcEventListener<E>,
    isOnce: boolean,
  ): unsubscribeFn {
    const id = `lst_${generateId()}` as const;

    const entry = {
      listener_: listener,
      once_: isOnce,
      id_: id,
    };

    const entries = listeners.get(channel) || [];

    if (!listeners.has(channel)) {
      listeners.set(channel, entries);
    }

    entries.push(entry);

    return () => { Ipc.removeListenerById(listeners, channel, id); };
  }

  private static removeListener<E>(
    listeners: Map<string, ListenerEntry<E>[]>,
    channel: string,
    listener: IpcEventListener<E>,
  ): void {
    const channelListeners = listeners.get(channel) || [];

    for (const entry of channelListeners) {
      if (entry.listener_ === listener) {
        const index = channelListeners.indexOf(entry);

        if (index !== -1) {
          channelListeners.splice(index, 1);
        }
      }
    }
  }

  private static emitEvent<E, SA extends IpcActions, OA extends IpcActions>(
    instance: Ipc<E, SA, OA>,
    listeners: Map<string, ListenerEntry<E>[]>,
    channel: string,
    ...args: IpcEventParameters<E>) {
    const channelListeners = listeners.get(channel) || [];

    for (const entry of channelListeners) {
      entry.listener_.call(instance, ...args);

      if (entry.once_) {
        Ipc.removeListenerById(listeners, channel, entry.id_);
      }
    }
  }

  private static removeListenerById<E>(
    listeners: Map<string, ListenerEntry<E>[]>,
    channel: string,
    id: string,
  ): void {
    const entries = listeners.get(channel);

    if (!entries) {
      return;
    }

    const index = entries.findIndex((e) => e.id_ === id);

    if (index !== -1) {
      entries.splice(index, 1);
    }
  }

  /**
   * @internal Exposed for testing only.
   */
  public static wrap_<T extends unknown[]>(
    params: T,
    actionName: string,
    messageId?: MessageId,
  ): Envelope<T> {
    return {
      messageId: messageId || `eipce_${generateId()}`,
      actionName,
      params,
    };
  }

  private static isEnvelope_(subject: unknown): subject is Envelope<unknown[]> {
    return (
      typeof subject === 'object'
      && subject !== null
      && typeof (subject as Envelope<unknown[]>).messageId === 'string'
      && typeof (subject as Envelope<unknown[]>).actionName === 'string'
      && typeof (subject as Envelope<unknown[]>).params === 'object'
      && Array.isArray((subject as Envelope<unknown[]>).params)
      && (subject as Envelope<unknown[]>).messageId.startsWith('eipce_')
    );
  }
}
