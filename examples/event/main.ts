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
