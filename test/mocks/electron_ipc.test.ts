import type { IpcMainEvent, IpcRendererEvent } from 'electron';

import { IpcMainMock, IpcRendererMock, WebContentsMock } from './electron_ipc';

describe('Electron IPC mock', () => {
  test('Message sent from the main process is received in the renderer', () => {
    const ipcMain = new IpcMainMock();
    const ipcRenderer = new IpcRendererMock(ipcMain);
    const webContents = new WebContentsMock(ipcRenderer);
    ipcMain.setDependencies(ipcRenderer, webContents);

    let ipcRendererReceived = false;

    const ipcRendererCallback = (event: IpcRendererEvent, message: string) => {
      ipcRendererReceived = message === 'test-message';
    };

    ipcRenderer.on('test-channel', ipcRendererCallback);
    webContents.send('test-channel', 'test-message');

    expect(ipcRendererReceived).toBe(true);
    ipcRenderer.off('test-channel', ipcRendererCallback);
  });

  test('Message sent from the renderer is received in the main process and replied to', () => {
    const ipcMain = new IpcMainMock();
    const ipcRenderer = new IpcRendererMock(ipcMain);
    const webContents = new WebContentsMock(ipcRenderer);
    ipcMain.setDependencies(ipcRenderer, webContents);

    let messageReceived = false;
    let responseReceived = false;
    let senderId = 0;

    const ipcMainCallback = (event: IpcMainEvent, message: string) => {
      messageReceived = message === 'test-message';

      if (messageReceived) {
        senderId = event.sender.id;
        event.reply('reply-channel', 'reply-message');
      }
    };

    const ipcRendererReplyCallback = (event: IpcRendererEvent, message: string) => {
      responseReceived = message === 'reply-message';
    };

    ipcMain.on('test-channel', ipcMainCallback);
    ipcRenderer.on('reply-channel', ipcRendererReplyCallback);

    ipcRenderer.send('test-channel', 'test-message');

    expect(messageReceived).toBe(true);
    expect(senderId).toBe(webContents.id);
    expect(responseReceived).toBe(true);

    ipcMain.off('test-channel', ipcMainCallback);
    ipcRenderer.off('reply-channel', ipcRendererReplyCallback);
  });

  test('A listener in IpcMain is removed', () => {
    const ipcMain = new IpcMainMock();
    const ipcRenderer = new IpcRendererMock(ipcMain);
    const webContents = new WebContentsMock(ipcRenderer);
    ipcMain.setDependencies(ipcRenderer, webContents);
    const callback = jest.fn();

    ipcMain.on('test-channel', callback);
    ipcRenderer.send('test-channel', 'test-message');
    ipcMain.off('test-channel', callback);
    ipcRenderer.send('test-channel', 'test-message');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('A listener in IpcRenderer is removed', () => {
    const ipcMain = new IpcMainMock();
    const ipcRenderer = new IpcRendererMock(ipcMain);
    const webContents = new WebContentsMock(ipcRenderer);
    ipcMain.setDependencies(ipcRenderer, webContents);
    const callback = jest.fn();

    ipcRenderer.on('test-channel', callback);
    webContents.send('test-channel', 'test-message');
    ipcRenderer.off('test-channel', callback);
    webContents.send('test-channel', 'test-message');

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
