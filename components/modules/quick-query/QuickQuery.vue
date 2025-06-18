<script setup lang="ts">
import { ResizablePanelGroup } from '#components';
import { useTableQueryBuilder } from '~/composables/useTableQueryBuilder';
import { useQuickQueryLayout } from '~/shared/stores/useQuickQueryLayout';
import { DEFAULT_QUERY_SIZE } from '~/utils/constants';
import { EDatabaseType } from '../management-connection/constants';
import QuickQueryErrorPopup from './QuickQueryErrorPopup.vue';
import {
  useQuickQuery,
  useQuickQueryMutation,
  useQuickQueryTableInfo,
} from './hooks';
import PreviewSelectedRow from './preview/PreviewSelectedRow.vue';
import QuickQueryControlBar from './quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from './quick-query-filter/QuickQueryFilter.vue';
import QuickQueryHistoryLogsPanel from './quick-query-history-log-panel/QuickQueryHistoryLogsPanel.vue';
import QuickQueryContextMenu from './quick-query-table/QuickQueryContextMenu.vue';
import QuickQueryTable from './quick-query-table/QuickQueryTable.vue';

const props = defineProps<{ tableId: string }>();

const {
  quickQueryFilterRef,
  quickQueryTableRef,
  selectedRows,
  connectionString,
  connectionId,
  workspaceId,
  schemaId,
} = useQuickQuery();

const {
  columnNames,
  foreignKeys,
  primaryKeys,
  tableSchemaStatus,
  tableSchema,
  columnTypes,
} = await useQuickQueryTableInfo({
  tableId: props.tableId,
  schemaName: schemaId.value,
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
  historyLogs,
  isShowFilters,
} = await useTableQueryBuilder({
  connectionString: connectionString.value,
  tableName: props.tableId,
  primaryKeys: primaryKeys.value,
  columns: columnNames.value,
  connectionId: connectionId.value,
  schemaName: schemaId.value,
  workspaceId: workspaceId.value,
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
  tableId: props.tableId,
  primaryKeys,
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

const quickQueryLayoutStore = useQuickQueryLayout();
const { layoutSize } = toRefs(quickQueryLayoutStore);
</script>

<template>
  <ResizablePanelGroup
    @layout="quickQueryLayoutStore.onResizeLayout($event)"
    direction="vertical"
    id="quick-query-layout-group-1"
  >
    <ResizablePanel
      :default-size="layoutSize[0]"
      id="quick-query-layout-group-1-panel-1"
      key="quick-query-layout-group-1-panel-1"
    >
      <Teleport defer to="#preview-select-row">
        <PreviewSelectedRow
          :columnTypes="columnTypes"
          :selectedRow="selectedRows?.length ? selectedRows[0] : null"
      /></Teleport>

      <QuickQueryErrorPopup
        v-model:open="openErrorModal"
        :message="errorMessage || ''"
      />

      <div class="flex flex-col h-full w-full relative">
        <!-- <LoadingOverlay :visible="status === 'pending'" /> -->
        <LoadingOverlay
          :visible="tableSchemaStatus === 'pending' || isMutating"
        />

        <TableSkeleton v-if="tableSchemaStatus === 'pending'" />

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
            :isShowHistoryPanel="layoutSize[1] > 0"
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
            @onToggleHistoryPanel="quickQueryLayoutStore.toggleHistoryPanel"
          />
        </div>

        <div class="px-2">
          <QuickQueryFilter
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
          />
        </div>

        <div class="flex-1 overflow-hidden px-2 mb-0.5">
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
      </div>
    </ResizablePanel>
    <ResizableHandle
      class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
    />

    <ResizablePanel
      :min-size="5"
      :max-size="40"
      :default-size="layoutSize[1]"
      :collapsed-size="0"
      collapsible
      id="quick-query-layout-group-1-panel-2"
      key="quick-query-layout-group-1-panel-2"
    >
      <div class="flex flex-col flex-1 h-full px-2">
        <QuickQueryHistoryLogsPanel :logs="historyLogs" />
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
</template>
