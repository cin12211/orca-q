<script setup lang="ts">
import type { CellContextMenuEvent } from 'ag-grid-community';
import BaseDataGridCopyContextMenu from '~/components/base/data-grid/components/BaseDataGridCopyContextMenu.vue';
import type { RowData } from '~/components/base/data-grid/utils';

const props = defineProps<{
  cellContextMenu?: CellContextMenuEvent;
  cellHeaderContextMenu?: CellContextMenuEvent;
  data?: RowData[];
  selectedRows: RowData[];
  tableName?: string;
  schemaName?: string;
}>();

const emit = defineEmits<{
  (e: 'onClearContextMenu'): void;
}>();
</script>

<template>
  <BaseDataGridCopyContextMenu
    :cell-context-menu="cellContextMenu"
    :cell-header-context-menu="cellHeaderContextMenu"
    :data="data"
    :selected-rows="selectedRows"
    :table-name="tableName"
    :schema-name="schemaName"
    @on-clear-context-menu="emit('onClearContextMenu')"
  >
    <slot />
  </BaseDataGridCopyContextMenu>
</template>
