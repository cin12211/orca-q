<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import { formatBytes } from '~/core/helpers';
import { useFileDownload } from '../../hooks/useFileDownload';
import type { AgentExportFileResult } from '../../types';

const props = defineProps<{
  data: AgentExportFileResult;
}>();

const activeExportPreview = inject<Ref<AgentExportFileResult | null>>(
  'activeExportPreview'
);

const { downloadFile } = useFileDownload();

const handleOpenPreview = () => {
  if (activeExportPreview) {
    activeExportPreview.value = props.data;
  }
};

const formatIcon = computed(() => {
  switch (props.data.format) {
    case 'json':
      return 'lucide:braces';
    case 'sql':
      return 'lucide:database';
    case 'markdown':
      return 'lucide:file-text';
    case 'xml':
      return 'lucide:code-xml';
    case 'yaml':
      return 'lucide:settings-2';
    case 'html':
      return 'lucide:globe';
    case 'tsv':
    case 'csv':
      return 'lucide:table-2';
    case 'txt':
      return 'lucide:file';
    default:
      return 'lucide:file-text';
  }
});

const fileSizeLabel = computed(() => {
  const size = props.data.fileSize;
  return formatBytes(size);
});

const description = computed(() => {
  if (props.data.error) {
    return props.data.error;
  }

  return `Preview available before download`;
});

const handleDownload = async () => {
  await downloadFile(props.data);
};
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-4 text-left transition-colors hover:bg-muted/35"
    :class="
      props.data.error ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
    "
    :disabled="!!props.data.error"
    @click="handleOpenPreview"
  >
    <div class="flex items-center min-w-0 gap-2 flex-1">
      <Icon
        name="hugeicons:document-attachment"
        class="size-5! shrink-0 text-foreground"
      />
      <div class="flex flex-col">
        <h3 class="truncate text-sm leading-4 font-normal text-foreground">
          {{ props.data.filename }}
        </h3>

        <p
          v-if="props.data.preview.truncated"
          class="text-xxs text-muted-foreground truncate shrink-0"
        >
          First {{ props.data.preview.rows.length }} rows
        </p>
        <p v-else class="text-xxs text-muted-foreground truncate shrink-0">
          size: {{ fileSizeLabel }} • type: {{ props.data.format }}
        </p>
      </div>
    </div>

    <Button :disabled="!!props.data.error" size="xs" variant="outline">
      view <Icon name="lucide:eye" class="size-3" />
    </Button>

    <Button
      @click.stop="handleDownload"
      :disabled="!!props.data.error"
      size="xs"
      variant="outline"
    >
      Download <Icon name="lucide:download" class="size-3" />
    </Button>
  </button>
</template>
