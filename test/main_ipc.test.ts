import type {
  IpcMain,
  IpcMainEvent,
  IpcMainInvokeEvent,
  WebContents,
} from 'electron';

import { createMainIpc } from 'src';

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
  it('sends an event with WebContents.send', () => {
    const webContents = { send: jest.fn() } as unknown as WebContents;
    mainIpc.send(webContents, testChannel, testMessage);
    expect(webContents.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  it('makes a call with WebContents.send', () => {
    const webContents = { send: jest.fn() } as unknown as WebContents;
    mainIpc.call(webContents, testChannel, testMessage);
    expect(webContents.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  it('sends an event to a frame with WebContents.sendToFrame', () => {
    const webContents = { sendToFrame: jest.fn() } as unknown as WebContents;
    const frameProcessId = 1;
    const frameId = 2;
    const frame = [frameProcessId, frameId];
    mainIpc.send({ webContents, frameProcessId, frameId }, testChannel, testMessage);
    expect(webContents.sendToFrame).toHaveBeenCalledWith(frame, testChannel, testMessage);
  });

  it('listens to an event with IpcMain.on', () => {
    mainIpc.on(testChannel, testListener);
    expect(mocks.on).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('listens to an event once with IpcMain.once', () => {
    mainIpc.once(testChannel, testListener);
    expect(mocks.once).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('receives a call with ipcMain.on', () => {
    mainIpc.receive(testChannel, testListener);
    expect(mocks.on).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('receives a call once with ipcMain.once', () => {
    mainIpc.receiveOnce(testChannel, testListener);
    expect(mocks.once).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('handles a command with IpcMain.handle', () => {
    mainIpc.handle(testChannel, testListener);
    expect(mocks.handle).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('handles a command once with IpcMain.handleOnce', () => {
    mainIpc.handleOnce(testChannel, testListener);
    expect(mocks.handleOnce).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('removes an event listener with ipcMain.removeListener', () => {
    mainIpc.removeListener(testChannel, testListener);
    expect(mocks.removeListener).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('removes a call receiver with ipcMain.removeListener', () => {
    mainIpc.removeReceiver(testChannel, testListener);
    expect(mocks.removeListener).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('removes a command handler with ipcMain.removeHandler', () => {
    mainIpc.removeHandler(testChannel);
    expect(mocks.removeHandler).toHaveBeenCalledWith(ipcMain, testChannel);
  });
});
