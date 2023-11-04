import { BrowserWindow, ipcMain } from 'electron';
import { createMainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions {
  commands: {
    'window/isAlwaysOnTop': { params: [], returnVal: boolean }
  }
}

const ipc = createMainIpc<MainIpcActions, RendererIpcActions>(ipcMain);
const win = new BrowserWindow();

ipc.handle('window/isAlwaysOnTop', win.isAlwaysOnTop);
