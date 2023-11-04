import { ipcRenderer } from 'electron';
import { createRendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions { }

const ipc = createRendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);

function isWindowAlwaysOnTop(): Promise<boolean> {
  return ipc.invoke('window/isAlwaysOnTop');
}
