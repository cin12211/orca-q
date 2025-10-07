<script setup lang="ts">
import { LoadingOverlay } from '#components';
import { useTableQueryBuilder } from '~/composables/useTableQueryBuilder';
import { ComposeOperator, DEFAULT_QUERY_SIZE } from '~/utils/constants';
import type { FilterSchema } from '~/utils/quickQuery';
import WrapperErdDiagram from '../../erd-diagram/WrapperErdDiagram.vue';
import { EDatabaseType } from '../../management-connection/constants';
import QuickQueryErrorPopup from '../QuickQueryErrorPopup.vue';
import { QuickQueryTabView } from '../constants';
import {
  useQuickQuery,
  useQuickQueryMutation,
  useQuickQueryTableInfo,
  useReferencedTables,
} from '../hooks';
import QuickQueryControlBar from '../quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from '../quick-query-filter/QuickQueryFilter.vue';
import QuickQueryContextMenu from '../quick-query-table/QuickQueryContextMenu.vue';
import QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';
import StructureTable from '../structure/StructureTable.vue';

const props = defineProps<{
  tableName: string;
  schemaName: string;
  initFilters?: FilterSchema[];
}>();

const emit = defineEmits<{
  (
    e: 'onOpenBackReferencedTableModal',
    value: {
      id: string;
      tableName: string;
      columnName: string;
      schemaName: string;
    }
  ): void;
  (
    e: 'onOpenForwardReferencedTableModal',
    value: {
      id: string;
      tableName: string;
      columnName: string;
      schemaName: string;
    }
  ): void;
}>();

const {
  quickQueryFilterRef,
  quickQueryTableRef,
  selectedRows,
  connectionString,
  connectionId,
  workspaceId,
} = useQuickQuery();

const {
  columnNames,
  foreignKeys,
  primaryKeyColumns,
  isLoadingTableSchema,
  tableMetaData,
  columnTypes,
  foreignKeyColumns,
} = useQuickQueryTableInfo({
  tableName: props.tableName,
  schemaName: props.schemaName,
  connectionId: connectionId.value,
});

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
  addHistoryLog,
  filters,
  isShowFilters,
  composeWith,
  onChangeComposeWith,
  isFetchingTableData,
} = useTableQueryBuilder({
  connectionString,
  primaryKeys: primaryKeyColumns,
  columns: columnNames,
  connectionId,
  workspaceId,
  tableName: props.tableName,
  schemaName: props.schemaName,
  isPersist: false,
  initFilters: props?.initFilters || [],
  initComposeWith: ComposeOperator.OR,
});

watch(
  tableMetaData,
  newSchema => {
    if (newSchema) {
      filters.value = props?.initFilters || [];
      refreshCount();
      refreshTableData();
    }
  },
  { deep: true, immediate: true }
);

const {
  isMutating,
  onAddEmptyRow,
  onDeleteRows,
  onSaveData,
  hasEditedRows,
  onCopyRows,
  onPasteRows,
  onRefresh,
  onSelectedRowsChange,
} = useQuickQueryMutation({
  tableName: props.tableName,
  primaryKeys: primaryKeyColumns,
  refreshTableData,
  columnNames,
  data,
  addHistoryLog,
  errorMessage,
  openErrorModal,
  selectedRows,
  pagination,
  quickQueryTableRef,
  refreshCount,
});

const quickQueryTabView = ref<QuickQueryTabView>(QuickQueryTabView.Data);

const { isHaveRelationByFieldName } = useReferencedTables({
  schemaName: props.schemaName,
  tableName: props.tableName,
});

const openedQuickQueryTab = ref({
  [QuickQueryTabView.Data]: true,
  [QuickQueryTabView.Structure]: false,
  [QuickQueryTabView.Erd]: false,
});

watch(quickQueryTabView, newQuickQueryTabView => {
  openedQuickQueryTab.value[newQuickQueryTabView] = true;
});
</script>

<template>
  <QuickQueryErrorPopup
    v-model:open="openErrorModal"
    :message="errorMessage || ''"
  />

  <div
    ref="containerRef"
    class="flex flex-col h-full w-full relative"
    tabindex="0"
  >
    <LoadingOverlay
      :visible="isLoadingTableSchema || isMutating || isFetchingTableData"
    />

    <div class="px-2 mb-2 border-b">
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
        v-model:tabView="quickQueryTabView"
      />
    </div>

    <div class="px-2">
      <QuickQueryFilter
        v-if="quickQueryTabView === QuickQueryTabView.Data"
        ref="quickQueryFilterRef"
        @onSearch="
          () => {
            onApplyNewFilter();
          }
        "
        @on-update-filters="
          newFilters => {
            filters = newFilters;
          }
        "
        v-model:isShowFilters="isShowFilters"
        :initFilters="filters"
        :baseQuery="baseQueryString"
        :columns="columnNames"
        :dbType="EDatabaseType.PG"
        :composeWith="composeWith"
        @onChangeComposeWith="onChangeComposeWith"
      />
    </div>

    <div class="flex-1 overflow-hidden px-2 mb-0.5">
      <WrapperErdDiagram
        v-if="openedQuickQueryTab[QuickQueryTabView.Erd]"
        v-show="quickQueryTabView === QuickQueryTabView.Erd"
        :tableId="tableName"
      />

      <div
        v-if="openedQuickQueryTab[QuickQueryTabView.Structure]"
        v-show="quickQueryTabView === QuickQueryTabView.Structure"
        class="h-full"
      >
        <StructureTable
          :schema="schemaName"
          :tableName="tableName"
          :connectionString="connectionString"
        />
      </div>

      <!-- @on-copy-selected-cell="onCopySelectedCell" -->
      <QuickQueryContextMenu
        v-show="quickQueryTabView === QuickQueryTabView.Data"
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
          class="h-full border rounded-md"
          ref="quickQueryTableRef"
          :data="data || []"
          :orderBy="orderBy"
          @on-selected-rows="onSelectedRowsChange"
          @update:order-by="onUpdateOrderBy"
          @onOpenBackReferencedTableModal="
            emit('onOpenBackReferencedTableModal', $event)
          "
          @onOpenForwardReferencedTableModal="
            emit('onOpenForwardReferencedTableModal', $event)
          "
          :isHaveRelationByFieldName="isHaveRelationByFieldName"
          :foreignKeyColumns="foreignKeyColumns"
          :foreignKeys="foreignKeys"
          :primaryKeyColumns="primaryKeyColumns"
          :columnTypes="columnTypes"
          :defaultPageSize="DEFAULT_QUERY_SIZE"
          :offset="pagination.offset"
          :current-schema-name="schemaName"
          :current-table-name="tableName"
        />
      </QuickQueryContextMenu>
    </div>
  </div>
</template>
