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

const updaterLogger = {
  debug(message: string) {
    console.debug(`[electron-updater] ${message}`);
  },
  info(message: string) {
    console.info(`[electron-updater] ${message}`);
  },
  warn(message: string) {
    console.warn(`[electron-updater] ${message}`);
  },
  error(message: string) {
    console.error(`[electron-updater] ${message}`);
  },
};

function formatLogDetails(details?: Record<string, unknown>): string {
  if (!details) {
    return '';
  }

  try {
    return ` ${JSON.stringify(details)}`;
  } catch {
    return '';
  }
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * T030 — Detect errors caused by a GitHub release tag existing
 * but the CI build not yet having uploaded the platform YAML metadata file
 * (e.g. latest-mac.yml, latest.yml, latest-linux.yml).
 *
 * In this case electron-updater emits an error with a message like:
 *   “Cannot find latest-mac.yml GitHub release asset …”
 *   or an HTTP 404 referencing a .yml URL.
 *
 * These must be silently suppressed — the user is never shown an error UI.
 */
function isPendingBuildError(err: Error): boolean {
  const msg = err.message;
  return msg.includes('.yml') && /404|not found|cannot find/i.test(msg);
}

function logUpdater(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  details?: Record<string, unknown>
): void {
  updaterLogger[level](`${message}${formatLogDetails(details)}`);
}

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

  logUpdater('debug', 'Sending updater event to renderer', { channel });
  webContents.send(channel, payload);
}

function forwardUpdaterError(message: string): void {
  // macOS may emit a late updater error after quitAndInstall() begins the
  // native ShipIt validation/install flow. We must surface that back to the UI
  // or the app appears to ignore the restart action entirely.
  isQuittingForInstall = false;
  logUpdater('error', 'Forwarding updater error to renderer', { message });
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
    logUpdater('debug', 'Updater already initialized, rebound renderer only');
    return;
  }

  updaterInitialized = true;

  autoUpdater.logger = updaterLogger;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  logUpdater('info', 'Initialized updater bridge', {
    autoDownload: autoUpdater.autoDownload,
    autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
    currentVersion: app.getVersion(),
  });

  autoUpdater.on('checking-for-update', () => {
    logUpdater('info', 'checking-for-update');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    logUpdater('info', 'update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
    cachedAvailableUpdate = toRendererUpdateInfo(info);
    cachedReadyUpdate = null;
    sendToRenderer('updater:update-available', cachedAvailableUpdate);
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    logUpdater('info', 'update-not-available', {
      version: info.version,
      currentVersion: app.getVersion(),
    });
    if (!cachedReadyUpdate) {
      cachedAvailableUpdate = null;
    }

    sendToRenderer('updater:up-to-date', {
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    logUpdater('debug', 'download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
    sendToRenderer('updater:progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    logUpdater('info', 'update-downloaded', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
    cachedReadyUpdate = toRendererUpdateInfo(info);
    cachedAvailableUpdate = cachedReadyUpdate;
    sendToRenderer('updater:ready', cachedReadyUpdate);
  });

  autoUpdater.on('error', (err: Error) => {
    // T032 — suppress pending-build errors: GitHub has a new tag but CI hasn't
    // finished uploading the .yml release assets. Do not forward to renderer.
    if (isPendingBuildError(err)) {
      logUpdater(
        'warn',
        'Suppressed pending-build updater error (yml not found)',
        serializeError(err)
      );
      return;
    }
    logUpdater('error', 'updater-error', serializeError(err));
    forwardUpdaterError(err.message);
  });
}

export async function checkForUpdates(): Promise<UpdaterCheckResult> {
  logUpdater('info', 'checkForUpdates() requested', {
    hasCachedReadyUpdate: !!cachedReadyUpdate,
  });

  if (cachedReadyUpdate) {
    logUpdater('info', 'checkForUpdates() returned cached ready update', {
      version: cachedReadyUpdate.version,
    });
    return {
      status: 'ready',
      updateInfo: cachedReadyUpdate,
    };
  }

  try {
    return await new Promise<UpdaterCheckResult>((resolve, reject) => {
      const onAvailable = (info: UpdateInfo) => {
        cleanup();
        logUpdater('info', 'checkForUpdates() resolved available', {
          version: info.version,
        });
        resolve({
          status: 'available',
          updateInfo: toRendererUpdateInfo(info),
        });
      };

      const onNotAvailable = () => {
        cleanup();
        logUpdater('info', 'checkForUpdates() resolved up-to-date', {
          currentVersion: app.getVersion(),
        });
        resolve({
          status: 'up-to-date',
          currentVersion: app.getVersion(),
        });
      };

      const onError = (error: Error) => {
        cleanup();
        // T031 — suppress pending-build errors: resolve as up-to-date instead of
        // rejecting. GitHub has a release tag but CI hasn't published the .yml assets.
        if (isPendingBuildError(error)) {
          logUpdater(
            'warn',
            'checkForUpdates() suppressed pending-build error (yml not found)',
            serializeError(error)
          );
          resolve({ status: 'up-to-date', currentVersion: app.getVersion() });
          return;
        }
        logUpdater(
          'error',
          'checkForUpdates() received error event',
          serializeError(error)
        );
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
        logUpdater(
          'error',
          'checkForUpdates() promise rejected',
          serializeError(error)
        );
        reject(error);
      });
    });
  } catch (error) {
    logUpdater('error', 'checkForUpdates() failed', serializeError(error));
    throw error;
  }
}

export async function downloadUpdate(): Promise<void> {
  logUpdater('info', 'downloadUpdate() requested', {
    version:
      cachedAvailableUpdate?.version ?? cachedReadyUpdate?.version ?? 'unknown',
  });

  try {
    const files = await autoUpdater.downloadUpdate();
    logUpdater('info', 'downloadUpdate() completed', {
      downloadedFiles: files,
    });
  } catch (error) {
    logUpdater('error', 'downloadUpdate() failed', serializeError(error));
    throw error;
  }
}

export function quitAndInstall(): void {
  isQuittingForInstall = true;
  logUpdater('info', 'quitAndInstall() requested', {
    version:
      cachedReadyUpdate?.version ?? cachedAvailableUpdate?.version ?? null,
  });

  setImmediate(() => {
    try {
      app.removeAllListeners('window-all-closed');
      logUpdater('info', 'Calling autoUpdater.quitAndInstall()');
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      forwardUpdaterError(message);
    }
  });
}
