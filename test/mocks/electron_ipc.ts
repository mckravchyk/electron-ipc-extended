/* eslint-disable max-classes-per-file, @typescript-eslint/no-explicit-any, no-plusplus */
import type { IpcMainEvent, IpcRendererEvent } from 'electron';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, max-len
type IpcEventParameters<Event extends IpcMainEvent | IpcRendererEvent> = [event: Event, ...args: any[]];

type IpcEventListener<
  Event extends IpcMainEvent | IpcRendererEvent
> = (...args: IpcEventParameters<Event>) => void

export class IpcMainMock {
  private callbacks: Map<string, IpcEventListener<IpcMainEvent>[]> = new Map();

  private ipcRenderer: IpcRendererMock | null = null;

  private webContents: WebContentsMock | null = null;

  public setDependencies(ipcRenderer: IpcRendererMock, webContents: WebContentsMock) {
    this.ipcRenderer = ipcRenderer;
    this.webContents = webContents;
  }

  public on(event: string, cb: IpcEventListener<IpcMainEvent>) {
    const listeners = this.callbacks.get(event) || [];

    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, listeners);
    }

    listeners.push(cb);
  }

  public off(event: string, cb: IpcEventListener<IpcMainEvent>) {
    let i = 0;

    const listeners = this.callbacks.get(event) || [];

    while (i < listeners.length) {
      if (cb === listeners[i]) {
        listeners.splice(i, 1);
      }
      else {
        i += 1;
      }
    }
  }

  public emit(channel: string, ...args: any[]) {
    if (!this.webContents) {
      throw new Error('IpcMainMock: WebContents not set');
    }

    if (!this.ipcRenderer) {
      throw new Error('IpcMainMock: ipcRenderer not set');
    }

    const listeners = this.callbacks.get(channel) || [];

    for (const listener of listeners) {
      listener({
        reply: (ch: string, ...params: any[]) => {
          this.ipcRenderer!.emit(ch, ...params);
        },
        sender: this.webContents,
        processId: 1,
      } as unknown as IpcMainEvent, ...args);
    }
  }
}

export class IpcRendererMock {
  private callbacks: Map<string, IpcEventListener<IpcRendererEvent>[]> = new Map();

  private ipcMain: IpcMainMock;

  public constructor(ipcMain: IpcMainMock) {
    this.ipcMain = ipcMain;
  }

  public send(channel: string, ...args: any[]) {
    this.ipcMain.emit(channel, ...args);
  }

  // This is required to test if bridge pass has been used.
  // eslint-disable-next-line class-methods-use-this
  public sendSync() {
    throw new Error('noop');
  }

  public on(channel: string, cb: IpcEventListener<IpcRendererEvent>) {
    const listeners = this.callbacks.get(channel) || [];

    if (!this.callbacks.has(channel)) {
      this.callbacks.set(channel, listeners);
    }

    listeners.push(cb);
  }

  public off(channel: string, cb: IpcEventListener<IpcRendererEvent>) {
    let i = 0;

    const listeners = this.callbacks.get(channel) || [];

    while (i < listeners.length) {
      if (cb === listeners[i]) {
        listeners.splice(i, 1);
      }
      else {
        i += 1;
      }
    }
  }

  public emit(channel: string, ...args: any[]) {
    const listeners = this.callbacks.get(channel) || [];

    for (const listener of listeners) {
      listener({ } as unknown as IpcRendererEvent, ...args);
    }
  }
}

export class WebContentsMock {
  private ipcRenderer!: IpcRendererMock;

  private static idCounter = 0;

  public id = WebContentsMock.idCounter++;

  private onSend: ((paylaod: unknown) => void) | null = null;

  public constructor(ipcRenderer: IpcRendererMock, onSend?: (payload: unknown) => void) {
    this.ipcRenderer = ipcRenderer;

    if (onSend) {
      this.onSend = onSend;
    }
  }

  public send(channel: string, ...args: any[]) {
    this.ipcRenderer.emit(channel, ...args);

    if (this.onSend) {
      this.onSend(args);
    }
  }

  public sendToFrame(frameId: number, channel: string, ...args: any[]) {
    this.send(channel, ...args);
  }
}
