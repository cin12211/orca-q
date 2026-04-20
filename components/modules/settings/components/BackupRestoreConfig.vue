<script setup lang="ts">
import { useDataExport } from '../hooks/useDataExport';
import { RestoreDataPanel } from './backup-restore';

const { isExporting, exportProgress, exportData } = useDataExport();
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
            Download one backup file that includes your workspaces,
            connections, queries, chat history, and app settings. Keep it safe
            so you can restore later or move your setup to another device.
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
</template>
