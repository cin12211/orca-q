import { toast } from 'vue-sonner';
import { formatBytes, isTauri } from '~/core/helpers';
import {
  checkForTauriUpdate,
  relaunchTauriApp,
  type Update,
} from '~/core/platform/tauri-updater';

export type TauriUpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'ready-to-restart'
  | 'restarting'
  | 'error';

export interface TauriUpdateSummary {
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
  rawJson: Record<string, unknown>;
}

const updaterStatus = ref<TauriUpdaterStatus>('idle');
const availableUpdateRef = shallowRef<Update | null>(null);
const readyToRestartUpdateRef = ref<TauriUpdateSummary | null>(null);
const lastCheckedAt = ref<string | null>(null);
const lastError = ref<string | null>(null);
const downloadTotalBytes = ref<number | null>(null);
const downloadedBytes = ref(0);
const startupCheckCompleted = ref(false);
const notifiedUpdateVersion = ref<string | null>(null);

const BACKGROUND_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let backgroundCheckInterval: ReturnType<typeof globalThis.setInterval> | null =
  null;

const toSummary = (update: Update): TauriUpdateSummary => ({
  currentVersion: update.currentVersion,
  version: update.version,
  date: update.date,
  body: update.body,
  rawJson: update.rawJson,
});

const resetDownloadProgress = () => {
  downloadTotalBytes.value = null;
  downloadedBytes.value = 0;
};

const disposeAvailableUpdate = async () => {
  if (!availableUpdateRef.value) {
    return;
  }

  try {
    await availableUpdateRef.value.close();
  } catch {
    // Ignore stale updater handles and replace them with the next check result.
  } finally {
    availableUpdateRef.value = null;
  }
};

const getAvailableUpdateSummary = () =>
  availableUpdateRef.value ? toSummary(availableUpdateRef.value) : null;

const showUpdateAvailableToast = (update: Update) => {
  toast(`orcaq ${update.version} is available`, {
    id: 'tauri-update-available',
    description: `Current version ${update.currentVersion}. Review the update from the status bar and install it when you are ready.`,
    duration: 20000,
  });
};

const notifyAboutAvailableUpdate = (update: Update) => {
  if (notifiedUpdateVersion.value === update.version) {
    return;
  }

  notifiedUpdateVersion.value = update.version;
  showUpdateAvailableToast(update);
};

export async function checkForUpdates(
  options: { silent?: boolean; notifyIfAvailable?: boolean } = {}
) {
  const { silent = false, notifyIfAvailable = !silent } = options;

  if (!isTauri()) {
    if (!silent) {
      toast.error('Desktop updates are only available in the Tauri app');
    }
    return null;
  }

  if (
    updaterStatus.value === 'checking' ||
    updaterStatus.value === 'downloading' ||
    updaterStatus.value === 'restarting'
  ) {
    return readyToRestartUpdateRef.value ?? getAvailableUpdateSummary();
  }

  if (readyToRestartUpdateRef.value) {
    if (!silent) {
      toast('Update is ready to apply', {
        description: 'Restart orcaq when you are ready to use the new build.',
      });
    }

    return readyToRestartUpdateRef.value;
  }

  if (availableUpdateRef.value) {
    if (notifyIfAvailable) {
      notifyAboutAvailableUpdate(availableUpdateRef.value);
    }

    return getAvailableUpdateSummary();
  }

  updaterStatus.value = 'checking';
  lastError.value = null;
  resetDownloadProgress();

  try {
    await disposeAvailableUpdate();
    const update = await checkForTauriUpdate();

    availableUpdateRef.value = update;
    lastCheckedAt.value = new Date().toISOString();

    if (!update) {
      updaterStatus.value = 'up-to-date';
      readyToRestartUpdateRef.value = null;

      if (!silent) {
        toast.success('orcaq is up to date');
      }

      return null;
    }

    updaterStatus.value = 'available';
    readyToRestartUpdateRef.value = null;

    if (notifyIfAvailable) {
      notifyAboutAvailableUpdate(update);
    }

    return toSummary(update);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to check for updates';

    updaterStatus.value = 'error';
    lastError.value = message;
    lastCheckedAt.value = new Date().toISOString();

    if (!silent) {
      toast.error('Update check failed', {
        description: message,
      });
    }

    return null;
  }
}

export async function installUpdate() {
  if (!isTauri()) {
    toast.error('Desktop updates are only available in the Tauri app');
    return false;
  }

  if (!availableUpdateRef.value) {
    if (readyToRestartUpdateRef.value) {
      toast('Update is ready to apply', {
        description: 'Restart orcaq to finish updating.',
      });
      return true;
    }

    toast('No update is ready to install');
    return false;
  }

  const update = availableUpdateRef.value;
  const toastId = 'tauri-update-install';

  updaterStatus.value = 'downloading';
  lastError.value = null;
  resetDownloadProgress();

  toast.loading(`Downloading orcaq ${update.version}...`, {
    id: toastId,
    description: 'Preparing updater package...',
  });

  try {
    await update.downloadAndInstall(event => {
      if (event.event === 'Started') {
        downloadTotalBytes.value = event.data.contentLength ?? null;

        toast.loading(`Downloading orcaq ${update.version}...`, {
          id: toastId,
          description: event.data.contentLength
            ? `${formatBytes(event.data.contentLength)} total`
            : 'Download started',
        });

        return;
      }

      if (event.event === 'Progress') {
        downloadedBytes.value += event.data.chunkLength;

        const progressDescription = downloadTotalBytes.value
          ? `${formatBytes(downloadedBytes.value)} / ${formatBytes(downloadTotalBytes.value)}`
          : `${formatBytes(downloadedBytes.value)} downloaded`;

        toast.loading(`Downloading orcaq ${update.version}...`, {
          id: toastId,
          description: progressDescription,
        });
      }
    });

    updaterStatus.value = 'ready-to-restart';
    readyToRestartUpdateRef.value = toSummary(update);

    toast.success(`orcaq ${update.version} is ready`, {
      id: toastId,
      description: 'Restart the app when you are ready to apply the update.',
      action: {
        label: 'Restart',
        onClick: () => {
          void restartToApplyUpdate();
        },
      },
    });

    availableUpdateRef.value = null;

    try {
      await update.close();
    } catch {
      // Ignore stale updater handles after the package is installed.
    }

    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to install update';

    updaterStatus.value = 'error';
    lastError.value = message;

    toast.error('Update install failed', {
      id: toastId,
      description: message,
    });

    return false;
  }
}

export async function restartToApplyUpdate() {
  if (!isTauri()) {
    toast.error('Desktop updates are only available in the Tauri app');
    return false;
  }

  if (!readyToRestartUpdateRef.value) {
    toast('No downloaded update is waiting to be applied');
    return false;
  }

  updaterStatus.value = 'restarting';
  lastError.value = null;

  toast.loading('Restarting orcaq...', {
    id: 'tauri-update-restart',
    description: `Applying version ${readyToRestartUpdateRef.value.version}.`,
  });

  try {
    await relaunchTauriApp();
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to restart application';

    updaterStatus.value = 'error';
    lastError.value = message;

    toast.error('Restart failed', {
      id: 'tauri-update-restart',
      description: message,
    });

    return false;
  }
}

export async function checkForUpdatesOnStartup() {
  if (!isTauri() || import.meta.dev || startupCheckCompleted.value) {
    return;
  }

  startupCheckCompleted.value = true;

  await checkForUpdates({
    silent: true,
    notifyIfAvailable: true,
  });
}

export function startBackgroundUpdateChecks() {
  if (!isTauri() || import.meta.dev || backgroundCheckInterval) {
    return;
  }

  backgroundCheckInterval = globalThis.setInterval(() => {
    void checkForUpdates({
      silent: true,
      notifyIfAvailable: true,
    });
  }, BACKGROUND_UPDATE_CHECK_INTERVAL_MS);
}

export function useTauriUpdater() {
  const isSupported = computed(() => isTauri());
  const availableUpdate = computed(() => getAvailableUpdateSummary());
  const readyToRestartUpdate = computed(() => readyToRestartUpdateRef.value);
  const isBusy = computed(() =>
    ['checking', 'downloading', 'restarting'].includes(updaterStatus.value)
  );

  return {
    isSupported,
    status: readonly(updaterStatus),
    availableUpdate,
    readyToRestartUpdate,
    isBusy,
    lastCheckedAt: readonly(lastCheckedAt),
    lastError: readonly(lastError),
    downloadTotalBytes: readonly(downloadTotalBytes),
    downloadedBytes: readonly(downloadedBytes),
    checkForUpdates,
    installUpdate,
    restartToApplyUpdate,
    checkForUpdatesOnStartup,
    startBackgroundUpdateChecks,
  };
}
