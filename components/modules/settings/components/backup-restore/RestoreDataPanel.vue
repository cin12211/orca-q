<script setup lang="ts">
import { useDropZone } from '@vueuse/core';
import { computed, ref, useTemplateRef } from 'vue';
import { json } from '@codemirror/lang-json';
import { placeholder } from '@codemirror/view';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  BACKUP_JSON_FILE_ACCEPT,
  isBackupJsonFile,
  useDataImport,
} from '../../hooks/useDataImport';
import IncompatibleBackupDialog from './IncompatibleBackupDialog.vue';

type RestoreDataPanelLayout = 'modal' | 'inline';
type SuccessActionMode = 'reset' | 'emit';

const props = withDefaults(
  defineProps<{
    layout?: RestoreDataPanelLayout;
    successActionLabel?: string;
    successActionMode?: SuccessActionMode;
    jsonPlaceholder?: string;
  }>(),
  {
    layout: 'inline',
    successActionLabel: 'Dismiss',
    successActionMode: 'reset',
    jsonPlaceholder: '{"persist":{...}}',
  }
);

const emit = defineEmits<{ 'success-action': [] }>();

const {
  isImporting,
  error,
  success,
  progress,
  showIncompatibleDialog,
  incompatibleMigrations,
  importFromFile,
  importFromText,
  reset,
} = useDataImport();

const activeTab = ref<'file' | 'text'>('file');
const pastedJson = ref('');
const stagedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const isModalLayout = computed(() => props.layout === 'modal');

const jsonExtensions = computed(() => [
  placeholder(props.jsonPlaceholder),
  json(),
]);

const dropZoneRef = useTemplateRef<HTMLDivElement>('dropZoneRef');
const { isOverDropZone } = useDropZone(dropZoneRef, {
  dataTypes: ['application/json'],
  onDrop(files) {
    if (!files?.length || isImporting.value) return;

    const file = files[0]!;
    if (!isBackupJsonFile(file)) {
      reset();
      stagedFile.value = null;
      error.value = 'Please select a valid .json backup file.';
      return;
    }

    stagedFile.value = file;
    reset();
  },
});

const resetState = () => {
  reset();
  pastedJson.value = '';
  stagedFile.value = null;
  activeTab.value = 'file';

  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const canClose = () => !isImporting.value;

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (!isBackupJsonFile(file)) {
    reset();
    stagedFile.value = null;
    error.value = 'Please select a valid .json backup file.';

    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }

    return;
  }

  stagedFile.value = file;
  reset();

  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const triggerFilePicker = () => {
  reset();
  stagedFile.value = null;
  fileInputRef.value?.click();
};

const startFileImport = async () => {
  if (!stagedFile.value) return;
  await importFromFile(stagedFile.value);
};

const startTextImport = async () => {
  if (!pastedJson.value.trim()) return;
  await importFromText(pastedJson.value);
};

const handleTabChange = (val: string | number) => {
  if (isImporting.value) return;

  activeTab.value = val as 'file' | 'text';
  reset();
  stagedFile.value = null;
};

const handleSuccessAction = () => {
  if (props.successActionMode === 'emit') {
    emit('success-action');
    return;
  }

  resetState();
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

defineExpose({
  canClose,
  resetState,
});
</script>

<template>
  <div
    v-if="success"
    :class="
      isModalLayout
        ? 'flex-1 flex flex-col items-center justify-center gap-4 text-center py-8'
        : 'flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3'
    "
  >
    <template v-if="isModalLayout">
      <div class="rounded-full bg-emerald-500/10 p-5">
        <Icon
          name="hugeicons:checkmark-circle-02"
          class="size-10! text-emerald-500"
        />
      </div>
      <div class="space-y-1">
        <p class="font-medium text-base">Restore successful</p>
        <p class="text-sm text-muted-foreground">
          Your workspaces and data are ready to use.
        </p>
      </div>
    </template>

    <template v-else>
      <Icon
        name="lucide:circle-check"
        class="size-5! text-emerald-500 shrink-0"
      />
      <div class="flex-1 text-sm">
        <p class="font-medium text-emerald-600 dark:text-emerald-400">
          Restore successful
        </p>
        <p class="text-xs text-muted-foreground mt-0.5">
          Your workspaces and data are ready to use.
        </p>
      </div>
    </template>

    <Button
      :size="isModalLayout ? 'sm' : 'xs'"
      :variant="isModalLayout ? 'default' : 'ghost'"
      @click="handleSuccessAction"
    >
      {{ successActionLabel }}
    </Button>
  </div>

  <div
    v-else
    :class="isModalLayout ? 'flex-1 flex flex-col gap-4 min-h-0' : 'space-y-3'"
  >
    <Tabs
      :model-value="activeTab"
      :class="isModalLayout ? 'flex-1 flex flex-col min-h-0' : undefined"
      @update:model-value="handleTabChange"
    >
      <TabsList class="w-full shrink-0">
        <TabsTrigger value="file" class="flex-1">
          <Icon
            :name="isModalLayout ? 'hugeicons:folder-add' : 'lucide:file-up'"
            class="size-3.5! mr-1.5"
          />
          Upload File
        </TabsTrigger>
        <TabsTrigger value="text" class="flex-1">
          <Icon
            :name="isModalLayout ? 'hugeicons:source-code' : 'lucide:code'"
            class="size-3.5! mr-1.5"
          />
          Paste JSON
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="file"
        :class="
          isModalLayout
            ? 'mt-4 flex flex-col gap-3'
            : 'mt-3 flex flex-col gap-3'
        "
      >
        <input
          ref="fileInputRef"
          type="file"
          :accept="BACKUP_JSON_FILE_ACCEPT"
          class="hidden"
          @change="handleFileChange"
        />

        <div
          ref="dropZoneRef"
          class="border-2 border-dashed rounded-lg flex flex-col items-center gap-3 cursor-pointer transition-all duration-150 select-none"
          :class="[
            isModalLayout ? 'p-10' : 'p-6',
            isOverDropZone
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            isImporting ? 'opacity-50 pointer-events-none' : '',
          ]"
          @click="triggerFilePicker"
        >
          <Icon
            :name="isModalLayout ? 'hugeicons:file-01' : 'lucide:upload-cloud'"
            :class="[
              isModalLayout ? 'size-12!' : 'size-8!',
              'transition-colors',
              isOverDropZone ? 'text-primary' : 'text-muted-foreground',
            ]"
          />
          <div class="text-center">
            <p class="text-sm font-medium">
              {{
                isOverDropZone
                  ? 'Release to load file'
                  : 'Drop file here or click to browse'
              }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Only .json backup files exported from OrcaQ
            </p>
          </div>
        </div>

        <div
          v-if="stagedFile && !isImporting"
          class="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
        >
          <Icon
            :name="isModalLayout ? 'hugeicons:file-01' : 'lucide:file-json-2'"
            class="size-5! text-muted-foreground shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {{ stagedFile.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ formatFileSize(stagedFile.size) }}
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            class="shrink-0"
            @click.stop="stagedFile = null"
          >
            <Icon
              :name="isModalLayout ? 'hugeicons:cancel-01' : 'lucide:x'"
              class="size-3.5!"
            />
          </Button>
        </div>

        <Button
          class="w-full"
          size="sm"
          :disabled="isImporting || !stagedFile"
          @click="startFileImport"
        >
          <Icon
            :name="
              isImporting
                ? isModalLayout
                  ? 'hugeicons:loading-03'
                  : 'lucide:loader-circle'
                : isModalLayout
                  ? 'hugeicons:file-download'
                  : 'lucide:upload'
            "
            class="size-4! mr-1.5"
            :class="{ 'animate-spin': isImporting }"
          />
          {{ isImporting ? 'Restoring…' : 'Start Restore' }}
        </Button>
      </TabsContent>

      <TabsContent
        value="text"
        :class="
          isModalLayout
            ? 'mt-4 flex flex-col gap-3 flex-1 min-h-0'
            : 'mt-3 flex flex-col gap-3'
        "
      >
        <div
          class="max-h-80 min-h-36 overflow-auto rounded-md border border-input"
        >
          <BaseCodeEditor
            :model-value="pastedJson"
            :extensions="jsonExtensions"
            :disabled="isImporting"
            @update:model-value="pastedJson = $event"
          />
        </div>
        <Button
          :class="isModalLayout ? 'w-full shrink-0' : 'w-full'"
          size="sm"
          :disabled="isImporting || !pastedJson.trim()"
          @click="startTextImport"
        >
          <Icon
            :name="
              isImporting
                ? isModalLayout
                  ? 'hugeicons:loading-03'
                  : 'lucide:loader-circle'
                : isModalLayout
                  ? 'hugeicons:file-download'
                  : 'lucide:upload'
            "
            class="size-4! mr-1.5"
            :class="{ 'animate-spin': isImporting }"
          />
          {{ isImporting ? 'Restoring…' : 'Start Restore' }}
        </Button>
      </TabsContent>
    </Tabs>

    <div
      v-if="isImporting"
      :class="isModalLayout ? 'space-y-1.5 shrink-0' : 'space-y-1.5'"
    >
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>Restoring data…</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <div
      v-if="error"
      :class="
        isModalLayout
          ? 'flex items-start gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3 shrink-0'
          : 'flex items-start gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3'
      "
    >
      <Icon
        :name="isModalLayout ? 'hugeicons:cancel-01' : 'lucide:circle-x'"
        class="size-4! mt-0.5 shrink-0"
      />
      <span>{{ error }}</span>
    </div>
  </div>

  <IncompatibleBackupDialog
    v-model:open="showIncompatibleDialog"
    :unknown-migrations="incompatibleMigrations"
  />
</template>
