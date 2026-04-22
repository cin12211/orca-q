import {
  ipcMain,
  app,
  shell,
  session,
  dialog,
  type BrowserWindow,
  type OpenDialogOptions,
} from 'electron';
import path from 'node:path';
import { clearPersistedUserData } from '../persist/store';
import { checkForUpdates, downloadUpdate, quitAndInstall } from '../updater';

function getStoragePath(): string {
  return path.join(app.getPath('appData'), 'orcaq');
}

export function registerWindowHandlers(
  getMainWindow: () => BrowserWindow | null,
  onDataMutation?: () => void
): void {
  ipcMain.handle('window:minimize', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return;
    }

    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return;
    }

    mainWindow.close();
  });

  ipcMain.handle('window:pick-sqlite-file', async () => {
    const mainWindow = getMainWindow();
    const options: OpenDialogOptions = {
      title: 'Select SQLite Database File',
      properties: ['openFile'],
      filters: [
        {
          name: 'SQLite Databases',
          extensions: ['sqlite', 'sqlite3', 'db', 'db3'],
        },
        {
          name: 'All Files',
          extensions: ['*'],
        },
      ],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] || null;
  });

  ipcMain.handle('window:get-storage-path', () => {
    return getStoragePath();
  });

  ipcMain.handle('window:open-storage-path', async () => {
    await shell.openPath(getStoragePath());
  });

  ipcMain.handle('window:reset-all-data', async () => {
    await clearPersistedUserData();
    await session.defaultSession.clearStorageData();
    onDataMutation?.();
  });

  ipcMain.handle('window:reveal-app-in-finder', () => {
    shell.showItemInFolder(app.getPath('exe'));
  });

  ipcMain.handle('window:open-applications-folder', async () => {
    const defaultApplicationsPath =
      process.platform === 'darwin'
        ? '/Applications'
        : path.dirname(app.getPath('exe'));

    await shell.openPath(defaultApplicationsPath);
  });

  ipcMain.handle('window:quit-app', () => {
    app.quit();
  });
}

export function registerUpdaterHandlers(): void {
  ipcMain.handle('updater:check', () => checkForUpdates());
  ipcMain.handle('updater:download', () => downloadUpdate());
  ipcMain.handle('updater:install', () => quitAndInstall());
}
