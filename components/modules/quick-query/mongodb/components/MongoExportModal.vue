<script setup lang="ts">
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';

const props = defineProps<{
  open: boolean;
  exportScope: 'current' | 'full';
  databaseName: string;
  collectionName: string;
  activeFilterPayload?: Record<string, unknown>;
  connection?: Connection;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const exportType = ref<'csv' | 'json'>('json');
const jsonFormat = ref<'default' | 'relaxed' | 'canonical'>('default');
const isExporting = ref(false);

const queryPreviewText = computed(() => {
  const filterStr = props.activeFilterPayload
    ? JSON.stringify(props.activeFilterPayload, null, 2)
    : '{}';
  return `Export results from the query below\n\ndb.getCollection('${props.collectionName}').find(${filterStr});`;
});

const handleExport = async () => {
  isExporting.value = true;
  try {
    const response = await $fetch.raw('/api/mongodb/export-collection', {
      method: 'POST',
      body: {
        ...getConnectionParams(props.connection),
        database: props.databaseName,
        collection: props.collectionName,
        scope: props.exportScope,
        filter: props.activeFilterPayload,
        format: exportType.value,
        jsonFormat: jsonFormat.value,
      },
      responseType: 'blob',
    });

    const blob = new Blob([response._data as any], {
      type: exportType.value === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.collectionName}_export.${exportType.value}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export completed successfully!');
    emit('update:open', false);
  } catch {
    toast.error('Failed to export data');
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:file-download" class="size-4" />
          <span>Export Data - {{ props.collectionName }}</span>
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div
          v-if="props.exportScope === 'current'"
          class="rounded-md bg-muted/60 p-3 text-xs font-mono whitespace-pre-wrap border border-border text-primary/90"
        >
          {{ queryPreviewText }}
        </div>

        <div class="space-y-2">
          <Label class="text-sm font-semibold">Export Format</Label>
          <RadioGroup v-model="exportType" class="flex gap-4">
            <div class="flex items-center gap-2">
              <RadioGroupItem id="export-json" value="json" />
              <Label for="export-json" class="cursor-pointer">JSON</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem id="export-csv" value="csv" />
              <Label for="export-csv" class="cursor-pointer">CSV</Label>
            </div>
          </RadioGroup>
        </div>

        <div v-if="exportType === 'json'" class="space-y-3 pt-2 border-t border-border">
          <Label class="text-sm font-semibold">Advanced JSON Format</Label>
          <RadioGroup v-model="jsonFormat" class="space-y-3">
            <div class="flex items-start gap-2.5">
              <RadioGroupItem id="format-default" value="default" class="mt-1" />
              <div>
                <Label for="format-default" class="font-medium cursor-pointer">Default Extended JSON</Label>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Example: { "fortyTwo": 42, "oneHalf": 0.5, "bignumber": { "$numberLong": "5000000000" } }
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <RadioGroupItem id="format-relaxed" value="relaxed" class="mt-1" />
              <div>
                <Label for="format-relaxed" class="font-medium cursor-pointer">Relaxed Extended JSON</Label>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Example: { "fortyTwo": 42, "oneHalf": 0.5, "bignumber": 5000000000 }. Large numbers (>= 2^^53) will change with this format.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <RadioGroupItem id="format-canonical" value="canonical" class="mt-1" />
              <div>
                <Label for="format-canonical" class="font-medium cursor-pointer">Canonical Extended JSON</Label>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Example: { "fortyTwo": { "$numberInt": "42" }, "oneHalf": { "$numberDouble": "0.5" }, "bignumber": { "$numberLong": "5000000000" } }
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" size="sm" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button size="sm" :disabled="isExporting" @click="handleExport">
          <Icon v-if="isExporting" name="hugeicons:loading-03" class="size-4 animate-spin mr-1.5" />
          <span>Export</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
