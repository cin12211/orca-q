<script setup lang="ts">
import { useTauriUpdater } from '~/core/composables/useTauriUpdater';
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
} = useTauriUpdater();

const displayUpdate = computed(
  () => readyToRestartUpdate.value ?? availableUpdate.value
);

const hasIndicator = computed(() => {
  if (!isSupported.value) {
    return false;
  }

  if (readyToRestartUpdate.value) {
    return true;
  }

  return (
    ['available', 'downloading'].includes(status.value) ||
    (status.value === 'error' && !!availableUpdate.value)
  );
});

const formattedPublishedAt = computed(() => {
  if (!displayUpdate.value?.date) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(displayUpdate.value.date));
});

const formattedLastCheckedAt = computed(() => {
  if (!lastCheckedAt.value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(lastCheckedAt.value));
});

const releaseNotesExcerpt = computed(() => {
  const body = displayUpdate.value?.body?.trim();

  if (!body) {
    return 'No release notes were published for this release.';
  }

  const normalized = body
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join('\n');

  return normalized.length > 320
    ? `${normalized.slice(0, 317).trimEnd()}...`
    : normalized;
});

const downloadProgressPercent = computed(() => {
  if (!downloadTotalBytes.value || !downloadedBytes.value) {
    return null;
  }

  return Math.min(
    100,
    Math.round((downloadedBytes.value / downloadTotalBytes.value) * 100)
  );
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

const chipLabel = computed(() => {
  if (readyToRestartUpdate.value) {
    return 'Restart to update';
  }

  if (status.value === 'downloading') {
    return downloadProgressPercent.value
      ? `Downloading ${downloadProgressPercent.value}%`
      : 'Downloading update';
  }

  if (status.value === 'error' && availableUpdate.value) {
    return 'Retry update';
  }

  if (displayUpdate.value) {
    return `Update ${displayUpdate.value.version}`;
  }

  return '';
});

const chipIcon = computed(() => {
  if (readyToRestartUpdate.value) {
    return 'lucide:rotate-cw';
  }

  if (status.value === 'downloading') {
    return 'lucide:loader-circle';
  }

  return 'lucide:download';
});

const chipClass = computed(() => {
  if (readyToRestartUpdate.value) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (status.value === 'downloading') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
});

const primaryActionLabel = computed(() => {
  if (readyToRestartUpdate.value) {
    return 'Restart now';
  }

  if (status.value === 'error' && availableUpdate.value) {
    return 'Retry download';
  }

  return 'Update now';
});

const handlePrimaryAction = async () => {
  if (readyToRestartUpdate.value) {
    await restartToApplyUpdate();
    return;
  }

  await installUpdate();
};
</script>

<template>
  <Popover v-if="hasIndicator" v-model:open="popoverOpen">
    <Tooltip>
      <TooltipTrigger as-child>
        <PopoverTrigger as-child>
          <Button
            variant="ghost"
            size="sm"
            :class="[
              'h-5 rounded-full border px-2 text-xxs font-medium transition-colors',
              chipClass,
            ]"
          >
            <Icon
              :name="chipIcon"
              :class="[
                'mr-1 size-3.5!',
                status === 'downloading' && 'animate-spin',
              ]"
            />
            {{ chipLabel }}
          </Button>
        </PopoverTrigger>
      </TooltipTrigger>

      <TooltipContent>
        <p>
          {{
            readyToRestartUpdate
              ? 'The update is downloaded and waiting for restart.'
              : 'A newer desktop build is available.'
          }}
        </p>
      </TooltipContent>
    </Tooltip>

    <PopoverContent side="top" align="end" class="w-[26rem] p-0">
      <div class="flex flex-col gap-4 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-foreground">
              {{
                readyToRestartUpdate
                  ? `orcaq ${displayUpdate?.version} is ready`
                  : `orcaq ${displayUpdate?.version} is available`
              }}
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

          <div
            class="rounded-full border px-2 py-1 text-[11px] font-medium"
            :class="chipClass"
          >
            {{ chipLabel }}
          </div>
        </div>

        <div class="rounded-lg border bg-muted/30 p-3">
          <p
            class="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Release notes
          </p>
          <p class="whitespace-pre-wrap text-xs text-muted-foreground">
            {{ releaseNotesExcerpt }}
          </p>
        </div>

        <div
          v-if="downloadProgressLabel"
          class="rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
        >
          <p>Download progress: {{ downloadProgressLabel }}</p>
        </div>

        <div
          v-if="lastError"
          class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
        >
          {{ lastError }}
        </div>

        <div class="flex items-center justify-between gap-3">
          <p
            v-if="formattedLastCheckedAt"
            class="text-[11px] text-muted-foreground"
          >
            Last checked: {{ formattedLastCheckedAt }}
          </p>
          <div v-else />

          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="popoverOpen = false">
              Later
            </Button>

            <Button
              size="sm"
              :disabled="isBusy || status === 'downloading'"
              @click="handlePrimaryAction"
            >
              {{ primaryActionLabel }}
            </Button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
