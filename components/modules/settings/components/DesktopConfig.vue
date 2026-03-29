<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useTauriUpdater } from '~/core/composables/useTauriUpdater';
import { formatBytes, isTauri } from '~/core/helpers';
import {
  getDesktopStoragePaths,
  openDesktopStoragePath,
  type DesktopStoragePaths,
  type DesktopStorageTarget,
} from '~/core/platform/tauri-storage';

const {
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
  installUpdate,
  restartToApplyUpdate,
} = useTauriUpdater();
const isDevBuild = import.meta.dev;
const isTauriRuntime = isTauri();
const storagePaths = shallowRef<DesktopStoragePaths | null>(null);
const storageError = ref<string | null>(null);
const isLoadingStoragePaths = ref(false);
const openingStorageTarget = ref<DesktopStorageTarget | null>(null);

const formattedLastCheckedAt = computed(() => {
  if (!lastCheckedAt.value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(lastCheckedAt.value));
});

const formattedPublishedAt = computed(() => {
  const update = readyToRestartUpdate.value ?? availableUpdate.value;

  if (!update?.date) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(update.date));
});

const downloadProgressLabel = computed(() => {
  if (!downloadedBytes.value) {
    return null;
  }

  if (downloadTotalBytes.value) {
    return `${formatBytes(downloadedBytes.value)} / ${formatBytes(downloadTotalBytes.value)}`;
  }

  return `${formatBytes(downloadedBytes.value)} downloaded`;
});

const statusLabel = computed(() => {
  switch (status.value) {
    case 'checking':
      return 'Checking GitHub Releases for a newer desktop build.';
    case 'available':
      return 'A newer signed desktop build is available. Review it from the status bar or download it here.';
    case 'up-to-date':
      return 'This desktop app is already on the latest published version.';
    case 'downloading':
      return 'Downloading and preparing the update package in the background.';
    case 'ready-to-restart':
      return 'The update is installed and waiting for you to restart the app.';
    case 'restarting':
      return 'Restarting the app to apply the update.';
    case 'error':
      return 'The last update action failed.';
    default:
      return 'The app checks GitHub Releases in the background and lets you decide when to apply updates.';
  }
});

const webStorageDescription = computed(() => {
  if (storagePaths.value?.webStoragePath) {
    return 'WebView localStorage and IndexedDB live here.';
  }

  return 'Web storage path is not exposed on this platform yet.';
});

const loadStoragePaths = async () => {
  if (!isTauriRuntime) {
    return;
  }

  isLoadingStoragePaths.value = true;
  storageError.value = null;

  try {
    storagePaths.value = await getDesktopStoragePaths();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to load desktop storage paths';

    storageError.value = message;
  } finally {
    isLoadingStoragePaths.value = false;
  }
};

const handleOpenStoragePath = async (target: DesktopStorageTarget) => {
  openingStorageTarget.value = target;

  try {
    await openDesktopStoragePath(target);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to open storage folder';

    storageError.value = message;
    toast(message, {
      description: 'Could not open the requested folder.',
    });
  } finally {
    openingStorageTarget.value = null;
  }
};

const handleCheckNow = async () => {
  await checkForUpdates();
};

const handleInstallUpdate = async () => {
  await installUpdate();
};

const handleRestartUpdate = async () => {
  await restartToApplyUpdate();
};

onMounted(() => {
  void loadStoragePaths();
});
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-4">
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:download-04" class="size-5!" /> Desktop updates
      </h4>

      <div class="rounded-xl border p-4 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <p class="text-sm">Background update checks</p>
            <p class="text-xs text-muted-foreground">
              {{ statusLabel }}
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="!isSupported || isBusy"
            @click="handleCheckNow"
          >
            Check now
          </Button>
        </div>

        <div
          v-if="!isSupported"
          class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
        >
          Desktop updater is only available inside the Tauri desktop app.
        </div>

        <template v-else>
          <div
            v-if="readyToRestartUpdate || availableUpdate"
            class="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex flex-col gap-1">
                <p class="text-sm font-medium">
                  <template v-if="readyToRestartUpdate">
                    Update {{ readyToRestartUpdate.version }} is ready
                  </template>
                  <template v-else-if="availableUpdate">
                    Update {{ availableUpdate.version }} is available
                  </template>
                </p>
                <p class="text-xs text-muted-foreground">
                  Current version:
                  {{
                    (readyToRestartUpdate ?? availableUpdate)?.currentVersion
                  }}
                </p>
                <p
                  v-if="formattedPublishedAt"
                  class="text-xs text-muted-foreground"
                >
                  Published: {{ formattedPublishedAt }}
                </p>
              </div>

              <Button
                v-if="readyToRestartUpdate"
                type="button"
                size="sm"
                :disabled="isBusy"
                @click="handleRestartUpdate"
              >
                Restart to apply
              </Button>
              <Button
                v-else
                type="button"
                size="sm"
                :disabled="isBusy"
                @click="handleInstallUpdate"
              >
                {{ status === 'error' ? 'Retry download' : 'Download update' }}
              </Button>
            </div>

            <p
              v-if="(readyToRestartUpdate ?? availableUpdate)?.body"
              class="text-xs text-muted-foreground whitespace-pre-wrap"
            >
              {{ (readyToRestartUpdate ?? availableUpdate)?.body }}
            </p>
          </div>

          <div
            v-if="downloadProgressLabel"
            class="rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
          >
            Download progress: {{ downloadProgressLabel }}
          </div>
        </template>

        <div class="flex flex-col gap-1 text-xs text-muted-foreground">
          <p v-if="formattedLastCheckedAt">
            Last checked: {{ formattedLastCheckedAt }}
          </p>
          <p v-if="lastError">Last error: {{ lastError }}</p>
          <p v-if="isTauriRuntime && isDevBuild">
            Development mode can check the updater, but install flow is intended
            for packaged releases.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:folder-file-storage" class="size-5!" /> Data
        location
      </h4>

      <div class="rounded-xl border p-4 flex flex-col gap-4">
        <div
          v-if="!isTauriRuntime"
          class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
        >
          Data folders are only available inside the Tauri desktop app.
        </div>

        <template v-else>
          <div class="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1 flex flex-col gap-1">
                <p class="text-sm font-medium">Native data path</p>
                <p class="text-xs text-muted-foreground">
                  JSON persistence used by workspaces, connections, tabs, and
                  query history.
                </p>
                <code
                  class="text-xs break-all rounded-md bg-background/70 px-2 py-1 font-mono"
                >
                  {{
                    storagePaths?.nativeDataPath ||
                    (isLoadingStoragePaths ? 'Loading…' : 'Unavailable')
                  }}
                </code>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                :disabled="
                  !storagePaths?.nativeDataPath ||
                  openingStorageTarget === 'nativeData'
                "
                @click="handleOpenStoragePath('nativeData')"
              >
                Open folder
              </Button>
            </div>
          </div>

          <div class="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1 flex flex-col gap-1">
                <p class="text-sm font-medium">Web storage path</p>
                <p class="text-xs text-muted-foreground">
                  {{ webStorageDescription }}
                </p>
                <code
                  class="text-xs break-all rounded-md bg-background/70 px-2 py-1 font-mono"
                >
                  {{
                    storagePaths?.webStoragePath ||
                    (isLoadingStoragePaths ? 'Loading…' : 'Unavailable')
                  }}
                </code>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                :disabled="
                  !storagePaths?.webStoragePath ||
                  openingStorageTarget === 'webStorage'
                "
                @click="handleOpenStoragePath('webStorage')"
              >
                Open folder
              </Button>
            </div>
          </div>

          <p v-if="storageError" class="text-xs text-destructive">
            {{ storageError }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
