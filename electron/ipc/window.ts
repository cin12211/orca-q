import {
  ipcMain,
  app,
  shell,
  session,
  dialog,
  type BrowserWindow,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getElectronLogPath } from '../logger';
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

  ipcMain.handle(
    'window:pick-save-file',
    async (_event, options?: SaveDialogOptions) => {
      const mainWindow = getMainWindow();
      const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, options || {})
        : await dialog.showSaveDialog(options || {});

      if (result.canceled) {
        return null;
      }

      return result.filePath || null;
    }
  );

  ipcMain.handle('window:pick-directory', async () => {
    const mainWindow = getMainWindow();
    const options: OpenDialogOptions = {
      title: 'Choose Backup Folder',
      properties: ['openDirectory', 'createDirectory'],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] || null;
  });

  ipcMain.handle(
    'window:write-file',
    async (_event, payload?: { filePath?: string; data?: Uint8Array }) => {
      if (!payload?.filePath) {
        throw new Error('A file path is required to save the downloaded file.');
      }

      if (!payload.data) {
        throw new Error('Downloaded file data is missing.');
      }

      await writeFile(payload.filePath, Buffer.from(payload.data));
      return payload.filePath;
    }
  );

  ipcMain.handle('window:open-path', async (_event, targetPath?: string) => {
    if (!targetPath) {
      throw new Error('A path is required to open a folder.');
    }

    return await shell.openPath(targetPath);
  });

  ipcMain.handle('window:get-storage-path', () => {
    return getStoragePath();
  });

  ipcMain.handle('window:open-storage-path', async () => {
    await shell.openPath(getStoragePath());
  });

  ipcMain.handle('window:get-log-path', () => {
    return getElectronLogPath();
  });

  ipcMain.handle('window:open-log-file', async () => {
    const logPath = getElectronLogPath();
    await shell.openPath(path.dirname(logPath));
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
