<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useTableQueryBuilder } from '~/composables/useTableQueryBuilder';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { buildUpdateQuery, findDifferentChange } from '~/utils/quickQuery';
import { EDatabaseType } from '../management-connection/constants';
import QuickQueryErrorPopup from './QuickQueryErrorPopup.vue';
import PreviewSelectedRow from './preview/PreviewSelectedRow.vue';
import QuickQueryControlBar from './quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from './quick-query-filter/QuickQueryFilter.vue';
import QuickQueryTable from './quick-query-table/QuickQueryTable.vue';

//TODO: note for Nhat : when view detail ERD of once table , in related table have option show this table's related
// ví dụ , xem user -> link tới position , profile , comment,
// thì khi click vào bảng position có option xem related của position -> add thêm table for ERD

definePageMeta({
  keepalive: false,
});

const props = defineProps<{ tableId: string }>();

const { connectionStore } = useAppContext();

const quickQueryFilterRef = ref<InstanceType<typeof QuickQueryFilter>>();
const quickQueryTableRef = ref<InstanceType<typeof QuickQueryTable>>();

const { data: tableSchema, status: tableSchemaStatus } = await useFetch(
  '/api/get-one-table',
  {
    method: 'POST',
    body: {
      tableName: props.tableId,
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
    },
    key: `schema-${props.tableId}`,
    onResponseError({ response }) {
      toast(response?.statusText);
    },
  }
);

const columnNames = computed(() => {
  return tableSchema.value?.columns?.map(c => c.name) || [];
});

const foreignKeys = computed(() =>
  (tableSchema.value?.foreign_keys || []).map(fk => fk.column)
);

const primaryKeys = computed(() =>
  (tableSchema.value?.primary_keys || []).map(fk => fk.column)
);

const {
  onApplyNewFilter,
  data,
  baseQueryString,
  refreshTableData,
  refreshCount,
  isAllowNextPage,
  isAllowPreviousPage,
  onNextPage,
  onPreviousPage,
  onUpdatePagination,
  totalRows,
  pagination,
  errorMessage,
  openErrorModal,
  orderBy,
  onUpdateOrderBy,
} = await useTableQueryBuilder({
  connectionString: connectionStore.selectedConnection?.connectionString || '',
  tableName: props.tableId,
  primaryKeys: primaryKeys.value,
});

const selectedRows = ref<Record<string, any>[]>([]);

watch(
  tableSchema,
  newSchema => {
    if (newSchema) {
      refreshCount();
      refreshTableData();
    }
  },
  { deep: 1, immediate: true, once: true }
);

const columnTypes = computed(() => {
  return (
    tableSchema.value?.columns?.map(c => ({
      name: c.name,
      type: c.short_type_name,
    })) || []
  );
});

const onSelectedRowsChange = (rows: Record<string, any>[]) => {
  selectedRows.value = rows;
};

const onSaveData = async () => {
  console.log('selectedRows.value', quickQueryTableRef.value?.editedCells);

  const editedCells = quickQueryTableRef.value?.editedCells;
  if (!editedCells?.length || !data.value) {
    return;
  }

  const tableName = props.tableId;

  const sqlBulkUpdateStatements: string[] = [];

  editedCells.forEach(cell => {
    const haveDifferent = !!Object.keys(cell.changedData).length;

    const rowData = data.value?.[cell.rowId];

    if (haveDifferent && rowData) {
      const sqlUpdateStatement = buildUpdateQuery({
        tableName: tableName,
        update: cell.changedData,
        pKeys: primaryKeys.value,
        pKeyValue: rowData,
      });

      sqlBulkUpdateStatements.push(sqlUpdateStatement);
    }
  });

  if (!sqlBulkUpdateStatements.length) {
    return;
  }

  await $fetch('/api/execute-bulk-update', {
    method: 'POST',
    body: {
      sqlUpdateStatements: sqlBulkUpdateStatements,
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
    },
    onResponseError({ response }) {
      openErrorModal.value = true;

      errorMessage.value = response?._data?.message;

      toast(response?.statusText);
    },
  });

  refreshTableData();
};

const onDeleteRows = async () => {
  console.log('onDeleteRows');
};

const onAddEmptyRow = () => {
  const gridApi = quickQueryTableRef.value?.gridApi;

  if (!gridApi) {
    return;
  }

  let totalRows = 0;
  gridApi.forEachNode(() => totalRows++);

  const addIndex = totalRows;

  const node = {
    '#': addIndex + 1,
    ...Object.fromEntries(columnNames.value.map(name => [name, undefined])),
  };

  gridApi!.applyTransaction({
    add: [node],
    addIndex,
  })!;

  gridApi.setFocusedCell(addIndex, columnNames.value[0]);

  const currentAddedRow = gridApi.getRowNode(addIndex.toString());

  if (currentAddedRow) {
    gridApi.deselectAll();
    currentAddedRow.setSelected(true);
  }

  console.log('addEmptyRow', currentAddedRow);
};

const hasEditedRows = computed(() => {
  let totalEditedRows = 0;

  quickQueryTableRef.value?.editedCells.forEach(cell => {
    if (Object.keys(cell.changedData).length) {
      totalEditedRows++;
    }
  });

  return !!totalEditedRows;
});
</script>

<template>
  <!-- TODO: add menu context for table -->
  <!-- TODO: Allow delete , delete many -->
  <!-- TODO: Allow add row  -->
  <!-- TODO: Allow edit row  -->
  <!-- TODO: sync data when edit to row table -->
  <!-- TODO: allow save data in control bar -> sync button -> trigger call api -->
  <Teleport defer to="#preview-select-row">
    <PreviewSelectedRow
      :columnTypes="columnTypes"
      :selectedRow="selectedRows?.length ? selectedRows[0] : null"
  /></Teleport>

  <QuickQueryErrorPopup
    v-model:open="openErrorModal"
    :message="errorMessage || ''"
  />

  <div class="flex flex-col h-full w-full relative p-2">
    <!-- <LoadingOverlay :visible="status === 'pending'" /> -->
    <LoadingOverlay :visible="tableSchemaStatus === 'pending'" />
    <TableSkeleton v-if="tableSchemaStatus === 'pending'" />

    <QuickQueryFilter
      ref="quickQueryFilterRef"
      @onSearch="
        whereClause => {
          console.log('🚀 ~ whereClause:', whereClause);

          onApplyNewFilter(whereClause);
        }
      "
      :baseQuery="baseQueryString"
      :columns="columnNames"
      :dbType="EDatabaseType.PG"
    />

    <QuickQueryTable
      ref="quickQueryTableRef"
      :data="data || []"
      :orderBy="orderBy"
      @on-selected-rows="onSelectedRowsChange"
      @update:order-by="onUpdateOrderBy"
      class="h-fit max-h-full"
      :foreignKeys="foreignKeys"
      :primaryKeys="primaryKeys"
      :columnTypes="columnTypes"
      :defaultPageSize="DEFAULT_QUERY_SIZE"
      :offset="pagination.offset"
    />

    <QuickQueryControlBar
      :total-selected-rows="selectedRows?.length"
      :isAllowNextPage="isAllowNextPage"
      :isAllowPreviousPage="isAllowPreviousPage"
      :totalRows="totalRows"
      :limit="pagination.limit"
      :currentTotalRows="data?.length || 0"
      :offset="pagination.offset"
      :has-edited-rows="hasEditedRows"
      @onPaginate="onUpdatePagination"
      @onNextPage="onNextPage"
      @onPreviousPage="onPreviousPage"
      @onRefresh="refreshTableData"
      @onSaveData="onSaveData"
      @onDeleteRows="onDeleteRows"
      @onAddEmptyRow="onAddEmptyRow"
      @on-show-filter="
        async () => {
          await quickQueryFilterRef?.onShowSearch();
        }
      "
    />
  </div>
</template>
