import { ipcRenderer } from 'electron';
import { createRendererIpc, type RendererIpc } from 'electron-ipc-extended';

import type { MainIpcActions } from './main';

// The renderer has no actions in this example, actions from different modules can be assembled in
// the same way as in the main process.
export interface RendererIpcActions { }

export class RendererApp {
  public ipc: RendererIpc<RendererIpcActions, MainIpcActions>;

  public constructor() {
    this.ipc = createRendererIpc(ipcRenderer);
    this.ipc.call('moduleA/hello', 'world');

    void this.ipc.invoke('moduleB/countMe').then((callCount) => {
      console.log(`Call count: ${callCount}`);
    });
  }
}
