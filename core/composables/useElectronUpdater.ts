/**
 * Electron updater composable.
 * Uses window.electronAPI.updater (contextBridge IPC).
 */
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

const updaterAPI = () => {
  const api = (window as Window & { electronAPI?: { updater: unknown } })
    .electronAPI?.updater as
    | {
        check: () => Promise<UpdateInfo | null>;
        download: () => Promise<void>;
        install: () => Promise<void>;
        onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void;
        onUpToDate: (cb: () => void) => () => void;
        onProgress: (cb: (progress: DownloadProgress) => void) => () => void;
        onReady: (cb: (info: UpdateInfo) => void) => () => void;
        onError: (cb: (msg: string) => void) => () => void;
      }
    | undefined;
  return api;
};

export function useElectronUpdater() {
  const isChecking = ref(false);
  const isDownloading = ref(false);
  const downloadProgress = ref(0);
  const updateInfo = ref<UpdateInfo | null>(null);

  const isSupported = ref(!!updaterAPI());
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
  const availableUpdate = ref<{
    version: string;
    date?: string;
    body?: string;
    currentVersion: string;
  } | null>(null);
  const readyToRestartUpdate = ref<{
    version: string;
    date?: string;
    body?: string;
    currentVersion: string;
  } | null>(null);
  const lastCheckedAt = ref<number | null>(null);
  const lastError = ref<string | null>(null);
  const downloadTotalBytes = ref<number | null>(null);
  const downloadedBytes = ref<number | null>(null);
  const isBusy = computed(() => isChecking.value || isDownloading.value);

  const checkForUpdates = async () => {
    const api = updaterAPI();
    if (!api) return null;

    try {
      isChecking.value = true;
      status.value = 'checking';
      lastError.value = null;

      const info = await api.check();
      updateInfo.value = info;
      lastCheckedAt.value = Date.now();

      if (info) {
        status.value = 'available';
        availableUpdate.value = {
          version: info.version,
          date: info.releaseDate,
          body: info.releaseNotes,
          currentVersion: 'Current',
        };
      } else {
        status.value = 'up-to-date';
        availableUpdate.value = null;
      }
      return info;
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

    isDownloading.value = true;
    status.value = 'downloading';
    downloadProgress.value = 0;
    downloadTotalBytes.value = null;
    downloadedBytes.value = 0;

    const unsubProgress = api.onProgress(progress => {
      downloadProgress.value = Math.round(progress.percent);
      downloadTotalBytes.value = progress.total;
      downloadedBytes.value = progress.transferred;
    });

    const unsubReady = api.onReady(info => {
      isDownloading.value = false;
      status.value = 'ready-to-restart';
      readyToRestartUpdate.value = {
        version: info.version,
        date: info.releaseDate,
        body: info.releaseNotes,
        currentVersion: 'Current',
      };
      unsubProgress();
      unsubReady();

      toast.success(`orcaq ${info.version} is ready to install`, {
        description: 'Restart the app to apply the update.',
        duration: Infinity,
        action: {
          label: 'Restart now',
          onClick: () => api.install(),
        },
      });
    });

    const unsubError = api.onError(msg => {
      isDownloading.value = false;
      status.value = 'error';
      lastError.value = msg;
      unsubProgress();
      unsubReady();
      unsubError();
      console.error('[electron-updater] Download error:', msg);
      toast.error('Update failed', { description: msg });
    });

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
    if (status.value === 'available') {
      await startDownload();
    }
  };

  const restartToApplyUpdate = async (): Promise<void> => {
    status.value = 'restarting';
    await updaterAPI()?.install();
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
  };
}

// ─── Startup helpers (called from app.vue onMounted) ─────────────────────────

let _backgroundInterval: ReturnType<typeof setInterval> | null = null;

export async function checkForElectronUpdatesOnStartup(): Promise<void> {
  const api = updaterAPI();
  if (!api || import.meta.dev) return;

  try {
    const info = await api.check();
    if (!info) return;

    // Register one-time listeners for the lifecycle
    const unsubAvailable = api.onUpdateAvailable(updateInfo => {
      unsubAvailable();
      toast.info(`orcaq ${updateInfo.version} is available`, {
        description: 'A new version is ready to download.',
        duration: 10_000,
        action: {
          label: 'Update',
          onClick: () => {
            const { startDownload } = useElectronUpdater();
            startDownload();
          },
        },
      });
    });
  } catch {
    // Fail silently — update check is non-critical
  }
}

export function startElectronBackgroundUpdateChecks(
  intervalMs = 6 * 60 * 60 * 1_000 // 6 hours
): void {
  if (!updaterAPI() || import.meta.dev) return;
  if (_backgroundInterval) return; // Already running

  _backgroundInterval = setInterval(
    () => void checkForElectronUpdatesOnStartup(),
    intervalMs
  );
}
