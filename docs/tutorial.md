# Electron IPC Extended Tutorial

## Initialization

Initialize the IPC wrappers by passing Electron's IPC module and generic type arguments for own type definitions and type definitions from the other side.

*main.ts*
```ts

import { ipcMain } from 'electron';
import { MainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions {
  events: {
    // ...
  }

  commands: {
    // ...
  }

  calls: {
    // ...
  }

  // Note that there's no need to define an empty object for an action type
  // if there are no actions of this type.
}

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);
```

*renderer.ts*
```ts
import { ipcRenderer } from 'electron';
import { RendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions {
  events: {
    // ...
  }

  commands: {
    // ...
  }

  calls: {
    // ...
  }
}
const ipc = new RendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);
```

## Actions

There are 3 IPC action types available:

- Events
- Commands
- Calls (unawaitable commands)

### Events

An event is a plain IPC message that is dispatched from one source to many targets. Events are defined by the module that emits them. Events are sent with the `send` method and listened to with the `on` method.

*main.ts*
```ts
import { BrowserWindow, ipcMain } from 'electron';
import { MainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions {
  events: {
    'window/resize': [width: number, height: number]
  }
}

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);
const win = new BrowserWindow();

win.on('resize', () => {
  const { width, height } = win.getBounds();
  ipc.send(win.webContents, 'window/resize', width, height);
});

```

*renderer.ts*
```ts
import { ipcRenderer } from 'electron';
import { RendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions { }

const ipc = new RendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);

ipc.on('window/resize', (e, width, height) => {
  console.log(`Window resized: ${width} x ${height}`);
});

```


### Commands

A command is handled in the target and can be invoked from multiple sources. Commands are defined by the module that handles them. Commands are invoked with the `invoke` method and handled with the `handle` method, `invoke` returns a Promise of the handler's return value.

*main.ts*
```ts
import { BrowserWindow, ipcMain } from 'electron';
import { MainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions {
  commands: {
    'window/isAlwaysOnTop': { params: [], returnVal: boolean }
  }
}

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);
const win = new BrowserWindow();

ipc.handle('window/isAlwaysOnTop', win.isAlwaysOnTop);

```

*renderer.ts*
```ts
import { ipcRenderer } from 'electron';
import { RendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions { }

const ipc = new RendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);

function isWindowAlwaysOnTop(): Promise<boolean> {
  return ipc.invoke('window/isAlwaysOnTop');
}

```

Unlike with plain Electron IPC, commands can be handled in a renderer.

### Calls

A call is a plain IPC message that is received in the target and can be called from many sources. Calls are defined by the module that receives them. Calls are called with the `call` method and received with the `receive` method.

From the runtime perspective, they are identical to events. Call handling functions are just aliases for event handling functions. However, from type and definitions perspective, calls are used in the same way as commands.

*main.ts*
```ts
import { BrowserWindow, ipcMain } from 'electron';
import { MainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions { }

const win = new BrowserWindow();

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);

ipc.call(win.webContents, 'menus/open', 'main-menu');

```

*renderer.ts*
```ts
import { ipcRenderer } from 'electron';
import { RendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions {
  calls: {
    'menus/open': [menuId: string],
  }
}

const ipc = new RendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);

ipc.receive('menus/open', (e, menuId) => {
  console.log(`Opening menu ${menuId}`);
});

```

## Defining actions in a modular way

Most apps consist of multiple modules and it would not be practical to define all action types in the root. By using type intersection it is possible to do a deep merge of IpcActions that are defined across multiple modules. In such setup it is recommended to prefix action names with the name of the module to ensure there are no conflicts.

*main/index.ts*
```ts
import { ipcMain } from 'electron';

import { type IpcActions as RendererIpcActions } from '../renderer';

import { type IpcActions as ModuleAIpcActions } from './modula_a';
import { type IpcActions as ModuleBIpcActions } from './modula_b';

// Type intersection allows to perform a deep merge of 2 types. events, calls and commands are all
// merged. Note that on the other hand, interface extends is shallow!
export type MainIpcActions = ModuleAIpcActions & ModuleBIpcActions;

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);
```

*main/module_a.ts*
```ts
// Action names are prefixed to avoid conflicts with the actions of other submodules
export interface IpcActions {
  events: {
    'moduleA/event1' [a: number]
  }
  calls: {
    'moduleA/call1': [a: string, b: number]
    'moduleA/call2': [a: unknown]
  }
  commands: {
    'moduleA/command1': { params: [a: string, b: number], returnVal: string }
    'moduleA/command2': { params: [a: unknown], returnVal: number }
  }
}
```

*main/module_b.ts*
```ts
export interface IpcActions {
  events: {
    'moduleB/event1' [a: string]
  }
  calls: {
    'moduleB/call1': [a: boolean]
    'moduleB/call2': [a: string, b: number]
  }
  commands: {
    'moduleB/command1': { params: [a: boolean], returnVal: string }
    'moduleB/command2': { params: [a: string, b: number], returnVal: number }
  }
}
```

## Initializing RendererIpc in nodeIntegration disabled renderer

See [createIpcRendererBridgePass()](./api/functions.md#createipcrendererbridgepassipc)
