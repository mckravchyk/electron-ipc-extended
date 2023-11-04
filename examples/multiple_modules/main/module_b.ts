import { type App } from '.';

export interface IpcActions {
  commands: {
    'moduleB/countMe': { params: [], returnVal: Promise<number> }
  }
}

export class ModuleB {
  private callCount = 0;

  public constructor(app: App) {
    app.ipc.handle('moduleB/countMe', async (e) => {
      this.callCount += 1;
      return this.callCount;
    });
  }
}
