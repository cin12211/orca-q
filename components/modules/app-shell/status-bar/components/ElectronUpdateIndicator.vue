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
  installUpdate,
  restartToApplyUpdate,
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

const indicatorIcon = computed(() => {
  if (readyToRestartUpdate.value) return 'hugeicons:package-delivered';
  if (status.value === 'downloading') return 'hugeicons:download-04';
  if (status.value === 'error') return 'hugeicons:alert-circle';
  return 'hugeicons:arrow-up-01';
});

const indicatorClass = computed(() => {
  if (status.value === 'error') return 'text-destructive';
  if (readyToRestartUpdate.value) return 'text-green-500';
  return 'text-blue-500';
});
</script>

<template>
  <Popover v-if="hasIndicator" v-model:open="popoverOpen">
    <PopoverTrigger as-child>
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            class="flex items-center gap-1 px-1 rounded hover:bg-muted cursor-pointer transition-colors"
            :class="indicatorClass"
          >
            <Icon :name="indicatorIcon" class="size-3.5!" />
            <span class="text-xxs font-medium leading-none">
              {{
                readyToRestartUpdate
                  ? 'Restart to update'
                  : `v${displayUpdate?.version}`
              }}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {{
            readyToRestartUpdate
              ? `v${readyToRestartUpdate.version} ready — click to restart`
              : `v${availableUpdate?.version} available`
          }}
        </TooltipContent>
      </Tooltip>
    </PopoverTrigger>

    <PopoverContent class="w-80 p-4 flex flex-col gap-3" align="end" side="top">
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
          Current version: {{ displayUpdate?.currentVersion }}
        </p>

        <p v-if="formattedPublishedAt" class="text-xs text-muted-foreground">
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

      <p
        v-if="lastError && status === 'error'"
        class="text-xs text-destructive"
      >
        {{ lastError }}
      </p>

      <p v-if="formattedLastCheckedAt" class="text-xs text-muted-foreground">
        Last checked: {{ formattedLastCheckedAt }}
      </p>

      <div class="flex gap-2">
        <Button
          v-if="readyToRestartUpdate"
          size="sm"
          class="flex-1"
          :disabled="isBusy"
          @click="restartToApplyUpdate()"
        >
          Restart & install
        </Button>
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
</template>
