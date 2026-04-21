<script setup lang="ts">
import { useDataExport } from '../hooks/useDataExport';
import { useResetAllData } from '../hooks/useResetAllData';
import { RestoreDataPanel } from './backup-restore';

const RESET_CONFIRMATION_PHRASE = 'Reset all data';

const { isExporting, exportProgress, exportData } = useDataExport();
const { isResetting, resetAllData } = useResetAllData();

const isResetDialogOpen = ref(false);
const resetConfirmationValue = ref('');
const resetInputRef = ref<{ $el?: HTMLInputElement } | null>(null);

const isResetConfirmationValid = computed(
  () => resetConfirmationValue.value === RESET_CONFIRMATION_PHRASE
);

watch(isResetDialogOpen, async open => {
  if (!open) {
    resetConfirmationValue.value = '';
    return;
  }

  await nextTick();
  resetInputRef.value?.$el?.focus?.();
});

const handleResetDialogChange = (open: boolean) => {
  isResetDialogOpen.value = open;
};

const handleConfirmReset = async () => {
  if (!isResetConfirmationValid.value || isResetting.value) {
    return;
  }

  await resetAllData();
};
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-6">
    <!-- Export section -->
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:file-export" class="size-5!" /> Create Backup
      </h4>

      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-0.5">
          <p class="text-sm">Save a copy of everything</p>
          <p class="text-xs text-muted-foreground">
            Download one backup file that includes your workspaces, connections,
            queries, chat history, and app settings. Keep it safe so you can
            restore later or move your setup to another device.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          :disabled="isExporting"
          class="shrink-0"
          @click="exportData"
        >
          <Icon
            :name="
              isExporting ? 'hugeicons:loading-03' : 'hugeicons:file-export'
            "
            class="size-4!"
            :class="{ 'animate-spin': isExporting }"
          />
          {{ isExporting ? 'Creating backup…' : 'Download Backup' }}
        </Button>
      </div>

      <!-- Export progress bar -->
      <div v-if="isExporting" class="mt-3 space-y-1.5">
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Preparing your backup…</span>
          <span>{{ exportProgress }}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            :style="{ width: `${exportProgress}%` }"
          />
        </div>
      </div>
    </div>

    <Separator />

    <!-- Import section -->
    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:file-import" class="size-5!" /> Restore from
        Backup
      </h4>

      <p class="text-xs text-muted-foreground mb-3">
        Paste a backup file below to bring your data back in. Existing items
        with the same ID will be updated, missing items will be added, and
        anything not in the backup will stay as it is.
      </p>

      <RestoreDataPanel
        layout="inline"
        json-placeholder='Paste your backup JSON here… for example: {"persist":{...}}'
      />
    </div>

    <Separator />

    <div>
      <h4
        class="text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2"
      >
        <Icon name="hugeicons:database-sync-01" class="size-5!" /> Reset all
        data
      </h4>

      <div
        class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-start justify-between gap-4"
      >
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-foreground">
            Remove all user data from this app
          </p>
          <p class="text-xs text-muted-foreground max-w-xl">
            This permanently deletes every workspace, connection, query file,
            chat history, environment tag, and local setting stored on this
            device for OrcaQ.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="destructive"
          class="shrink-0"
          :disabled="isResetting"
          @click="isResetDialogOpen = true"
        >
          <Icon name="hugeicons:delete-02" class="size-4!" />
          Reset all data
        </Button>
      </div>
    </div>

    <Separator />

    <!-- Info section -->
    <div
      class="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-2"
    >
      <p class="font-medium text-foreground text-sm">
        What is included in this backup?
      </p>
      <ul class="list-disc list-inside space-y-1">
        <li>All workspaces and their settings</li>
        <li>
          All connections, including credentials, so treat this file like a
          password
        </li>
        <li>All query files and their SQL content</li>
        <li>Quick query run history</li>
        <li>Agent chat history</li>
        <li>App settings, migration history, and compatible local UI state</li>
      </ul>
    </div>
  </div>

  <Dialog :open="isResetDialogOpen" @update:open="handleResetDialogChange">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-destructive">
          <Icon name="hugeicons:alert-02" class="size-5!" />
          Reset all app data
        </DialogTitle>
        <DialogDescription class="space-y-3">
          <span class="block">
            This action cannot be undone. OrcaQ will clear all local user data
            and return to a fresh state.
          </span>
          <span class="block">
            Type
            <code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              {{ RESET_CONFIRMATION_PHRASE }}
            </code>
            to confirm.
          </span>
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2 py-2">
        <Label for="reset-all-data-confirmation">Confirmation</Label>
        <Input
          id="reset-all-data-confirmation"
          ref="resetInputRef"
          v-model="resetConfirmationValue"
          :placeholder="RESET_CONFIRMATION_PHRASE"
          autocomplete="off"
          @keydown.enter="handleConfirmReset"
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          :disabled="isResetting"
          @click="handleResetDialogChange(false)"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          :disabled="!isResetConfirmationValid || isResetting"
          @click="handleConfirmReset"
        >
          <Icon
            v-if="isResetting"
            name="hugeicons:loading-03"
            class="size-4! animate-spin"
          />
          {{ isResetting ? 'Resetting…' : 'Confirm reset' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
