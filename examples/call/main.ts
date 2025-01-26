import { BrowserWindow, ipcMain } from 'electron';
import { MainIpc } from 'electron-ipc-extended';
import type { RendererIpcActions } from './renderer';

export interface MainIpcActions { }

const win = new BrowserWindow();

const ipc = new MainIpc<MainIpcActions, RendererIpcActions>(ipcMain);

ipc.call(win.webContents, 'menus/open', 'main-menu');
