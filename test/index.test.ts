import type { IpcMain, IpcRenderer, WebContents } from 'electron';

import { createIpcRendererBridgePass } from 'src/renderer_ipc';

import {
  DEFAULT_RESPONSE_TIMEOUT,
  MainIpc,
  RendererIpc,
  type MainIpcEvent,
  type RendererIpcEvent,
} from '../src';

import { IpcMainMock, IpcRendererMock, WebContentsMock } from './mocks/electron_ipc';

/* eslint-disable func-names, @typescript-eslint/no-this-alias */

interface RendererActions {
  events: {
    'action': []
    'renderer/e': []
    'renderer/e1': [a: number, b: { test: number }]
    'renderer/e2': [a: number, b: { test: number }]
  }

  calls: {
    'action': []
    'renderer/cl': []
    'renderer/cl1': [a: number, b: { test: number }]
    'renderer/cl2': [a: number, b: { test: number }]
  }

  commands: {
    'action': { params: [], returnVal: Promise<void> }
    'renderer/cm': { params: [], returnVal: Promise<void> }
    // Note that the returnVal can either be a regular value or a Promise. This must match the
    // return value of the handler. If an async handler is used, the return must be Promise.
    'renderer/cm1': { params: [a: number, b: { test: number }], returnVal: number }
    'renderer/cm2': { params: [a: number, b: { test: number }], returnVal: Promise<number> }
  }
}

type MpActions = {
  events: {
    'action': []
    'mp/e': []
    'mp/e1': [a: number, b: { test: number }]
    'mp/e2': [a: number, b: { test: number }]
  }

  calls: {
    'action': []
    'mp/cl': []
    'mp/cl1': [a: number, b: { test: number }]
    'mp/cl2': [a: number, b: { test: number }]
  }

  commands: {
    'action': { params: [], returnVal: Promise<void> }
    'mp/cm': { params: [], returnVal: Promise<void> }
    // Note that the returnVal can either be a regular value or a Promise. This must match the
    // return value of the handler. If an async handler is used, the return must be Promise.
    'mp/cm1': { params: [a: number, b: { test: number }], returnVal: number }
    'mp/cm2': { params: [a: number, b: { test: number }], returnVal: Promise<number> }
  }
}

jest.useFakeTimers();

describe('electron-ipc-extended', () => {
  describe('Emitting and listening', () => {
    // Each basic test includes 2 events being emitted 2 times each and listened 2 times each, with
    // the latter being an exception for commands where only one command handler is allowed.

    test('The renderer emits an event (the main process listens)', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContents = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContents);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: MainIpc<MpActions, RendererActions> | null = null;
      let event: MainIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;
      let senderId = 0;

      mainIpc.on('renderer/e', function (e) {
        event = e;
        thisVal = this;
        senderId = e.sender.id;
      });

      mainIpc.on('renderer/e1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.on('renderer/e1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.on('renderer/e2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.on('renderer/e2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.send('renderer/e');
      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });
      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });

      expect(senderId).toBe(webContents.id);
      expect(thisVal).toBe(mainIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(44);
      expect(bVal).toBe(44);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('The renderer receives a call (the main process makes a call)', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      const webContents = webContentsMock as unknown as WebContents;
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: RendererIpc<RendererActions, MpActions> | null = null;
      let event: RendererIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;

      rendererIpc.receive('renderer/cl', function (e) {
        event = e;
        thisVal = this;
      });

      rendererIpc.receive('renderer/cl1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.receive('renderer/cl1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.receive('renderer/cl2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.receive('renderer/cl2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.call(webContents, 'renderer/cl');
      mainIpc.call(webContents, 'renderer/cl1', 1, { test: 1 });
      mainIpc.call(webContents, 'renderer/cl2', 10, { test: 10 });
      mainIpc.call(webContents, 'renderer/cl1', 1, { test: 1 });
      mainIpc.call(webContents, 'renderer/cl2', 10, { test: 10 });

      expect(thisVal).toBe(rendererIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(44);
      expect(bVal).toBe(44);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('The renderer handles a command (the main process invokes)', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      const webContents = webContentsMock as unknown as WebContents;
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: RendererIpc<RendererActions, MpActions> | null = null;
      let event: RendererIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;

      rendererIpc.handle('renderer/cm', async function (e) {
        event = e;
        thisVal = this;
      });

      rendererIpc.handle('renderer/cm1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 1;
      });

      rendererIpc.handle('renderer/cm2', async (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 10;
      });

      const rVals = await Promise.all([
        mainIpc.invoke(webContents, 'renderer/cm'),
        mainIpc.invoke(webContents, 'renderer/cm1', 1, { test: 1 }),
        mainIpc.invoke(webContents, 'renderer/cm2', 10, { test: 10 }),
        mainIpc.invoke(webContents, 'renderer/cm1', 1, { test: 1 }),
        mainIpc.invoke(webContents, 'renderer/cm2', 10, { test: 10 }),
      ]);

      expect(thisVal).toBe(rendererIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(22);
      expect(bVal).toBe(22);
      expect(rVals.sort()).toEqual([1, 1, 10, 10, undefined]);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('The main process emits an event (the renderer listens)', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      const webContents = webContentsMock as unknown as WebContents;
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: RendererIpc<RendererActions, MpActions> | null = null;
      let event: RendererIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;

      rendererIpc.on('mp/e', function (e) {
        event = e;
        thisVal = this;
      });

      rendererIpc.on('mp/e1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.on('mp/e1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.on('mp/e2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.on('mp/e2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.send(webContents, 'mp/e');
      mainIpc.send(webContents, 'mp/e1', 1, { test: 1 });
      mainIpc.send(webContents, 'mp/e2', 10, { test: 10 });
      mainIpc.send(webContents, 'mp/e1', 1, { test: 1 });
      mainIpc.send(webContents, 'mp/e2', 10, { test: 10 });

      expect(thisVal).toBe(rendererIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(44);
      expect(bVal).toBe(44);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('The main process receives a call (the renderer makes a call)', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: MainIpc<MpActions, RendererActions> | null = null;
      let event: MainIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;
      let senderId = 0;

      mainIpc.receive('mp/cl', function (e) {
        event = e;
        thisVal = this;
        senderId = e.sender.id;
      });

      mainIpc.receive('mp/cl1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.receive('mp/cl1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.receive('mp/cl2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.receive('mp/cl2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.call('mp/cl');
      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });
      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });

      expect(senderId).toBe(webContentsMock.id);
      expect(thisVal).toBe(mainIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(44);
      expect(bVal).toBe(44);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('The main process handles a command (the renderer invokes)', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: MainIpc<MpActions, RendererActions> | null = null;
      let event: MainIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;
      let senderId = 0;

      mainIpc.handle('mp/cm', async function (e) {
        event = e;
        thisVal = this;
        senderId = e.sender.id;
      });

      mainIpc.handle('mp/cm1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 1;
      });

      mainIpc.handle('mp/cm2', async (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 10;
      });

      const rVals = await Promise.all([
        rendererIpc.invoke('mp/cm'),
        rendererIpc.invoke('mp/cm1', 1, { test: 1 }),
        rendererIpc.invoke('mp/cm2', 10, { test: 10 }),
        rendererIpc.invoke('mp/cm1', 1, { test: 1 }),
        rendererIpc.invoke('mp/cm2', 10, { test: 10 }),
      ]);

      expect(senderId).toBe(webContentsMock.id);
      expect(thisVal).toBe(mainIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(22);
      expect(bVal).toBe(22);
      expect(rVals.sort()).toEqual([1, 1, 10, 10, undefined]);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('The renderer handles a command (ipcRenderer bridge pass)', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      const webContents = webContentsMock as unknown as WebContents;
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);
      // eslint-disable-next-line max-len
      const ipcRendererBridgePass = createIpcRendererBridgePass(ipcRenderer as unknown as IpcRenderer);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRendererBridgePass);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: RendererIpc<RendererActions, MpActions> | null = null;
      let event: RendererIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;

      rendererIpc.handle('renderer/cm', async function (e) {
        event = e;
        thisVal = this;
      });

      rendererIpc.handle('renderer/cm1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 1;
      });

      rendererIpc.handle('renderer/cm2', async (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 10;
      });

      const rVals = await Promise.all([
        mainIpc.invoke(webContents, 'renderer/cm'),
        mainIpc.invoke(webContents, 'renderer/cm1', 1, { test: 1 }),
        mainIpc.invoke(webContents, 'renderer/cm2', 10, { test: 10 }),
        mainIpc.invoke(webContents, 'renderer/cm1', 1, { test: 1 }),
        mainIpc.invoke(webContents, 'renderer/cm2', 10, { test: 10 }),
      ]);

      expect(thisVal).toBe(rendererIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(22);
      expect(bVal).toBe(22);
      expect(rVals.sort()).toEqual([1, 1, 10, 10, undefined]);

      // TODO: When implementing the general cleanup, just use try catch for every teardown.
      // Another test validates that an error is thrown.
      expect(() => rendererIpc.destroy()).toThrow();
      mainIpc.destroy();
    });

    test('The main process handles a command (ipcRenderer bridge pass)', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);
      // eslint-disable-next-line max-len
      const ipcRendererBridgePass = createIpcRendererBridgePass(ipcRenderer as unknown as IpcRenderer);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRendererBridgePass);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let thisVal: MainIpc<MpActions, RendererActions> | null = null;
      let event: MainIpcEvent | null = null;
      let aVal = 0;
      let bVal = 0;
      let senderId = 0;

      mainIpc.handle('mp/cm', async function (e) {
        event = e;
        thisVal = this;
        senderId = e.sender.id;
      });

      mainIpc.handle('mp/cm1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 1;
      });

      mainIpc.handle('mp/cm2', async (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 10;
      });

      const rVals = await Promise.all([
        rendererIpc.invoke('mp/cm'),
        rendererIpc.invoke('mp/cm1', 1, { test: 1 }),
        rendererIpc.invoke('mp/cm2', 10, { test: 10 }),
        rendererIpc.invoke('mp/cm1', 1, { test: 1 }),
        rendererIpc.invoke('mp/cm2', 10, { test: 10 }),
      ]);

      expect(senderId).toBe(webContentsMock.id);
      expect(thisVal).toBe(mainIpc);
      expect(event).not.toBe(null);
      expect(typeof event!.messageId).toBe('string');
      expect(event!.messageId.startsWith('eipce_')).toBe(true);

      expect(aVal).toBe(22);
      expect(bVal).toBe(22);
      expect(rVals.sort()).toEqual([1, 1, 10, 10, undefined]);

      expect(() => rendererIpc.destroy()).toThrow();
      mainIpc.destroy();
    });

    test('Event listeners are executed in the order they were added', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 1;
      mainIpc.on('renderer/e', () => { n += 2; });
      mainIpc.on('renderer/e', () => { n *= 3; });

      rendererIpc.send('renderer/e');
      expect(n).toBe(9);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('Call receivers are executed in the order they were added', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 1;
      mainIpc.receive('mp/cl', () => { n += 2; });
      mainIpc.receive('mp/cl', () => { n *= 3; });

      rendererIpc.call('mp/cl');
      expect(n).toBe(9);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('An event is listened to once', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let aVal = 0;
      let bVal = 0;

      mainIpc.once('renderer/e1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.on('renderer/e2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });
      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });

      expect(aVal).toBe(21);
      expect(bVal).toBe(21);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('A call is received once', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let aVal = 0;
      let bVal = 0;

      mainIpc.receiveOnce('mp/cl1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      mainIpc.receive('mp/cl2', (e, a, b) => {
        aVal += a;
        bVal += b.test;
      });

      rendererIpc.call('mp/cl');
      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });
      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });

      expect(aVal).toBe(21);
      expect(bVal).toBe(21);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('A command is handled once', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let aVal = 0;
      let bVal = 0;

      mainIpc.handleOnce('mp/cm1', (e, a, b) => {
        aVal += a;
        bVal += b.test;
        return 1;
      });

      await rendererIpc.invoke('mp/cm1', 1, { test: 1 });

      try {
        const p = rendererIpc.invoke('mp/cm1', 1, { test: 1 });
        jest.advanceTimersByTime(DEFAULT_RESPONSE_TIMEOUT);
        await p;
      }
      catch (err) {
        //
      }

      expect(aVal).toBe(1);
      expect(bVal).toBe(1);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('Action names do not conflict across event types', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 0;

      mainIpc.on('action', async () => {
        n += 1;
      });

      mainIpc.receive('action', async () => {
        n += 10;
      });

      mainIpc.handle('action', async () => {
        n += 100;
      });

      rendererIpc.send('action');
      rendererIpc.call('action');
      await rendererIpc.invoke('action');

      expect(n).toBe(111);

      rendererIpc.destroy();
      mainIpc.destroy();
    });
  });

  describe('Errors', () => {
    test('An error is thrown when adding a second handler for a command', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      const unsub = mainIpc.handle('mp/cm', async () => { });
      let errorThrown = false;

      try {
        mainIpc.handle('mp/cm', async () => { });
      }
      catch (err) {
        errorThrown = true;
      }

      // Also expecting that if one handler is removed another one can be done.
      unsub();
      mainIpc.handle('mp/cm', async () => { });

      expect(errorThrown).toBe(true);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('An error is thrown if the handler has been already registered in another instance', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);
      const mainIpc2 = new MainIpc<MpActions, RendererActions>(ipcMain);

      const unsub = mainIpc.handle('mp/cm', async () => { });
      let errorThrown = false;

      try {
        mainIpc2.handle('mp/cm', async () => { });
      }
      catch (err) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);

      // Ensure that the handler can be registered when its removed from the first instance.
      unsub();
      mainIpc2.handle('mp/cm', async () => { });

      // Ensure that .destroy() removes the handler from the global registry.
      mainIpc2.destroy();
      mainIpc.handle('mp/cm', async () => { });

      mainIpc.destroy();
      rendererIpc.destroy();
    });

    test('An error thrown in the command handler results in a rejection of the invoke promise', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let i = -1;

      mainIpc.handle('mp/cm1', () => {
        i += 1;

        if (i === 0) {
          throw new Error('Test');
        }

        return 1;
      });

      let error: Error | null = null;
      let errorCount = 0;

      try {
        await rendererIpc.invoke('mp/cm1', 1, { test: 1 });
      }
      catch (err) {
        error = err as Error;
        errorCount += 1;
      }

      // Also testing that the previous error does not have an impact on the next invoke
      try {
        // Not expecting this error
        await rendererIpc.invoke('mp/cm1', 1, { test: 1 });
      }
      catch (err) {
        errorCount += 1;
      }

      expect(errorCount).toBe(1);
      expect(error instanceof Error).toBe(true);
      expect(error?.message).toBe('Test');

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('Invoking a command times out if not handled', async () => {
      const responseTimeout = 1500;

      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      const rendererIpc = new RendererIpc<RendererActions, MpActions>(
        ipcRenderer as unknown as IpcRenderer,
        { responseTimeout },
      );
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let error: Error | null = null;

      rendererIpc.invoke('mp/cm1', 1, { test: 1 }).catch((err) => {
        error = err;
      });

      await jest.advanceTimersByTimeAsync(responseTimeout - 5);
      expect(error).toBe(null);
      await jest.advanceTimersByTimeAsync(5);
      // TS is being too smart for its own good with the assertion-derived type checking.
      expect(error).not.toBe(null);
      expect((error as unknown as Error) instanceof Error).toBe(true);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('An error is thrown when RendererIpc created with bridge pass is destroyed', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);
      // eslint-disable-next-line max-len
      const ipcRendererBridgePass = createIpcRendererBridgePass(ipcRenderer as unknown as IpcRenderer);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRendererBridgePass);

      expect(() => rendererIpc.destroy()).toThrow();
    });
  });

  describe('Cleanup', () => {
    test('An event listener is removed', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let aVal = 0;
      let bVal = 0;

      const c1 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      const c2 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      mainIpc.on('renderer/e1', c1);
      mainIpc.on('renderer/e2', c2);

      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });
      mainIpc.removeListener('renderer/e1', c1);

      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });

      expect(aVal).toBe(21);
      expect(bVal).toBe(21);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('An event listener is removed via an unsubscribe function', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let aVal = 0;
      let bVal = 0;

      const c1 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      const c2 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      const unsub = mainIpc.on('renderer/e1', c1);
      mainIpc.on('renderer/e2', c2);

      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });
      unsub();

      rendererIpc.send('renderer/e1', 1, { test: 1 });
      rendererIpc.send('renderer/e2', 10, { test: 10 });

      expect(aVal).toBe(21);
      expect(bVal).toBe(21);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('A call receiver is removed', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let aVal = 0;
      let bVal = 0;

      const c1 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      const c2 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      mainIpc.receive('mp/cl1', c1);
      mainIpc.receive('mp/cl2', c2);

      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });
      mainIpc.removeReceiver('mp/cl1', c1);

      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });

      expect(aVal).toBe(21);
      expect(bVal).toBe(21);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('A call receiver is removed via an unsubscribe function', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let aVal = 0;
      let bVal = 0;

      const c1 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      const c2 = (e: MainIpcEvent, a: number, b: { test: number }) => {
        aVal += a;
        bVal += b.test;
      };

      const unsub = mainIpc.receive('mp/cl1', c1);
      mainIpc.receive('mp/cl2', c2);

      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });
      unsub();

      rendererIpc.call('mp/cl1', 1, { test: 1 });
      rendererIpc.call('mp/cl2', 10, { test: 10 });

      expect(aVal).toBe(21);
      expect(bVal).toBe(21);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('A command handler is removed', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let total = 0;

      mainIpc.handle('mp/cm1', (e, a) => a);

      total += await rendererIpc.invoke('mp/cm1', 1, { test: 1 });

      mainIpc.removeHandler('mp/cm1');

      try {
        const p = rendererIpc.invoke('mp/cm1', 1, { test: 1 });
        jest.advanceTimersByTime(DEFAULT_RESPONSE_TIMEOUT);
        total += await p;
      }
      catch (err) {
        //
      }

      expect(total).toBe(1);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('A command handler is removed via an unsubscribe function', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let total = 0;

      const unsub = mainIpc.handle('mp/cm1', (e, a) => a);

      total += await rendererIpc.invoke('mp/cm1', 1, { test: 1 });

      unsub();

      try {
        const p = rendererIpc.invoke('mp/cm1', 1, { test: 1 });
        jest.advanceTimersByTime(DEFAULT_RESPONSE_TIMEOUT);
        total += await p;
      }
      catch (err) {
        //
      }

      expect(total).toBe(1);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('Obsolete command unsubscribe function does not remove the command', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let total = 0;

      const unsub = mainIpc.handle('mp/cm1', (e, a) => a);

      total += await rendererIpc.invoke('mp/cm1', 1, { test: 1 });

      mainIpc.removeHandler('mp/cm1');

      mainIpc.handle('mp/cm1', (e, a) => a);

      unsub();

      total += await rendererIpc.invoke('mp/cm1', 1, { test: 1 });

      expect(total).toBe(2);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('All channel event listeners are removed', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 0;

      mainIpc.on('renderer/e1', () => { n += 1; });
      mainIpc.on('renderer/e1', () => { n += 10; });
      mainIpc.on('renderer/e2', () => { n += 100; });

      rendererIpc.send('renderer/e1', 0, { test: 0 });
      rendererIpc.send('renderer/e2', 0, { test: 0 });

      mainIpc.removeAllListeners('renderer/e1');

      rendererIpc.send('renderer/e1', 0, { test: 0 });
      rendererIpc.send('renderer/e2', 0, { test: 0 });

      expect(n).toBe(211);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('All event listeners are removed', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 0;

      mainIpc.on('renderer/e1', () => { n += 1; });
      mainIpc.on('renderer/e1', () => { n += 10; });
      mainIpc.on('renderer/e2', () => { n += 100; });

      rendererIpc.send('renderer/e1', 0, { test: 0 });
      rendererIpc.send('renderer/e2', 0, { test: 0 });

      mainIpc.removeAllListeners();

      rendererIpc.send('renderer/e1', 0, { test: 0 });
      rendererIpc.send('renderer/e2', 0, { test: 0 });

      expect(n).toBe(111);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('All route call receivers are removed', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 0;

      mainIpc.receive('mp/cl1', () => { n += 1; });
      mainIpc.receive('mp/cl1', () => { n += 10; });
      mainIpc.receive('mp/cl2', () => { n += 100; });

      rendererIpc.call('mp/cl1', 0, { test: 0 });
      rendererIpc.call('mp/cl2', 0, { test: 0 });

      mainIpc.removeAllReceivers('mp/cl1');

      rendererIpc.call('mp/cl1', 0, { test: 0 });
      rendererIpc.call('mp/cl2', 0, { test: 0 });

      expect(n).toBe(211);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('All call receivers are removed', () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 0;

      mainIpc.receive('mp/cl1', () => { n += 1; });
      mainIpc.receive('mp/cl1', () => { n += 10; });
      mainIpc.receive('mp/cl2', () => { n += 100; });

      rendererIpc.call('mp/cl1', 0, { test: 0 });
      rendererIpc.call('mp/cl2', 0, { test: 0 });

      mainIpc.removeAllReceivers();

      rendererIpc.call('mp/cl1', 0, { test: 0 });
      rendererIpc.call('mp/cl2', 0, { test: 0 });

      expect(n).toBe(111);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('All command handlers are removed', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let total = 0;

      mainIpc.handle('mp/cm1', (e, a) => a);
      mainIpc.handle('mp/cm2', async (e, a) => a);

      total += await rendererIpc.invoke('mp/cm1', 1, { test: 1 });
      total += await rendererIpc.invoke('mp/cm1', 10, { test: 1 });

      mainIpc.removeAllHandlers();

      try {
        const p = rendererIpc.invoke('mp/cm1', 1, { test: 1 });
        jest.advanceTimersByTime(DEFAULT_RESPONSE_TIMEOUT);
        total += await p;
      }
      catch (err) {
        //
      }

      try {
        const p = rendererIpc.invoke('mp/cm2', 10, { test: 1 });
        jest.advanceTimersByTime(DEFAULT_RESPONSE_TIMEOUT);
        total += await p;
      }
      catch (err) {
        //
      }

      expect(total).toBe(11);

      rendererIpc.destroy();
      mainIpc.destroy();
    });

    test('The instance is destroyed', async () => {
      const ipcMain = new IpcMainMock() as unknown as IpcMain;
      const ipcRenderer = new IpcRendererMock(ipcMain as unknown as IpcMainMock);
      const webContentsMock = new WebContentsMock(ipcRenderer as unknown as IpcRendererMock);
      (ipcMain as unknown as IpcMainMock).setDependencies(ipcRenderer, webContentsMock);

      // eslint-disable-next-line max-len
      const rendererIpc = new RendererIpc<RendererActions, MpActions>(ipcRenderer as unknown as IpcRenderer);
      const mainIpc = new MainIpc<MpActions, RendererActions>(ipcMain);

      let n = 0;

      mainIpc.on('action', async () => {
        n += 1;
      });

      mainIpc.receive('action', async () => {
        n += 10;
      });

      mainIpc.handle('action', async () => {
        n += 100;
      });

      rendererIpc.send('action');
      rendererIpc.call('action');
      await rendererIpc.invoke('action');

      // Destroying the peer and expecting that the event listeners no longer work even if they are
      // added again
      mainIpc.destroy();

      let errorCount = 0;

      try {
        mainIpc.on('action', async () => { n += 1; });
      }
      catch (err) {
        errorCount += 1;
      }

      try {
        mainIpc.receive('action', async () => { n += 10; });
      }
      catch (err) {
        errorCount += 1;
      }

      try {
        mainIpc.handle('action', async () => { n += 100; });
      }
      catch (err) {
        errorCount += 1;
      }

      rendererIpc.send('action');
      rendererIpc.call('action');

      expect(n).toBe(111);

      // Destroying the self and expecting that emitting methods throw because the instance has
      // been destroyed.
      rendererIpc.destroy();

      try {
        rendererIpc.send('action');
      }
      catch (err) {
        errorCount += 1;
      }

      try {
        rendererIpc.call('action');
      }
      catch (err) {
        errorCount += 1;
      }

      try {
        await rendererIpc.invoke('action');
      }
      catch (err) {
        errorCount += 1;
      }

      expect(errorCount).toBe(6);

      // Ensure that calling destroy() again does not result in an error.
      rendererIpc.destroy();
      mainIpc.destroy();
    });
  });
});
