import { ipcRenderer } from 'electron';
import { RendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions { }

const ipc = new RendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);

function isWindowAlwaysOnTop(): Promise<boolean> {
  return ipc.invoke('window/isAlwaysOnTop');
}
