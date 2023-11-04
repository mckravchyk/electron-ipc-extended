import { type App } from '.';

export interface IpcActions {
  calls: {
    'moduleA/hello': [what: string]
  }
}

export class ModuleA {
  public constructor(app: App) {
    app.ipc.receive('moduleA/hello', (e, what) => {
      console.log(`Hello ${what}`);
    });
  }
}
