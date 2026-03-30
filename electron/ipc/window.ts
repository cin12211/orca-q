import { ipcMain, app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { checkForUpdates, downloadUpdate, quitAndInstall } from '../updater';

export function registerWindowHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:get-storage-path', () => {
    return path.join(app.getPath('appData'), 'orcaq');
  });

  ipcMain.handle('window:open-storage-path', async () => {
    const storagePath = path.join(app.getPath('appData'), 'orcaq');
    await shell.openPath(storagePath);
  });
}

export function registerUpdaterHandlers(): void {
  ipcMain.handle('updater:check', () => checkForUpdates());
  ipcMain.handle('updater:download', () => downloadUpdate());
  ipcMain.handle('updater:install', () => quitAndInstall());
}
