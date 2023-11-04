import { ipcRenderer } from 'electron';
import { createRendererIpc } from 'electron-ipc-extended';
import type { MainIpcActions } from './main';

export interface RendererIpcActions {
  calls: {
    'menus/open': [menuId: string],
  }
}

const ipc = createRendererIpc<RendererIpcActions, MainIpcActions>(ipcRenderer);

ipc.receive('menus/open', (e, menuId) => {
  console.log(`Opening menu ${menuId}`);
});
