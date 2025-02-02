# Electron IPC Extended 
  
electron-ipc-extended adds type-safety and awaitable renderer commands to Electron IPC.

## Installation

```bash
npm install electron-ipc-extended --save
```

## Features

- Refactor fearlessly with type-safety added to IPC calls
- Invoke and await commands from the main process to the renderer
- Set up multiple instances that can be cleaned up independently
- New call action type that sits between an event and a command (an unawaitable command)

## Example

This simplified example demonstrates awaitable renderer commands and initialization of RendererIpc.

*main.ts*
```ts
import { BrowserWindow, ipcMain } from 'electron';
import { MainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions {
  //
}

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);

async function createAppWindow() {
  // 
  const win = new BrowserWindow();

  win.loadFile('index.html');

  let resolveReady;

  const promiseReady = new Promise((resolve, reject) => { resolveReady = resolve; });

  win.webContents.on('did-finish-load', () => {
    resolveReady();
  });


  await promiseReady;

  await ipc.invoke(win.webContents, 'init');
}

```

*renderer.ts*
```ts
import { ipcRenderer } from 'electron';
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

The example assumes renderer.ts is a preload script or a renderer with nodeIntegration enabled (not recommended, even for trusted renderers). See [the tutorial](../tutorial.md#passing-rendereripc-through-context-bridge) for information about initializing [RendererIpc](./docs/api/renderer_ipc.md) in the main context of a nodeIntegration disabled renderer.

## Documentation

- [Tutorial](./docs/tutorial.md)
- [API](./docs/api/README.md)

## Child Process

See [child-ipc](https://github.com/mckravchyk/child-ipc) - a sister library that adds a similar typed API with events, calls and commands that supports 2-way communication with a Node.js child process.
