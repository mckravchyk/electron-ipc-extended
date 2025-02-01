# Class: RendererIpc extends [Ipc](ipc.md)

Renderer process IPC.

## `new RendererIpc(ipc, options)`

Initializes the instance.

* `ipc` [IpcRendererDep](./structures/ipc_renderer_dep.md) | [IpcRenderer](https://www.electronjs.org/docs/latest/api/ipc-renderer) - IpcRenderer dependency
* `options` [Options](structures/options.md) (optional)

In TypeScript, the class optionally accepts 2 type arguments `RendererActions` and `MpActions` that extend [IpcActions](../../src/ipc_actions.ts). See [the tutorial](../tutorial.md) for more information about typed IPC actions.

## Instance Methods

### `.send(eventName, ...args)`

Dispatches an event to the main process.

* `eventName` string - event name
* `...args` Array - event arguments

### `.call(route, ...args)`

Calls a `route` in the main process.

* `route` string - call route
* `...args` Array - call arguments

### `.invoke(command, ...args)`

Invokes a command in the main process.

* `command` string - command name
* `...args` Array - command arguments

Returns `Promise` - resolves with the command result.

Throws when the command response timed out or an error has been thrown in the handler.
