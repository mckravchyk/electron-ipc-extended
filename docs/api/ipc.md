# Class: Ipc (abstract)

Abstract class that makes the base of [MainIpc](./main_ipc.md) and [RendererIpc](./renderer_ipc.md).

## Instance Methods

### `.destroy()`

Destroys the instance.

### `.addListener(eventName, listener)`

Listens for an event.

* `eventName` string - event name
* `listener` function - event listener
  * `this` Ipc
  * `event` [MainIpcEvent](./structures/main_ipc_event.md) | [RendererIpcEvent](./structures/renderer_ipc_event.md)
  * `...args` Array - event arguments

Returns `Function` - a function to remove the listener.

### `.on(eventName, listener)`

Alias for `.addListener()`.

### `.once(eventName, listener)`

Listens for an event, once.

* `eventName` string - event name
* `listener` function - event listener
  * `this` Ipc
  * `event` [MainIpcEvent](./structures/main_ipc_event.md) | [RendererIpcEvent](./structures/renderer_ipc_event.md)
  * `...args` Array - event arguments

Returns `Function` - a function to remove the listener.

### `.receive(route, receiver)`

Receives a call.

* `route` string - call route
* `receiver` function - call receiver
  * `this` Ipc
  * `event` [MainIpcEvent](./structures/main_ipc_event.md) | [RendererIpcEvent](./structures/renderer_ipc_event.md)
  * `...args` Array - call arguments

Returns `Function` - a function to remove the receiver.

### `.receiveOnce(route, receiver)`

Receives a call, once.

* `route` string - call route
* `receiver` function - call receiver
  * `this` Ipc
  * `event` [MainIpcEvent](./structures/main_ipc_event.md) | [RendererIpcEvent](./structures/renderer_ipc_event.md)
  * `...args` Array - call arguments

Returns `Function` - a function to remove the receiver.

### `.handle(command, handler)`

Handles a command.

* `command` string - command name
* `handler` function - command handler. Its return value (which can be absent, a regular value or a Promise) will be resolved as the result of `invoke`.
  * `this` Ipc
  * `event` [MainIpcEvent](./structures/main_ipc_event.md) | [RendererIpcEvent](./structures/renderer_ipc_event.md)
  * `...args` Array - command arguments

Returns `Function` - a function to remove the handler.

Throws if a handler has already been registered for the command (also when it was registered by another instance).

### `.handleOnce(command, handler)`

Handles a command,  once.

* `command` string - command name
* `handler` function - command handler. Its return value (which can be absent, a regular value or a Promise) will be resolved as the result of `invoke`.
  * `this` Ipc
  * `event` [MainIpcEvent](./structures/main_ipc_event.md) | [RendererIpcEvent](./structures/renderer_ipc_event.md)
  * `...args` Array - command arguments

Returns `Function` - a function to remove the handler.

Throws if a handler has already been registered for the command (also when it was registered by another instance).

### `.removeListener(eventName, listener)`

Removes an event listener.

* `eventName` string - event name
* `listener` function - event listener

### `.off(eventName, listener)`

Alias for `.removeListener()`.

### `.removeReceiver(route, receiver)`

Removes a call receiver.

* `route` string - call route
* `receiver` function - call receiver

### `.removeHandler(command)`

Removes a command handler.

* `command` string - command name

### `.removeAllListeners(eventName?)`

Removes all event listeners for `eventName` or all if not specified.

* `eventName` string (optional) - event name

### `.removeAllReceivers(route?)`

Removes all call receivers for `route` or all if not specified.

* `route` string (optional) - call route

### `.removeAllHandlers()`

Removes all command handlers.

## Static Properties

### `Ipc.EVENTS_CHANNEL`

Native Electron IPC channel used to send events.

### `Ipc.CALLS_CHANNEL`

Native Electron IPC channel used to send calls.

### `Ipc.COMMANDS_CHANNEL`

Native Electron IPC channel used for invoking commands.

### `Ipc.RESPONSES_CHANNEL`

Native Electron IPC channel used for receiving command responses.