import { ipcMain } from 'electron';

import { createMainIpc, type MainIpc } from 'electron-ipc-extended';

import type { RendererIpcActions } from '../renderer';

import { ModuleA, type IpcActions as ModuleAIpcActions } from './module_a';
import { ModuleB, type IpcActions as ModuleBIpcActions } from './module_b';

export type MainIpcActions = ModuleAIpcActions & ModuleBIpcActions;

export class App {
  public ipc: MainIpc<MainIpcActions, RendererIpcActions>;

  public moduleA: ModuleA;

  public moduleB: ModuleB;

  public constructor() {
    this.ipc = createMainIpc(ipcMain);
    this.moduleA = new ModuleA(this);
    this.moduleB = new ModuleB(this);
  }
}
