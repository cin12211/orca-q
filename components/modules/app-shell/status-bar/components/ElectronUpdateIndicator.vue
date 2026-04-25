<script setup lang="ts">
import { useElectronUpdater } from '~/core/composables/useElectronUpdater';
import { formatBytes } from '~/core/helpers';

const popoverOpen = ref(false);

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
  downloadProgress,
  isDownloadStalled,
  installUpdate,
  restartToApplyUpdate,
  cancelDownload,
  retryDownload,
} = useElectronUpdater();

const displayUpdate = computed(
  () => readyToRestartUpdate.value ?? availableUpdate.value
);

const hasIndicator = computed(() => {
  if (!isSupported.value) return false;
  if (readyToRestartUpdate.value) return true;
  return (
    ['available', 'downloading'].includes(status.value) ||
    (status.value === 'error' && !!availableUpdate.value)
  );
});

const formattedPublishedAt = computed(() => {
  if (!displayUpdate.value?.date) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(displayUpdate.value.date));
});

const formattedLastCheckedAt = computed(() => {
  if (!lastCheckedAt.value) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(lastCheckedAt.value));
});

const downloadProgressLabel = computed(() => {
  if (!downloadedBytes.value) return null;
  if (downloadTotalBytes.value) {
    return `${formatBytes(downloadedBytes.value)} / ${formatBytes(downloadTotalBytes.value)}`;
  }
  return `${formatBytes(downloadedBytes.value)} downloaded`;
});

// T015 — stall state included in icon selection
const indicatorIcon = computed(() => {
  if (readyToRestartUpdate.value) return 'hugeicons:package-delivered';
  if (status.value === 'downloading' && isDownloadStalled.value)
    return 'hugeicons:alert-circle';
  if (status.value === 'downloading') return 'hugeicons:download-04';
  if (status.value === 'error') return 'hugeicons:alert-circle';
  return 'hugeicons:arrow-up-01';
});

// T016 — stall state gets yellow colour
const indicatorClass = computed(() => {
  if (status.value === 'error') return 'text-destructive';
  if (status.value === 'downloading' && isDownloadStalled.value)
    return 'text-yellow-500';
  if (readyToRestartUpdate.value) return 'text-green-500';
  return 'text-blue-500';
});
</script>

<template>
  <template v-if="hasIndicator">
    <!-- T039: Restart-ready — direct single-click action, no popover -->
    <Tooltip v-if="readyToRestartUpdate">
      <TooltipTrigger as-child>
        <button
          class="flex items-center gap-1 px-1 rounded hover:bg-muted cursor-pointer transition-colors"
          :class="indicatorClass"
          :disabled="isBusy"
          @click="restartToApplyUpdate()"
        >
          <Icon :name="indicatorIcon" class="size-3.5!" />
          <span class="text-xxs font-medium leading-none"
            >Restart to update</span
          >
        </button>
      </TooltipTrigger>
      <TooltipContent>
        v{{ readyToRestartUpdate.version }} ready — click to restart
      </TooltipContent>
    </Tooltip>

    <!-- All other states: popover with details -->
    <Tooltip v-else>
      <Popover v-model:open="popoverOpen">
        <PopoverTrigger as-child>
          <TooltipTrigger as-child>
            <button
              class="flex items-center gap-1 px-1 rounded hover:bg-muted cursor-pointer transition-colors"
              :class="indicatorClass"
            >
              <Icon :name="indicatorIcon" class="size-3.5!" />
              <span class="text-xxs font-medium leading-none">
                <!-- T013/T014: show % when downloading, 'stalled' when stalled -->
                <template v-if="status === 'downloading' && isDownloadStalled">
                  v{{ displayUpdate?.version }} · stalled
                </template>
                <template v-else-if="status === 'downloading'">
                  v{{ displayUpdate?.version }} · {{ downloadProgress }}%
                </template>
                <template v-else>v{{ displayUpdate?.version }}</template>
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            v{{ availableUpdate?.version }} available
          </TooltipContent>
        </PopoverTrigger>

        <PopoverContent
          class="w-80 p-4 flex flex-col gap-3"
          align="end"
          side="top"
        >
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">
              Update {{ availableUpdate?.version }} is available
            </p>

            <p class="text-xs text-muted-foreground">
              Current version: {{ displayUpdate?.currentVersion }}
            </p>

            <p
              v-if="formattedPublishedAt"
              class="text-xs text-muted-foreground"
            >
              Published: {{ formattedPublishedAt }}
            </p>
          </div>

          <p
            v-if="displayUpdate?.body"
            class="text-xs text-muted-foreground whitespace-pre-wrap border rounded-md p-2 bg-muted/30 max-h-32 overflow-y-auto"
          >
            {{ displayUpdate.body }}
          </p>

          <p v-if="downloadProgressLabel" class="text-xs text-muted-foreground">
            Downloading: {{ downloadProgressLabel }}
          </p>

          <!-- T017: Progress bar when actively downloading -->
          <div
            v-if="status === 'downloading'"
            class="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              class="h-full rounded-full bg-blue-500 transition-all duration-300"
              :style="{ width: `${downloadProgress}%` }"
            />
          </div>

          <!-- T018: Stall message + Cancel/Retry buttons -->
          <p v-if="isDownloadStalled" class="text-xs text-yellow-500">
            Download appears to have stalled. You can retry or cancel.
          </p>

          <p
            v-if="lastError && status === 'error'"
            class="text-xs text-destructive"
          >
            {{ lastError }}
          </p>

          <p
            v-if="formattedLastCheckedAt"
            class="text-xs text-muted-foreground"
          >
            Last checked: {{ formattedLastCheckedAt }}
          </p>

          <div class="flex gap-2">
            <!-- T019: Cancel + Retry when stalled -->
            <template v-if="status === 'downloading' && isDownloadStalled">
              <Button
                size="sm"
                variant="outline"
                class="flex-1"
                @click="cancelDownload()"
              >
                Cancel
              </Button>
              <Button size="sm" class="flex-1" @click="retryDownload()">
                Retry
              </Button>
            </template>
            <Button
              v-else
              size="sm"
              class="flex-1"
              :disabled="isBusy || status === 'downloading'"
              @click="installUpdate()"
            >
              {{
                status === 'downloading'
                  ? 'Downloading…'
                  : status === 'error'
                    ? 'Retry download'
                    : 'Download update'
              }}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </Tooltip>
  </template>
</template>
