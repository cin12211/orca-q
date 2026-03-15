<script setup lang="ts">
import { computed } from 'vue';
import DynamicTable from '~/components/base/dynamic-table/DynamicTable.vue';
import type { MappedRawColumn } from '~/components/modules/raw-query/interfaces';
import type { SupportedLanguage } from '~/core/composables/useSqlHighlighter';
import { formatBytes } from '~/core/helpers';
import { useFileDownload } from '../../hooks/useFileDownload';
import type { AgentExportFileResult } from '../../types';

const props = defineProps<{
  result: AgentExportFileResult;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { downloadFile } = useFileDownload();

const TABLE_PREVIEW_FORMATS = new Set(['csv', 'tsv']);
const isTablePreview = computed(() =>
  TABLE_PREVIEW_FORMATS.has(props.result.format)
);

const CODE_LANGUAGE_MAP: Partial<Record<string, SupportedLanguage>> = {
  json: 'json',
  sql: 'sql',
  markdown: 'markdown',
  xml: 'xml',
  yaml: 'yaml',
  html: 'html',
};

const codeLanguage = computed<SupportedLanguage | undefined>(
  () => CODE_LANGUAGE_MAP[props.result.format]
);

const previewColumns = computed(() => props.result.preview.columns ?? []);
const previewRows = computed(() => props.result.preview.rows ?? []);

const codeContent = computed(() => {
  if (props.result.encoding === 'base64') {
    return `${props.result.filename} is a binary spreadsheet file. Use Download to open it locally.`;
  }
  return props.result.content;
});

const dynamicTableColumns = computed<MappedRawColumn[]>(() => {
  return previewColumns.value.map(col => ({
    originalName: col,
    aliasFieldName: col,
    queryFieldName: col,
    tableName: '',
    type: 'string', // generic fallback
    isPrimaryKey: false,
    isForeignKey: false,
    canMutate: false,
  }));
});

const handleDownload = async () => {
  await downloadFile(props.result);
};

const fileSizeLabel = computed(() => {
  const size = props.result.fileSize;
  return formatBytes(size);
});
</script>

<template>
  <div class="flex h-full flex-col bg-sidebar z-50 p-2 gap-2">
    <div class="flex shrink-0 items-center justify-between gap-2">
      <div class="flex items-center min-w-0 gap-1 flex-1">
        <Icon
          name="hugeicons:document-attachment"
          class="size-5! shrink-0 text-foreground"
        />
        <div class="flex flex-col">
          <h3 class="truncate text-sm leading-4 font-medium text-foreground">
            {{ result.filename }}
          </h3>

          <p
            v-if="result.preview.truncated"
            class="text-xxs text-muted-foreground truncate shrink-0"
          >
            First {{ previewRows.length }} rows
          </p>
          <p v-else class="text-xxs text-muted-foreground truncate shrink-0">
            size: {{ fileSizeLabel }} • type: {{ result.format }}
          </p>
        </div>
      </div>

      <div class="flex shrink-0 items-center justify-end gap-1">
        <Button
          size="sm"
          variant="outline"
          class="h-6.5 text-xs px-2"
          :disabled="!!result.error"
          @click="handleDownload"
        >
          Download <Icon name="lucide:download" class="size-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          class="size-7"
          @click="emit('close')"
        >
          <Icon name="lucide:x" class="size-4" />
        </Button>
      </div>
    </div>

    <div class="flex-1 overflow-hidden min-h-0 flex flex-col">
      <div
        v-if="result.error"
        class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mx-2"
      >
        {{ result.error }}
      </div>

      <div
        v-else-if="isTablePreview"
        class="flex-1 w-full overflow-hidden rounded-xl border border-border/70 flex flex-col min-h-0 relative h-full"
      >
        <DynamicTable
          :columns="dynamicTableColumns"
          :data="previewRows"
          column-key-by="field"
          class="h-full"
        />
      </div>

      <CodeHighlightPreview
        v-else
        :code="codeContent"
        :language="codeLanguage"
        max-height="100%"
        class="h-full rounded-xl overflow-auto border border-border/70"
      />
    </div>
  </div>
</template>
