/**
 * Electron updater composable.
 * Uses window.electronAPI.updater (contextBridge IPC).
 */
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';

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

const isBusy = computed(() => isChecking.value || isDownloading.value);

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

  api.onProgress(progress => {
    isDownloading.value = true;
    status.value = 'downloading';
    downloadProgress.value = Math.round(progress.percent);
    downloadTotalBytes.value = progress.total;
    downloadedBytes.value = progress.transferred;
    lastError.value = null;
  });

  api.onReady(info => {
    setReadyUpdate(info);
    startupPromptOpen.value = false;

    toast.success(`orcaq ${info.version} is ready to install`, {
      description: 'Restart the app to apply the update.',
      duration: Infinity,
      action: {
        label: 'Restart now',
        onClick: () => api.install(),
      },
    });
  });

  api.onError(msg => {
    isDownloading.value = false;
    status.value = 'error';
    lastError.value = msg;
    console.error('[electron-updater] Download error:', msg);
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
          startupPromptOpen.value = true;
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
    // electron-updater download happens first, then it is ready-to-restart
    if (status.value === 'available' || status.value === 'error') {
      await startDownload();
    }
  };

  const restartToApplyUpdate = async (): Promise<void> => {
    status.value = 'restarting';
    await updaterAPI()?.install();
  };

  const dismissStartupPrompt = () => {
    startupPromptOpen.value = false;
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
    checkForUpdates,
    startDownload,
    installUpdate,
    restartToApplyUpdate,
    startupPromptOpen,
    dismissStartupPrompt,
  };
}

// ─── Startup helpers (called from app.vue onMounted) ─────────────────────────

let _backgroundInterval: ReturnType<typeof setInterval> | null = null;

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
