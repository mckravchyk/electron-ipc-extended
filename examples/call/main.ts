import { BrowserWindow, ipcMain } from 'electron';
import { createMainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions { }

const win = new BrowserWindow();

const ipc = createMainIpc<MainIpcActions, RendererIpcActions>(ipcMain);

ipc.call(win.webContents, 'menus/open', 'main-menu');
