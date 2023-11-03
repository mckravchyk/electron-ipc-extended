import { type IpcRenderer } from 'electron';
import { createRendererIpc } from 'src';

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
  it('sends an event with ipcRenderer.send', () => {
    rendererIpc.send(testChannel, testMessage);
    expect(ipcRenderer.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  it('makes a call with ipcRenderer.send', () => {
    rendererIpc.call(testChannel, testMessage);
    expect(ipcRenderer.send).toHaveBeenCalledWith(testChannel, testMessage);
  });

  it('invokes a command with ipcRenderer.invoke', () => {
    void rendererIpc.invoke(testChannel, testMessage);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(testChannel, testMessage);
  });

  it('listens to an event with ipcRenderer.on', () => {
    rendererIpc.on(testChannel, testListener);
    // Note that the listener is wrapped in another function so toHaveBennCalledWith cannot be used.
    expect(ipcRenderer.on).toHaveBeenCalled();
  });

  it('receives a call with ipcRenderer.on', () => {
    rendererIpc.receive(testChannel, testListener);
    expect(ipcRenderer.on).toHaveBeenCalled();
  });
});
