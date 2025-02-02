## createIpcRendererBridgePass(ipc)

Creates a minimal IpcRenderer dependency that can be passed via [Context Bridge](https://www.electronjs.org/docs/latest/api/context-bridge) to *trusted* renderers.

* `ipc` [IpcRenderer](https://www.electronjs.org/docs/latest/api/ipc-renderer) - Electron's IpcRenderer

Returns [IpcRendererDep](./structures/ipc_renderer_dep.md)

**WARNING:** Do not use it to bypass [Electron's security measure to not pass the full ipcRenderer via Context Bridge](https://www.electronjs.org/docs/latest/api/context-bridge#exposing-ipcrenderer). This setup is meant only for local, trusted renderers.

This allows to initialize RendererIpc in the main context of the renderer process (exposing RendererIpc through context bridge will not work), even when nodeIntegration is disabled and contextIsolation is enabled. Initializing RendererIpc in the main context enables event listener cleanup which would not work via Context Bridge.
 
The caveat of such setup, however, is that the instance cannot be fully destroyed, as it cannot remove its own listeners to Electron IPC over the bridge. This is justified given that usually there is no need to destroy the IPC instance in a renderer process. Calling `RendererIpc.destroy()` on an instance initialized with the bridge pass will throw an error. The listeners can still be cleaned up with `.removeAllListeners()`, `.removeAllReceivers()` and `.removeAllHandlers()` - leaving the instance in its initial state.

See [the tutorial](../tutorial.md#passing-rendereripc-through-context-bridge) for usage example.