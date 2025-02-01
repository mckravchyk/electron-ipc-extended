# Electron IPC Extended 
  
electron-ipc-extended adds type-safety and awaitable renderer commands to Electron IPC.

## Installation

```bash
npm install electron-ipc-extended --save
```

## Example

This examples demonstrates awaitable renderer commands and initialization of RendererIpc in a *trusted* renderer that has nodeIntegration disabled (if the renderer is not trusted, RendererIpc should not leave the preload script!).

*main.ts*
```ts
import { BrowserWindow, ipcMain } from 'electron';
import { MainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions {
  //
}

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);

async function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      preload: 'renderer_preload.js',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  let resolveReady;

  const promiseReady = new Promise((resolve, reject) => { resolveReady = resolve; });

  win.webContents.on('did-finish-load', () => {
    resolveReady();
  });


  await promiseReady;

  await ipc.invoke(win.webContents, 'init');
}

```

*renderer_preload.ts*
```ts
import { ipcRenderer, contextBridge } from 'electron';

import { createIpcRendererBridgePass } from 'electron-ipc-extended';

contextBridge.exposeInMainWorld('ipcRenderer', createIpcRendererBridgePass(ipcRenderer));
```

*renderer.ts*
```ts
import { RendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions {
  commands: {
    'init': { params: [], returnVal: void }
  }
}

const ipc = new RendererIpc<RendererIpcActions, MainIpcActions>(window.ipcRenderer);

ipc.handle('init', async () => {
  // Initialize the app
});

```

## Documentation

- [Tutorial](./docs/tutorial.md)
- [API](./docs/api/README.md)

## Child IPC

See [child-ipc](https://github.com/mckravchyk/child-ipc) - a sister library that adds a similar typed API with events, calls and commands that supports 2-way communication with a Node.js child process.
