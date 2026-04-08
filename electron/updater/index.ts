import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateInfo, ProgressInfo } from 'electron-updater';

let mainWindowWebContents: Electron.WebContents | null = null;
let detachWebContentsDestroyedListener: (() => void) | null = null;
let updaterInitialized = false;
let isQuittingForInstall = false;

interface RendererUpdateInfo {
  version: string;
  currentVersion: string;
  releaseDate?: string;
  releaseNotes?: string;
}

type UpdaterCheckResult =
  | {
      status: 'available';
      updateInfo: RendererUpdateInfo;
    }
  | {
      status: 'ready';
      updateInfo: RendererUpdateInfo;
    }
  | {
      status: 'up-to-date';
      currentVersion: string;
    };

let cachedAvailableUpdate: RendererUpdateInfo | null = null;
let cachedReadyUpdate: RendererUpdateInfo | null = null;

function normalizeReleaseNotes(
  releaseNotes: UpdateInfo['releaseNotes']
): string | undefined {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map(note => {
        if (typeof note === 'string') {
          return note;
        }

        const noteVersion = note.version ? `Version ${note.version}` : null;
        const noteBody = note.note?.trim() || null;
        return [noteVersion, noteBody].filter(Boolean).join('\n');
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return undefined;
}

function toRendererUpdateInfo(info: UpdateInfo): RendererUpdateInfo {
  return {
    version: info.version,
    currentVersion: app.getVersion(),
    releaseDate: info.releaseDate,
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  };
}

function sendToRenderer(
  channel: string,
  payload: unknown,
  options?: { allowDuringInstall?: boolean }
): void {
  if (isQuittingForInstall && !options?.allowDuringInstall) {
    return;
  }

  const webContents = mainWindowWebContents;
  if (!webContents) {
    return;
  }

  if (webContents.isDestroyed()) {
    mainWindowWebContents = null;
    return;
  }

  webContents.send(channel, payload);
}

function forwardUpdaterError(message: string): void {
  // macOS may emit a late updater error after quitAndInstall() begins the
  // native ShipIt validation/install flow. We must surface that back to the UI
  // or the app appears to ignore the restart action entirely.
  isQuittingForInstall = false;
  sendToRenderer('updater:error', message, { allowDuringInstall: true });
}

function bindWebContents(webContents: Electron.WebContents): void {
  detachWebContentsDestroyedListener?.();
  mainWindowWebContents = webContents;
  isQuittingForInstall = false;

  const clearReference = () => {
    if (mainWindowWebContents === webContents) {
      mainWindowWebContents = null;
    }

    if (detachWebContentsDestroyedListener) {
      detachWebContentsDestroyedListener = null;
    }
  };

  webContents.once('destroyed', clearReference);
  detachWebContentsDestroyedListener = () => {
    webContents.removeListener('destroyed', clearReference);
    if (mainWindowWebContents === webContents) {
      mainWindowWebContents = null;
    }
    detachWebContentsDestroyedListener = null;
  };
}

/**
 * Initialize the auto-updater and wire it to the renderer via events.
 */
export function initUpdater(webContents: Electron.WebContents): void {
  bindWebContents(webContents);

  if (updaterInitialized) {
    return;
  }

  updaterInitialized = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    cachedAvailableUpdate = toRendererUpdateInfo(info);
    cachedReadyUpdate = null;
    sendToRenderer('updater:update-available', cachedAvailableUpdate);
  });

  autoUpdater.on('update-not-available', () => {
    if (!cachedReadyUpdate) {
      cachedAvailableUpdate = null;
    }

    sendToRenderer('updater:up-to-date', {
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendToRenderer('updater:progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    cachedReadyUpdate = toRendererUpdateInfo(info);
    cachedAvailableUpdate = cachedReadyUpdate;
    sendToRenderer('updater:ready', cachedReadyUpdate);
  });

  autoUpdater.on('error', (err: Error) => {
    forwardUpdaterError(err.message);
  });
}

export async function checkForUpdates(): Promise<UpdaterCheckResult> {
  if (cachedReadyUpdate) {
    return {
      status: 'ready',
      updateInfo: cachedReadyUpdate,
    };
  }

  try {
    return await new Promise<UpdaterCheckResult>((resolve, reject) => {
      const onAvailable = (info: UpdateInfo) => {
        cleanup();
        resolve({
          status: 'available',
          updateInfo: toRendererUpdateInfo(info),
        });
      };

      const onNotAvailable = () => {
        cleanup();
        resolve({
          status: 'up-to-date',
          currentVersion: app.getVersion(),
        });
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        autoUpdater.removeListener('update-available', onAvailable);
        autoUpdater.removeListener('update-not-available', onNotAvailable);
        autoUpdater.removeListener('error', onError);
      };

      autoUpdater.once('update-available', onAvailable);
      autoUpdater.once('update-not-available', onNotAvailable);
      autoUpdater.once('error', onError);

      void autoUpdater.checkForUpdates().catch(error => {
        cleanup();
        reject(error);
      });
    });
  } catch (error) {
    throw error;
  }
}

export async function downloadUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate();
}

export function quitAndInstall(): void {
  isQuittingForInstall = true;

  setImmediate(() => {
    try {
      app.removeAllListeners('window-all-closed');
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      forwardUpdaterError(message);
    }
  });
}
