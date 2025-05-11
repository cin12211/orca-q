<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useTableQueryBuilder } from '~/composables/useTableQueryBuilder';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { copyRowsToClipboard } from '~/utils/common';
import { buildUpdateStatements } from '~/utils/quickQuery';
import { buildDeleteStatements } from '~/utils/quickQuery/buildDeleteStatements';
import { buildInsertStatements } from '~/utils/quickQuery/buildInsertStatements';
import { EDatabaseType } from '../management-connection/constants';
import QuickQueryErrorPopup from './QuickQueryErrorPopup.vue';
import PreviewSelectedRow from './preview/PreviewSelectedRow.vue';
import QuickQueryControlBar from './quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from './quick-query-filter/QuickQueryFilter.vue';
import QuickQueryContextMenu from './quick-query-table/QuickQueryContextMenu.vue';
import QuickQueryTable from './quick-query-table/QuickQueryTable.vue';

definePageMeta({
  keepalive: false,
});

const props = defineProps<{ tableId: string }>();

const { connectionStore } = useAppContext();

const quickQueryFilterRef = ref<InstanceType<typeof QuickQueryFilter>>();
const quickQueryTableRef = ref<InstanceType<typeof QuickQueryTable>>();
const isMutating = ref(false);
const selectedRows = ref<Record<string, any>[]>([]);

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

const hasEditedRows = computed(() => {
  let totalEditedRows = 0;

  quickQueryTableRef.value?.editedCells.forEach(cell => {
    if (Object.keys(cell.changedData).length) {
      totalEditedRows++;
    }
  });

  return !!totalEditedRows;
});

const onRefresh = async () => {
  const gridApi = quickQueryTableRef.value?.gridApi;

  if (!gridApi) {
    return;
  }

  gridApi?.deselectAll();
  gridApi?.clearFocusedCell();

  refreshCount();
  refreshTableData();
};

const onSelectedRowsChange = (rows: Record<string, any>[]) => {
  selectedRows.value = rows;
};

const onSaveData = async () => {
  if (!data.value || !quickQueryTableRef.value?.editedCells?.length) {
    return;
  }

  const editedCells = quickQueryTableRef.value?.editedCells;

  const tableName = props.tableId;

  const sqlBulkInsertOrUpdateStatements: string[] = [];

  editedCells.forEach(cell => {
    const haveDifferent = !!Object.keys(cell.changedData).length;

    const rowData = data.value?.[cell.rowId];

    const isUpdateStatement = haveDifferent && rowData;
    const isInsertStatement = haveDifferent && !rowData;

    if (isUpdateStatement) {
      const sqlUpdateStatement = buildUpdateStatements({
        tableName: tableName,
        update: cell.changedData,
        pKeys: primaryKeys.value,
        pKeyValue: rowData,
      });

      sqlBulkInsertOrUpdateStatements.push(sqlUpdateStatement);
    }

    if (isInsertStatement) {
      const sqlInsertStatement = buildInsertStatements({
        tableName: tableName,
        insertData: cell.changedData,
      });

      sqlBulkInsertOrUpdateStatements.push(sqlInsertStatement);
    }
  });

  if (!sqlBulkInsertOrUpdateStatements.length) {
    return;
  }

  isMutating.value = true;

  await $fetch('/api/execute-bulk-update', {
    method: 'POST',
    body: {
      sqlUpdateStatements: sqlBulkInsertOrUpdateStatements,
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
    },
    onResponseError({ response }) {
      openErrorModal.value = true;

      console.log('response?._data', response?._data);

      errorMessage.value = response?._data?.message;
    },
    onResponse: ({ response }) => {
      if (response.ok) {
        if (quickQueryTableRef.value?.editedCells) {
          quickQueryTableRef.value.editedCells = [];
        }

        onRefresh();
      }
    },
  }).finally(() => {
    isMutating.value = false;
  });

  isMutating.value = false;
};

const onDeleteRows = async () => {
  const sqlDeleteStatements: string[] = [];

  selectedRows.value.forEach(row => {
    const sqlDeleteStatement = buildDeleteStatements({
      tableName: props.tableId,
      pKeys: primaryKeys.value,
      pKeyValue: row,
    });

    sqlDeleteStatements.push(sqlDeleteStatement);
  });

  isMutating.value = true;

  await $fetch('/api/execute-bulk-delete', {
    method: 'POST',
    body: {
      sqlDeleteStatements,
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
    },
    onResponseError({ response }) {
      openErrorModal.value = true;
      errorMessage.value = response?._data?.message;
    },
    onResponse: ({ response }) => {
      if (response.ok) {
        const isDeleteAllRowsInPage =
          selectedRows.value?.length === data.value?.length;

        if (isDeleteAllRowsInPage && pagination.offset > 0) {
          const newOffset = pagination.offset - pagination.limit;

          pagination.offset = newOffset > 0 ? newOffset : 0;
        }

        onRefresh();
      }
    },
  }).finally(() => {
    isMutating.value = false;
  });
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
};

const onCopyRows = () => {
  const rows = selectedRows.value;

  if (!rows) {
    return;
  }

  const mappedRows = rows.map(row => {
    const index = (row?.['#'] || 1) - 1;

    return data.value?.[index];
  }) as Record<string, any>[];

  copyRowsToClipboard(mappedRows);
};

//TODO: make paste rows , in current cellIndex
const onPasteRows = async () => {
  const gridApi = quickQueryTableRef.value?.gridApi;

  if (!gridApi) {
    return;
  }

  const currentCell = gridApi.getFocusedCell();

  if (!currentCell) {
    return;
  }

  const rowIndex = currentCell?.rowIndex;
  const columnName = currentCell?.column?.getColId();

  const clipboardData = await navigator.clipboard.readText();

  console.log(
    '🚀 ~ onPasteRows ~ currentCell:',
    columnName,
    rowIndex,
    clipboardData
  );
};
</script>

<template>
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
    <LoadingOverlay :visible="tableSchemaStatus === 'pending' || isMutating" />

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

    <div class="flex-1 overflow-hidden">
      <QuickQueryContextMenu
        :total-selected-rows="selectedRows.length"
        :has-edited-rows="hasEditedRows"
        @onPaginate="onUpdatePagination"
        @onNextPage="onNextPage"
        @onPreviousPage="onPreviousPage"
        @onRefresh="onRefresh"
        @onSaveData="onSaveData"
        @onDeleteRows="onDeleteRows"
        @onAddEmptyRow="onAddEmptyRow"
        @onShowFilter="
          async () => {
            await quickQueryFilterRef?.onShowSearch();
          }
        "
        @onCopyRows="onCopyRows"
        @on-paste-rows="onPasteRows"
      >
        <QuickQueryTable
          class="h-full"
          ref="quickQueryTableRef"
          :data="data || []"
          :orderBy="orderBy"
          @on-selected-rows="onSelectedRowsChange"
          @update:order-by="onUpdateOrderBy"
          :foreignKeys="foreignKeys"
          :primaryKeys="primaryKeys"
          :columnTypes="columnTypes"
          :defaultPageSize="DEFAULT_QUERY_SIZE"
          :offset="pagination.offset"
        />
      </QuickQueryContextMenu>
    </div>

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
      @onRefresh="onRefresh"
      @onSaveData="onSaveData"
      @onDeleteRows="onDeleteRows"
      @onAddEmptyRow="onAddEmptyRow"
      @onShowFilter="
        async () => {
          await quickQueryFilterRef?.onShowSearch();
        }
      "
    />
  </div>
</template>
