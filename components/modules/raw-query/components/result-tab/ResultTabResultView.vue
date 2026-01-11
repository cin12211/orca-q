<script setup lang="ts">
import type DynamicTable from '~/components/base/dynamic-table/DynamicTable.vue';
import type { RowData } from '~/components/base/dynamic-table/utils';
import type { ExecutedResultItem } from '../../hooks/useRawQueryEditor';
import type { MappedRawColumn } from '../../interfaces';
import RawQueryContextMenu from '../RawQueryContextMenu.vue';

const props = defineProps<{
  activeTab: ExecutedResultItem;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, any>[];
}>();

const rawQueryTableRef = ref<InstanceType<typeof DynamicTable>>();

// Selected rows for context menu
const selectedRows = ref<Record<string, any>[]>([]);

const onSelectedRowsChange = (rows: unknown[]) => {
  selectedRows.value = rows as Record<string, any>[];
};

const formattedSelectedRows = computed(() => {
  const fieldDefs = props.activeTab?.metadata.fieldDefs || [];
  return (
    selectedRows.value?.map?.(item => {
      const mappedItem: Record<string, any> = {};
      for (const [key, value] of Object.entries(item)) {
        const fieldDef = fieldDefs[Number(key)];
        const columnName = fieldDef?.name || '';
        if (columnName) {
          mappedItem[columnName] = value;
        }
      }
      return mappedItem;
    }) || []
  );
});
</script>

<template>
  <div class="h-full w-full">
    <RawQueryContextMenu
      :data="formattedData || []"
      :selectedRows="formattedSelectedRows || []"
      :cellContextMenu="rawQueryTableRef?.cellContextMenu"
      :cellHeaderContextMenu="rawQueryTableRef?.cellHeaderContextMenu"
      @onClearContextMenu="rawQueryTableRef?.clearCellContextMenu()"
    >
      <DynamicTable
        ref="rawQueryTableRef"
        :columns="activeTabColumns"
        :data="(activeTab.result as RowData[]) || []"
        :selectedRows="selectedRows"
        @on-selected-rows="onSelectedRowsChange"
        class="h-full"
        skip-re-column-size
        columnKeyBy="index"
      />
    </RawQueryContextMenu>
  </div>
</template>
