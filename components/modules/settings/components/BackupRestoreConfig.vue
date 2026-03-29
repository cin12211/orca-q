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
        <Icon name="hugeicons:file-export" class="size-5!" /> Backup Data
      </h4>

      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-0.5">
          <p class="text-sm">Download all data</p>
          <p class="text-xs text-muted-foreground">
            Exports all workspaces, connections, query files, logs, and agent
            chat history to a single JSON file. Use this to transfer your data
            to another device or platform.
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
          {{ isExporting ? 'Backing up…' : 'Download Backup' }}
        </Button>
      </div>

      <!-- Export progress bar -->
      <div v-if="isExporting" class="mt-3 space-y-1.5">
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Collecting data…</span>
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
        <Icon name="hugeicons:file-import" class="size-5!" /> Restore Data
      </h4>

      <RestoreDataPanel
        layout="inline"
        json-placeholder='Paste your backup JSON here…  {"version":1,"persist":{...}}'
      />
    </div>

    <Separator />

    <!-- Info section -->
    <div
      class="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-2"
    >
      <p class="font-medium text-foreground text-sm">What is included?</p>
      <ul class="list-disc list-inside space-y-1">
        <li>All workspaces and their settings</li>
        <li>All connections (credentials are included — keep the file safe)</li>
        <li>All query files and their SQL content</li>
        <li>Quick query execution logs</li>
        <li>Agent chat history</li>
      </ul>
    </div>
  </div>
</template>
