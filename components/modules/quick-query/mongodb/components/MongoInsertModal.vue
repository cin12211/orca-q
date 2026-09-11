<script setup lang="ts">
import { useDropZone } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import { getMongoErrorMessage } from '../utils';

const props = defineProps<{
  open: boolean;
  connection: Connection | undefined;
  databaseName: string;
  collectionName: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  inserted: [];
}>();

function generateRandomMongoObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomHex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return timestamp + randomHex;
}

const activeTab = ref<'document' | 'import'>('document');
const editorContent = ref('');
const stagedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isLoading = ref(false);

const resetState = () => {
  editorContent.value = `{\n  _id: ObjectId('${generateRandomMongoObjectId()}')\n}`;
  stagedFile.value = null;
  activeTab.value = 'document';
  if (fileInputRef.value) fileInputRef.value.value = '';
};

watch(
  () => props.open,
  isOpen => {
    if (isOpen) resetState();
  },
  { immediate: true }
);

const dropZoneRef = useTemplateRef<HTMLDivElement>('dropZoneRef');
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop(files) {
    if (!files?.length || isLoading.value) return;
    const file = files[0];
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      toast.error('Please select a valid .json or .csv file');
      return;
    }
    stagedFile.value = file;
  },
});

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
    toast.error('Please select a valid .json or .csv file');
    return;
  }
  stagedFile.value = file;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleInsertDocument = async () => {
  isLoading.value = true;
  try {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editorContent.value);
    } catch {
      // Parse ObjectId literals like ObjectId('...')
      const sanitized = editorContent.value.replace(
        /ObjectId\((['"])([0-9a-fA-F]{24})\1\)/g,
        '"$2"'
      );
      parsed = JSON.parse(sanitized);
    }

    await $fetch('/api/mongodb/quick-query-mutation', {
      method: 'POST',
      body: {
        ...getConnectionParams(props.connection),
        database: props.databaseName,
        collection: props.collectionName,
        operation: 'insert',
        document: parsed,
      },
    });

    toast.success('Document inserted successfully!');
    emit('inserted');
    emit('update:open', false);
  } catch (err) {
    toast.error(getMongoErrorMessage(err));
  } finally {
    isLoading.value = false;
  }
};

const handleImportFile = async () => {
  if (!stagedFile.value) return;
  isLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('connectionId', props.connection?.id ?? '');
    formData.append('database', props.databaseName);
    formData.append('collection', props.collectionName);
    formData.append('file', stagedFile.value);

    const res = await $fetch<{ success: boolean; insertedCount: number }>(
      '/api/mongodb/import-collection',
      {
        method: 'POST',
        body: formData,
      }
    );

    toast.success(`Successfully imported ${res.insertedCount} documents!`);
    emit('inserted');
    emit('update:open', false);
  } catch (err) {
    toast.error(getMongoErrorMessage(err));
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:plus-sign" class="size-4" />
          <span>Insert into {{ props.collectionName }}</span>
        </DialogTitle>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="document">Insert Document</TabsTrigger>
          <TabsTrigger value="import">Import JSON or CSV file</TabsTrigger>
        </TabsList>

        <TabsContent value="document" class="space-y-4 pt-2">
          <div class="border rounded-md overflow-hidden h-60">
            <BaseCodeEditor
              v-model="editorContent"
              class="h-full w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" @click="emit('update:open', false)">
              Cancel
            </Button>
            <Button size="sm" :disabled="isLoading" @click="handleInsertDocument">
              <Icon v-if="isLoading" name="hugeicons:loading-03" class="size-4 animate-spin mr-1.5" />
              <span>Insert</span>
            </Button>
          </DialogFooter>
        </TabsContent>

        <TabsContent value="import" class="space-y-4 pt-2">
          <input
            ref="fileInputRef"
            type="file"
            accept=".json,.csv"
            class="hidden"
            @change="handleFileSelect"
          />

          <div
            ref="dropZoneRef"
            class="border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            :class="[
              isOverDropZone ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              isLoading ? 'opacity-50 pointer-events-none' : ''
            ]"
            @click="fileInputRef?.click()"
          >
            <Icon name="hugeicons:upload-cloud-01" class="size-10 text-muted-foreground" />
            <div class="text-center">
              <p class="text-sm font-medium">Drop file here or click to browse</p>
              <p class="text-xs text-muted-foreground mt-0.5">Supports .json and .csv files</p>
            </div>
          </div>

          <div
            v-if="stagedFile"
            class="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
          >
            <Icon name="hugeicons:file-01" class="size-5 text-muted-foreground" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ stagedFile.name }}</p>
              <p class="text-xs text-muted-foreground">{{ formatFileSize(stagedFile.size) }}</p>
            </div>
            <Button variant="ghost" size="xs" @click="stagedFile = null">
              <Icon name="hugeicons:cancel-01" class="size-3.5" />
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" @click="emit('update:open', false)">
              Cancel
            </Button>
            <Button
              size="sm"
              :disabled="isLoading || !stagedFile"
              @click="handleImportFile"
            >
              <Icon v-if="isLoading" name="hugeicons:loading-03" class="size-4 animate-spin mr-1.5" />
              <span>Import</span>
            </Button>
          </DialogFooter>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
