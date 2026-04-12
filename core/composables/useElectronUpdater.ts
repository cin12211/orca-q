/**
 * Electron updater composable.
 * Uses window.electronAPI.updater (contextBridge IPC).
 */
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import {
  persistGetOne,
  persistUpsert,
} from '~/core/persist/adapters/electron/primitives';

interface UpdateInfo {
  version: string;
  currentVersion: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface UpToDateInfo {
  currentVersion: string;
}

type UpdaterCheckResult =
  | {
      status: 'available';
      updateInfo: UpdateInfo;
    }
  | {
      status: 'ready';
      updateInfo: UpdateInfo;
    }
  | {
      status: 'up-to-date';
      currentVersion: string;
    };

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

interface ResolvedUpdateInfo {
  version: string;
  date?: string;
  body?: string;
  currentVersion: string;
}

const updaterAPI = () => {
  const api = (window as Window & { electronAPI?: { updater: unknown } })
    .electronAPI?.updater as
    | {
        check: () => Promise<UpdaterCheckResult | null>;
        download: () => Promise<void>;
        install: () => Promise<void>;
        onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void;
        onUpToDate: (cb: (info: UpToDateInfo) => void) => () => void;
        onProgress: (cb: (progress: DownloadProgress) => void) => () => void;
        onReady: (cb: (info: UpdateInfo) => void) => () => void;
        onError: (cb: (msg: string) => void) => () => void;
      }
    | undefined;
  return api;
};

const isChecking = ref(false);
const isDownloading = ref(false);
const downloadProgress = ref(0);
const updateInfo = ref<UpdateInfo | null>(null);
// T004 — skip-version + stall detection state
const skippedVersion = ref<string | null>(null);
const isDownloadStalled = ref(false);
let _stallTimer: ReturnType<typeof setTimeout> | null = null;

const isSupported = ref(false);
const status = ref<
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'ready-to-restart'
  | 'restarting'
  | 'error'
>('idle');
const availableUpdate = ref<ResolvedUpdateInfo | null>(null);
const readyToRestartUpdate = ref<ResolvedUpdateInfo | null>(null);
const lastCheckedAt = ref<number | null>(null);
const lastError = ref<string | null>(null);
const downloadTotalBytes = ref<number | null>(null);
const downloadedBytes = ref<number | null>(null);
const startupPromptOpen = ref(false);
let listenersInitialized = false;

const isBusy = computed(
  () => isChecking.value || isDownloading.value || status.value === 'restarting'
);

// T005 — clear stall timer and reset stall state
function clearStallTimer(): void {
  if (_stallTimer !== null) {
    clearTimeout(_stallTimer);
    _stallTimer = null;
  }
}

function resetStall(): void {
  clearStallTimer();
  isDownloadStalled.value = false;
}

function toResolvedUpdateInfo(info: UpdateInfo): ResolvedUpdateInfo {
  return {
    version: info.version,
    date: info.releaseDate,
    body: info.releaseNotes,
    currentVersion: info.currentVersion,
  };
}

function setAvailableUpdate(info: UpdateInfo): void {
  const resolved = toResolvedUpdateInfo(info);
  updateInfo.value = info;
  availableUpdate.value = resolved;
  readyToRestartUpdate.value = null;
  status.value = 'available';
}

function setReadyUpdate(info: UpdateInfo): void {
  const resolved = toResolvedUpdateInfo(info);
  updateInfo.value = info;
  availableUpdate.value = resolved;
  readyToRestartUpdate.value = resolved;
  isDownloading.value = false;
  status.value = 'ready-to-restart';
  // T022 — clear stall timer when download completes naturally
  resetStall();
}

function initializeUpdaterListeners(): void {
  if (listenersInitialized) {
    isSupported.value = !!updaterAPI();
    return;
  }

  const api = updaterAPI();
  isSupported.value = !!api;

  if (!api) {
    return;
  }

  listenersInitialized = true;

  api.onUpdateAvailable(info => {
    lastError.value = null;
    setAvailableUpdate(info);
  });

  api.onUpToDate(info => {
    lastError.value = null;
    updateInfo.value = null;
    availableUpdate.value = null;

    if (!readyToRestartUpdate.value) {
      status.value = 'up-to-date';
    }

    if (!readyToRestartUpdate.value) {
      downloadTotalBytes.value = null;
      downloadedBytes.value = null;
      downloadProgress.value = 0;
    }

    if (!readyToRestartUpdate.value && !availableUpdate.value) {
      startupPromptOpen.value = false;
    }

    if (readyToRestartUpdate.value) {
      readyToRestartUpdate.value.currentVersion = info.currentVersion;
      availableUpdate.value = readyToRestartUpdate.value;
    }
  });

  // T005 — stall detection: restart 30s timer on each progress event
  api.onProgress(progress => {
    isDownloading.value = true;
    status.value = 'downloading';
    downloadProgress.value = Math.round(progress.percent);
    downloadTotalBytes.value = progress.total;
    downloadedBytes.value = progress.transferred;
    lastError.value = null;

    // Reset stall on any progress
    clearStallTimer();
    isDownloadStalled.value = false;
    _stallTimer = setTimeout(() => {
      if (status.value === 'downloading') {
        isDownloadStalled.value = true;
      }
    }, 30_000);
  });

  api.onReady(info => {
    setReadyUpdate(info);
    // T035 — do NOT close dialog; if open, it auto-transitions to restart-ready variant via readyToRestartUpdate
    // T021 — persistent toast removed; status bar indicator + startup dialog now own restart-ready UX
  });

  api.onError(msg => {
    isDownloading.value = false;
    status.value = 'error';
    lastError.value = msg;
    console.error('[electron-updater] Download error:', msg);
    // T022 — clear stall timer on error
    resetStall();
    toast.error('Update failed', { description: msg });
  });
}

export function useElectronUpdater() {
  initializeUpdaterListeners();

  const checkForUpdates = async (options?: { promptIfAvailable?: boolean }) => {
    const api = updaterAPI();
    if (!api) return null;

    try {
      initializeUpdaterListeners();
      isChecking.value = true;
      status.value = 'checking';
      lastError.value = null;

      const result = await api.check();
      lastCheckedAt.value = Date.now();

      if (!result) {
        return null;
      }

      if (result.status === 'available') {
        setAvailableUpdate(result.updateInfo);

        if (options?.promptIfAvailable) {
          // T010–T011 — skip-version check (T029: uses persistGetOne from primitives layer)
          // Suppress dialog if the available version exactly matches the persisted skip.
          // (FR-003: any other version string falls through and shows the dialog.)
          try {
            const record = await persistGetOne<{ version: string }>(
              'appConfig',
              'updater-skipped-version'
            );
            skippedVersion.value = record?.version ?? null;
          } catch {
            skippedVersion.value = null;
          }

          if (result.updateInfo.version !== skippedVersion.value) {
            startupPromptOpen.value = true;
          }
        }

        return result.updateInfo;
      }

      if (result.status === 'ready') {
        setReadyUpdate(result.updateInfo);

        if (options?.promptIfAvailable) {
          startupPromptOpen.value = true;
        }

        return result.updateInfo;
      }

      status.value = 'up-to-date';
      updateInfo.value = null;
      availableUpdate.value = null;
      startupPromptOpen.value = false;
      return null;
    } catch (e: any) {
      status.value = 'error';
      lastError.value = e?.message || String(e);
      return null;
    } finally {
      isChecking.value = false;
    }
  };

  const startDownload = async (): Promise<void> => {
    const api = updaterAPI();
    if (!api) return;

    initializeUpdaterListeners();
    isDownloading.value = true;
    status.value = 'downloading';
    downloadProgress.value = 0;
    downloadTotalBytes.value = null;
    downloadedBytes.value = 0;

    try {
      await api.download();
    } catch (err: any) {
      isDownloading.value = false;
      status.value = 'error';
      lastError.value = err?.message || String(err);
    }
  };

  const installUpdate = async (): Promise<void> => {
    // T034 — dialog stays open so user sees in-dialog progress (reverts T023)
    // electron-updater download happens first, then it is ready-to-restart
    if (status.value === 'available' || status.value === 'error') {
      await startDownload();
    }
  };

  const restartToApplyUpdate = async (): Promise<void> => {
    const api = updaterAPI();
    if (!api) return;

    status.value = 'restarting';
    await api.install();
  };

  const dismissStartupPrompt = () => {
    startupPromptOpen.value = false;
  };

  // T006 — skip this version: persist + close prompt (T028: uses persistUpsert from primitives layer)
  const skipVersion = async (version: string): Promise<void> => {
    startupPromptOpen.value = false;
    try {
      await persistUpsert<{ version: string }>(
        'appConfig',
        'updater-skipped-version',
        { version }
      );
      skippedVersion.value = version;
    } catch {
      // Silently treat as Later on persist failure (A2 resolution)
    }
  };

  // T007 — cancel UI-level download
  const cancelDownload = (): void => {
    // T022 — clear stall timer on cancel
    clearStallTimer();
    isDownloadStalled.value = false;
    isDownloading.value = false;
    status.value = 'available';
    downloadProgress.value = 0;
  };

  // T008 — retry a stalled download
  const retryDownload = async (): Promise<void> => {
    // T022 — clear stall timer on retry
    clearStallTimer();
    isDownloadStalled.value = false;
    await startDownload();
  };

  return {
    isSupported,
    status,
    availableUpdate,
    readyToRestartUpdate,
    isBusy,
    lastCheckedAt,
    lastError,
    downloadTotalBytes,
    downloadedBytes,
    downloadProgress,
    isDownloadStalled,
    checkForUpdates,
    startDownload,
    installUpdate,
    restartToApplyUpdate,
    startupPromptOpen,
    dismissStartupPrompt,
    // T009 — new API exposed
    skipVersion,
    cancelDownload,
    retryDownload,
  };
}

// ─── Startup helpers (called from app.vue onMounted) ─────────────────────────

let _backgroundInterval: ReturnType<typeof setInterval> | null = null;
let _startupCheckTimeout: ReturnType<typeof setTimeout> | null = null;
let _startupFocusHandlerRegistered = false;

export async function checkForElectronUpdatesOnStartup(): Promise<void> {
  const api = updaterAPI();
  if (!api || import.meta.dev) return;

  try {
    const { checkForUpdates } = useElectronUpdater();
    await checkForUpdates({ promptIfAvailable: true });
  } catch {
    // Fail silently — update check is non-critical
  }
}

export function scheduleElectronStartupUpdateCheck(delayMs = 5_000): void {
  if (!updaterAPI() || import.meta.dev) return;

  if (_startupCheckTimeout) {
    clearTimeout(_startupCheckTimeout);
  }

  _startupCheckTimeout = setTimeout(() => {
    _startupCheckTimeout = null;
    void checkForElectronUpdatesOnStartup();
  }, delayMs);

  if (_startupFocusHandlerRegistered) {
    return;
  }

  _startupFocusHandlerRegistered = true;

  window.addEventListener(
    'focus',
    () => {
      if (lastCheckedAt.value) {
        return;
      }

      if (_startupCheckTimeout) {
        clearTimeout(_startupCheckTimeout);
        _startupCheckTimeout = null;
      }

      void checkForElectronUpdatesOnStartup();
    },
    { once: true }
  );
}

export function startElectronBackgroundUpdateChecks(
  intervalMs = 6 * 60 * 60 * 1_000 // 6 hours
): void {
  if (!updaterAPI() || import.meta.dev) return;
  if (_backgroundInterval) return; // Already running

  _backgroundInterval = setInterval(() => {
    const { checkForUpdates } = useElectronUpdater();
    void checkForUpdates();
  }, intervalMs);
}
