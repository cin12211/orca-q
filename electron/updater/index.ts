import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateInfo, ProgressInfo } from 'electron-updater';

let mainWindowWebContents: Electron.WebContents | null = null;

/**
 * Initialize the auto-updater and wire it to the renderer via events.
 */
export function initUpdater(webContents: Electron.WebContents): void {
  mainWindowWebContents = webContents;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    mainWindowWebContents?.send('updater:update-available', info);
  });

  autoUpdater.on('update-not-available', () => {
    mainWindowWebContents?.send('updater:up-to-date');
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindowWebContents?.send('updater:progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    mainWindowWebContents?.send('updater:ready', info);
  });

  autoUpdater.on('error', (err: Error) => {
    mainWindowWebContents?.send('updater:error', err.message);
  });
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo ?? null;
  } catch {
    return null;
  }
}

export async function downloadUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate();
}

export function quitAndInstall(): void {
  setImmediate(() => {
    app.removeAllListeners('window-all-closed');
    autoUpdater.quitAndInstall(false, true);
  });
}
