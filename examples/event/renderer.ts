import { ipcRenderer } from 'electron';
import { RendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions { }

const ipc = new RendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);

ipc.on('window/resize', (e, width, height) => {
  console.log(`Window resized: ${width} x ${height}`);
});
