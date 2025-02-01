# Class: MainIpc extends [Ipc](ipc.md)

Main process IPC.

## `new MainIpc(ipc, options)`

Initializes the instance.

* `ipc` [IpcMain](https://www.electronjs.org/docs/latest/api/ipc-main) - Electron IpcMain.
* `options` [Options](structures/options.md) (optional)

In TypeScript, the class optionally accepts 2 type arguments `MpActions` and `RenderersActions` that extend [IpcActions](../../src/ipc_actions.ts). See [the tutorial](../tutorial.md) for more information about typed IPC actions.

## Instance Methods

### `.send(target, eventName, ...args)`

Dispatches an event to the `target`.

* `target` [WebContents](https://www.electronjs.org/docs/latest/api/web-contents) | [FrameTarget](./structures/frame_target.md) - The target to send the event to.
* `eventName` string - event name
* `...args` Array - event arguments

### `.call(target, route, ...args)`

Calls a `route` in the `target`.

* `target` [WebContents](https://www.electronjs.org/docs/latest/api/web-contents) | [FrameTarget](./structures/frame_target.md) - The target to send the call to.
* `route` string - call route
* `...args` Array - call arguments

### `.invoke(target, command, ...args)`

Invokes a `command` in the `target`.

* `target` [WebContents](https://www.electronjs.org/docs/latest/api/web-contents) | [FrameTarget](./structures/frame_target.md) - The target to send the command to.
* `command` string - command name
* `...args` Array - command arguments

Returns `Promise` - resolves with the command result.

Throws when the command response timed out or an error has been thrown in the handler.
