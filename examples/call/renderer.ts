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
