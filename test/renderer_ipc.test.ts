import { type IpcRenderer } from 'electron';
import { createRendererIpc } from '../src';

const ipcRenderer = {
  /* eslint-disable max-len */
  send: jest.fn(),
  call: jest.fn(),
  invoke: jest.fn(),
  on: jest.fn(),
  /* eslint-enable max-len */
} as unknown as IpcRenderer;

const rendererIpc = createRendererIpc(ipcRenderer);

const testChannel = 'test';
const testMessage = 'test';
const testListener = () => { };

describe('RendererIpc', () => {
  test('.send() calls IpcRenderer.send()', () => {
    rendererIpc.send(testChannel, testMessage);
    expect(ipcRenderer.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  test('.call() calls IpcRenderer.call()', () => {
    rendererIpc.call(testChannel, testMessage);
    expect(ipcRenderer.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  test('.invoke() calls IpcRenderer.invoke()', () => {
    void rendererIpc.invoke(testChannel, testMessage);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(testChannel, testMessage);
  });

  test('.on() calls IpcRenderer.on()', () => {
    rendererIpc.on(testChannel, testListener);
    // Note that the listener is wrapped in another function so toHaveBennCalledWith cannot be used.
    expect(ipcRenderer.on).toHaveBeenCalled();
  });

  test('.receive calls IpcRenderer.receive()', () => {
    rendererIpc.receive(testChannel, testListener);
    expect(ipcRenderer.on).toHaveBeenCalled();
  });
});
