<script setup lang="ts">
import type DynamicTable from '~/components/base/dynamic-table/DynamicTable.vue';
import type { RowData } from '~/components/base/dynamic-table/utils';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ExecutedResultItem, MappedRawColumn } from '../../interfaces';
import { createCommandResultFactory } from '../../utils';
import RawQueryContextMenu from '../RawQueryContextMenu.vue';

const props = defineProps<{
  activeTab: ExecutedResultItem;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, any>[];
  executeLoading: boolean;
  isStreaming: boolean;
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
// TODO: refactor formattedData, formattedSelectedRows to optimize performance

const commandResult = computed(() => {
  return createCommandResultFactory(
    props.activeTab.metadata.command || '',
    props.activeTab.metadata.rowCount || 0,
    props.activeTab.metadata.connection?.type as DatabaseClientType
  );
});

const isMutation = computed(() => commandResult.value.isMutation);
const mutationMessage = computed(() => commandResult.value.message);
</script>

<template>
  <div class="h-full w-full">
    <BaseEmpty
      v-if="
        activeTab.result.length === 0 &&
        isMutation &&
        !executeLoading &&
        !isStreaming
      "
      :desc="mutationMessage"
      hiddenIcon
      class="h-full"
    />

    <BaseEmpty
      v-else-if="
        activeTab.result.length === 0 && !executeLoading && !isStreaming
      "
      title="No Results"
      desc="The query returned no records."
      class="h-full"
    />

    <RawQueryContextMenu
      v-else
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
