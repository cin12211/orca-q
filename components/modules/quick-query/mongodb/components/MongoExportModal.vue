<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CodeHighlightPreview } from '~/components/base/code-highlight-preview';
import { TooltipProvider } from '~/components/ui/tooltip';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import {
  MongoExportFormat,
  MongoExportScope,
  MongoExtendedJsonMode,
} from '../types';
import { getMongoErrorMessage, resolveMongoExportFileName } from '../utils';

const props = defineProps<{
  open: boolean;
  exportScope: MongoExportScope;
  databaseName: string;
  collectionName: string;
  activeFilterPayload?: Record<string, unknown>;
  connection?: Connection;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const exportType = ref<MongoExportFormat>(MongoExportFormat.Json);
const jsonFormat = ref<MongoExtendedJsonMode>(MongoExtendedJsonMode.Default);
const fileNameTemplate = ref('{collection}_{timestamp}_export');
const isExporting = ref(false);

watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      exportType.value = MongoExportFormat.Json;
      jsonFormat.value = MongoExtendedJsonMode.Default;
      fileNameTemplate.value = '{collection}_{timestamp}_export';
      isExporting.value = false;
    }
  }
);

const resolvedFileName = computed(() => {
  return resolveMongoExportFileName(fileNameTemplate.value, {
    collection: props.collectionName,
    database: props.databaseName,
    format: exportType.value,
  });
});

const queryPreviewCode = computed(() => {
  const filterStr = props.activeFilterPayload
    ? JSON.stringify(props.activeFilterPayload, null, 2)
    : '{}';
  return `db.getCollection('${props.collectionName}').find(${filterStr});`;
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
        filename: resolvedFileName.value,
      },
      responseType: 'blob',
    });

    const blob = new Blob([response._data as BlobPart], {
      type:
        exportType.value === MongoExportFormat.Json
          ? 'application/json'
          : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resolvedFileName.value;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export completed successfully!');
    emit('update:open', false);
  } catch (err) {
    toast.error(getMongoErrorMessage(err) || 'Failed to export data');
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="sm:max-w-2xl">
      <TooltipProvider>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base">
            <Icon name="hugeicons:file-download" class="size-4 text-primary" />
            <span class="flex items-center gap-1.5 font-medium">
              Export Data -
              <Badge variant="secondary" class="font-mono text-xs">
                {{ props.collectionName }}
              </Badge>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div
            v-if="props.exportScope === MongoExportScope.Current"
            class="space-y-1.5"
          >
            <Label class="text-xs font-medium text-muted-foreground">
              Export results from the query below
            </Label>
            <CodeHighlightPreview
              :code="queryPreviewCode"
              language="javascript"
              :show-copy-button="true"
              max-height="160px"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="export-filename">File Name</Label>
            <Input
              id="export-filename"
              v-model="fileNameTemplate"
              placeholder="{collection}_{timestamp}_export"
              class="h-8 font-mono text-xs w-full"
            />
            <div class="space-y-1 text-[11px] text-muted-foreground">
              <p>
                Supports:
                <code class="font-mono text-foreground/80">{collection}</code>,
                <code class="font-mono text-foreground/80">{database}</code>,
                <code class="font-mono text-foreground/80">{date}</code>,
                <code class="font-mono text-foreground/80">{timestamp}</code>
              </p>
              <p v-if="resolvedFileName" class="break-all">
                Preview:
                <span class="font-mono font-medium text-foreground/90">
                  {{ resolvedFileName }}
                </span>
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <Label class="">Export Format</Label>
            <RadioGroup v-model="exportType" class="flex gap-4">
              <div class="flex items-center gap-2">
                <RadioGroupItem
                  id="export-json"
                  :value="MongoExportFormat.Json"
                />
                <Label for="export-json" class="cursor-pointer font-medium"
                  >JSON</Label
                >
              </div>
              <div class="flex items-center gap-2">
                <RadioGroupItem
                  id="export-csv"
                  :value="MongoExportFormat.Csv"
                />
                <Label for="export-csv" class="cursor-pointer font-medium"
                  >CSV</Label
                >
              </div>
            </RadioGroup>
          </div>

          <div
            v-if="exportType === MongoExportFormat.Json"
            class="space-y-2 pt-2"
          >
            <Label class="">Advanced JSON Format</Label>
            <RadioGroup v-model="jsonFormat" class="">
              <div class="flex items-start gap-2.5">
                <RadioGroupItem
                  id="format-default"
                  :value="MongoExtendedJsonMode.Default"
                />
                <div for="format-default">
                  <Label
                    class="font-normal! cursor-pointer"
                    for="format-default"
                  >
                    Default Extended JSON
                  </Label>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Example: { "fortyTwo": 42, "oneHalf": 0.5, "bignumber": {
                    "$numberLong": "5000000000" } }
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-2.5">
                <RadioGroupItem
                  id="format-relaxed"
                  :value="MongoExtendedJsonMode.Relaxed"
                />
                <div>
                  <Label
                    for="format-relaxed"
                    class="font-normal! cursor-pointer"
                  >
                    Relaxed Extended JSON
                  </Label>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Example: { "fortyTwo": 42, "oneHalf": 0.5, "bignumber":
                    5000000000 }. Large numbers (>= 2^53) will change with this
                    format.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-2.5">
                <RadioGroupItem
                  id="format-canonical"
                  :value="MongoExtendedJsonMode.Canonical"
                />
                <div>
                  <Label
                    for="format-canonical"
                    class="font-normal! cursor-pointer"
                  >
                    Canonical Extended JSON
                  </Label>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Example: { "fortyTwo": { "$numberInt": "42" }, "oneHalf": {
                    "$numberDouble": "0.5" }, "bignumber": { "$numberLong":
                    "5000000000" } }
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            @click="emit('update:open', false)"
          >
            Cancel
          </Button>
          <Button size="sm" :disabled="isExporting" @click="handleExport">
            <Icon
              v-if="isExporting"
              name="hugeicons:loading-03"
              class="size-4 animate-spin mr-1.5"
            />
            <span>Export</span>
          </Button>
        </DialogFooter>
      </TooltipProvider>
    </DialogContent>
  </Dialog>
</template>
