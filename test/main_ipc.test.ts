import type {
  IpcMain,
  IpcMainEvent,
  IpcMainInvokeEvent,
  WebContents,
} from 'electron';

import { createMainIpc } from '../src';

/* eslint-disable @typescript-eslint/no-explicit-any */
type OnListener = (event: IpcMainEvent, ...args: any[]) => void;
type HandleListener = (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<any>) | (any);
/* eslint-enable @typescript-eslint/no-explicit-any */

const mocks = {
  on: jest.fn(),
  once: jest.fn(),
  handle: jest.fn(),
  handleOnce: jest.fn(),
  removeListener: jest.fn(),
  removeHandler: jest.fn(),
};

const ipcMain = {
  /* eslint-disable max-len */
  // Mocks are wrapped in order to test that the correct this context is bound
  on(channel: string, listener: OnListener) { mocks.on(this, channel, listener); },
  once(channel: string, listener: OnListener) { mocks.once(this, channel, listener); },
  handle(channel: string, listener: HandleListener) { mocks.handle(this, channel, listener); },
  handleOnce(channel: string, listener: HandleListener) { mocks.handleOnce(this, channel, listener); },
  removeListener(channel: string, listener: OnListener) { mocks.removeListener(this, channel, listener); },
  removeHandler(channel: string) { mocks.removeHandler(this, channel); },
  /* eslint-enable max-len */
} as unknown as IpcMain;

const mainIpc = createMainIpc(ipcMain);

const testChannel = 'test';
const testMessage = 'testMessage';
const testListener = () => { };

describe('MainIpc', () => {
  test('.send() calls WebContents.send()', () => {
    const webContents = { send: jest.fn() } as unknown as WebContents;
    mainIpc.send(webContents, testChannel, testMessage);
    expect(webContents.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  test('.call() calls WebContents.send()', () => {
    const webContents = { send: jest.fn() } as unknown as WebContents;
    mainIpc.call(webContents, testChannel, testMessage);
    expect(webContents.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  test('.on() calls IpcMain.on()', () => {
    mainIpc.on(testChannel, testListener);
    expect(mocks.on).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.once() calls IpcMain.once()', () => {
    mainIpc.once(testChannel, testListener);
    expect(mocks.once).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.receive() calls IpcMain.on()', () => {
    mainIpc.receive(testChannel, testListener);
    expect(mocks.on).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.receiveOnce() calls IpcMain.once()', () => {
    mainIpc.receiveOnce(testChannel, testListener);
    expect(mocks.once).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.handle() calls IpcMain.handle()', () => {
    mainIpc.handle(testChannel, testListener);
    expect(mocks.handle).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.handleOnce() calls IpcMain.handleOnce()', () => {
    mainIpc.handleOnce(testChannel, testListener);
    expect(mocks.handleOnce).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.removeListener() calls IpcMain.removeListener()', () => {
    mainIpc.removeListener(testChannel, testListener);
    expect(mocks.removeListener).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.removeReceiver() calls IpcMain.removeListener()', () => {
    mainIpc.removeReceiver(testChannel, testListener);
    expect(mocks.removeListener).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  test('.removeHandler() calls IpcMain.removeHandler()', () => {
    mainIpc.removeHandler(testChannel);
    expect(mocks.removeHandler).toHaveBeenCalledWith(ipcMain, testChannel);
  });
});
