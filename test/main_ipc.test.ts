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

const registeredHandlers: string[] = [];

const mocks = {
  on: jest.fn(),
  once: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle: jest.fn((context, channel, listener) => {
    if (registeredHandlers.includes(channel)) {
      throw new Error(`Attempted to register a second handler for '${channel}'`);
    }
    registeredHandlers.push(channel);
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleOnce: jest.fn((context, channel, listener) => {
    if (registeredHandlers.includes(channel)) {
      throw new Error(`Attempted to register a second handler for '${channel}'`);
    }
    registeredHandlers.push(channel);
  }),
  removeListener: jest.fn(),
  removeHandler: jest.fn((context, channel) => {
    const index = registeredHandlers.indexOf(channel);
    if (index !== -1) {
      registeredHandlers.splice(index, 1);
    }
  }),
  removeAllListeners: jest.fn(),
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
  removeAllListeners(channel?: string) { mocks.removeAllListeners(this, channel); },
  /* eslint-enable max-len */
} as unknown as IpcMain;

const mainIpc = createMainIpc(ipcMain);

const testChannel = 'test';
const testMessage = 'testMessage';
const testListener = () => { };

describe('MainIpc', () => {
  afterEach(() => {
    mainIpc.removeAllListenersReceivers();
    mainIpc.removeAllHandlers();
    jest.clearAllMocks();
  });

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
    mainIpc.on(testChannel, testListener);
    mainIpc.removeListener(testChannel, testListener);
    expect(mocks.removeListener).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('removes a call receiver with ipcMain.removeListener', () => {
    mainIpc.receive(testChannel, testListener);
    mainIpc.removeReceiver(testChannel, testListener);
    expect(mocks.removeListener).toHaveBeenCalledWith(ipcMain, testChannel, testListener);
  });

  it('removes a command handler with ipcMain.removeHandler', () => {
    mainIpc.handle(testChannel, testListener);
    mainIpc.removeHandler(testChannel);
    expect(mocks.removeHandler).toHaveBeenCalledWith(ipcMain, testChannel);
  });

  it('removes all listeners / receivers matching channel name with ipcMain.removeAllListeners', () => {
    mainIpc.removeAllListenersReceivers(testChannel);
    expect(mocks.removeAllListeners).toHaveBeenCalledWith(ipcMain, testChannel);
  });

  it('removes all listeners / receivers with ipcMain.removeAllListeners', () => {
    mainIpc.removeAllListenersReceivers();
    expect(mocks.removeAllListeners).toHaveBeenCalledWith(ipcMain, undefined);
  });

  it('removes all command handlers registered through the instance', () => {
    mainIpc.removeAllHandlers();
    expect(mocks.removeHandler).toHaveBeenCalledTimes(0);

    const commandNames = ['command1', 'command2', 'command3', 'command4'];

    commandNames.forEach((command) => {
      mainIpc.handle(command, testListener);
    });

    // Test that the handler registry properly handles the case with duplicate handlers while
    // allowing ipcMain to throw (it does not prevent ipcMain.handle call which throws neither does
    // it add the handler to the registry).
    expect(() => mainIpc.handle('command1', testListener)).toThrow();

    mainIpc.removeHandler('command1');
    mainIpc.removeAllHandlers();

    expect(mocks.removeHandler).toHaveBeenCalledTimes(commandNames.length);

    commandNames.forEach((command) => {
      expect(mocks.removeHandler).toHaveBeenCalledWith(ipcMain, command);
    });
  });
});
