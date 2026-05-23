<script setup lang="ts">
import { Icon } from '#components';
import type { ICellRendererParams } from 'ag-grid-community';

interface Params {
  isPrimaryKey: boolean;
  onOpenPreviewReverseTableModal: (id: string) => void;
}

defineProps<{
  params: ICellRendererParams & Params;
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <span class="truncate">
      {{ params?.formatValue?.(params.value) || params.value }}</span
    >

    <Icon
      v-if="params.isPrimaryKey && params.value"
      @click="
        () => {
          params.onOpenPreviewReverseTableModal(params.value);
        }
      "
      name="hugeicons:view"
      class="min-w-4 w-4! cursor-pointer hover:bg-amber-500"
    />
  </div>
</template>
