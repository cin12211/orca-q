<script setup lang="ts">
import QuickQueryTableSummary from '~/components/modules/quick-query/quick-query-table-summary/QuickQueryTableSummary.vue';
import { useTableQueryBuilder } from '~/core/composables/useTableQueryBuilder';
import { DEFAULT_QUERY_SIZE } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import WrapperErdDiagram from '../erd-diagram/WrapperErdDiagram.vue';
import { buildTableNodeId } from '../erd-diagram/utils';
import QuickQueryErrorPopup from './QuickQueryErrorPopup.vue';
import SafeModeConfirmDialog from './SafeModeConfirmDialog.vue';
import { QuickQueryTabView } from './constants';
import {
  useQuickQueryContextCellFilter,
  useQuickQuery,
  useQuickQueryMutation,
  useQuickQueryPreviewRelations,
  useQuickQueryShortcuts,
  useQuickQueryTableColumns,
  useQuickQueryTableInfo,
  useQuickQueryTabs,
  useQuickQueryTeleport,
  useReferencedTables,
  useSafeModeDialog,
} from './hooks';
import PreviewSelectedRow from './preview/PreviewSelectedRow.vue';
import PreviewRelationTable from './previewRelationTable/PreviewRelationTable.vue';
import QuickQueryControlBar from './quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from './quick-query-filter/QuickQueryFilter.vue';
import QuickQueryHistoryLogsPanel from './quick-query-history-log-panel/QuickQueryHistoryLogsPanel.vue';
import QuickQueryContextMenu from './quick-query-table/QuickQueryContextMenu.vue';
import QuickQueryTable from './quick-query-table/QuickQueryTable.vue';
import StructureTable from './structure/StructureTable.vue';

const props = defineProps<{
  connectionId: string;
  workspaceId: string;
  tableName: string;
  schemaName: string;
  tabViewType?: any;
  virtualTableId?: string;
}>();

const appConfigStore = useAppConfigStore();
const connectionStore = useManagementConnectionStore();

const connectionString = computed(() => {
  const connection = connectionStore.connections.find(
    c => c.id === props.connectionId
  );
  return connection?.connectionString || '';
});

const currentDbType = computed(
  () => connectionStore.selectedConnection?.type || DatabaseClientType.POSTGRES
);

const tableName = computed(() => props.tableName);
const schemaName = computed(() => props.schemaName);

const containerRef = ref<InstanceType<typeof HTMLElement>>();
const {
  previewRelationBreadcrumbs,
  onOpenBackReferencedTableModal,
  onOpenForwardReferencedTableModal,
  onUpdateSelectedTabInBreadcrumb,
  onClearBreadcrumbs,
  onBackPreviousBreadcrumb,
  onBackPreviousBreadcrumbByIndex,
} = useQuickQueryPreviewRelations();

const {
  onRequestSafeModeConfirm,
  onSafeModeCancel,
  onSafeModeConfirm,
  safeModeDialogOpen,
  safeModeDialogSql,
  safeModeDialogType,
  isDangerous,
} = useSafeModeDialog();

const { quickQueryFilterRef, quickQueryTableRef, selectedRows, focusedCell } =
  useQuickQuery();

const {
  columnNames,
  foreignKeys,
  primaryKeyColumns,
  tableMetaData,
  columnTypes,
  foreignKeyColumns,
  isVirtualTable,
} = useQuickQueryTableInfo({
  tableName: tableName.value,
  schemaName: schemaName.value,
  connectionId: props.connectionId,
  tabViewType: props.tabViewType,
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
  onChangeComposeWith,
  composeWith,
  isFetchingTableData,
} = useTableQueryBuilder({
  connection: toRef(connectionStore, 'selectedConnection'),
  primaryKeys: primaryKeyColumns,
  columns: columnNames,
  connectionId: computed(() => props.connectionId),
  workspaceId: computed(() => props.workspaceId),
  tableName: tableName.value,
  schemaName: schemaName.value,
});

watch(
  tableMetaData,
  newSchema => {
    if (newSchema?.columns && newSchema.columns.length > 0) {
      refreshCount();
      refreshTableData();
    }
  },
  { deep: true, immediate: true }
);

const {
  isMutating,
  onAddEmptyRow,
  onDiscardChanges,
  onDeleteRows,
  onSaveData,
  hasEditedRows,
  pendingChangesCount,
  onCopyRows,
  onPasteRows,
  onRefresh,
  onSelectedRowsChange,
  onCopySelectedCell,
  onFocusedCellChange,
} = useQuickQueryMutation({
  tableName: tableName.value,
  schemaName: schemaName.value,
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
  focusedCell,
  safeModeEnabled: toRef(appConfigStore, 'quickQuerySafeModeEnabled'),
  onRequestSafeModeConfirm,
  connection: toRef(connectionStore, 'selectedConnection'),
});

const { handleSelectColumn, selectedColumnFieldId, resetGridState } =
  useTableActions({
    quickQueryTableRef,
  });

const { quickQueryTabView, openedQuickQueryTab } = useQuickQueryTabs({
  onTabChanged: newQuickQueryTabView => {
    if (newQuickQueryTabView !== QuickQueryTabView.Data) {
      appConfigStore.onCloseBottomPanel();
    }
  },
});

const { isActiveTeleport } = useQuickQueryTeleport();

const { onAddFilterByContextCell } = useQuickQueryContextCellFilter({
  quickQueryFilterRef,
  quickQueryTableRef,
  columnTypes,
  filters,
  onApplyNewFilter,
});

const { isHaveRelationByFieldName } = useReferencedTables({
  schemaName: schemaName.value,
  tableName: tableName.value,
});

const isSkipShortcut = computed(
  () => previewRelationBreadcrumbs.value.length > 0
);

const isViewOnly = computed(() => isVirtualTable.value);

useQuickQueryShortcuts({
  containerRef,
  quickQueryFilterRef,
  quickQueryTableRef,
  isSkipShortcut,
  isViewOnly,
  onCopySelectedCell,
  onPasteRows,
  onSaveData,
  onDeleteRows,
});

const { columns } = useQuickQueryTableColumns(quickQueryTableRef);
</script>

<template>
  <PreviewRelationTable
    v-if="!!previewRelationBreadcrumbs.length"
    :open="previewRelationBreadcrumbs.length > 0"
    :breadcrumbs="previewRelationBreadcrumbs"
    :currentTableName="tableName"
    :connectionId="connectionId"
    :workspaceId="workspaceId"
    :rootSchemaName="schemaName"
    @clear-breadcrumb="onClearBreadcrumbs"
    @onOpenBackReferencedTableModal="onOpenBackReferencedTableModal"
    @onOpenForwardReferencedTableModal="onOpenForwardReferencedTableModal"
    @onUpdateSelectedTabInBreadcrumb="onUpdateSelectedTabInBreadcrumb"
    @onBackPreviousBreadcrumb="onBackPreviousBreadcrumb"
    @onBackPreviousBreadcrumbByIndex="onBackPreviousBreadcrumbByIndex"
  />

  <SafeModeConfirmDialog
    v-model:open="safeModeDialogOpen"
    :sql="safeModeDialogSql"
    :type="safeModeDialogType"
    :dangerous="isDangerous"
    @confirm="onSafeModeConfirm"
    @cancel="onSafeModeCancel"
  />

  <Teleport defer to="#preview-select-row" v-if="isActiveTeleport">
    <QuickQueryTableSummary
      v-if="
        selectedRows?.length !== 1 ||
        quickQueryTabView !== QuickQueryTabView.Data
      "
      :table-name="tableName"
      :schema-name="schemaName"
      :columns="columns"
      :columnTypes="columnTypes"
      :selectedColumnFieldId="selectedColumnFieldId"
      :handleSelectColumn="handleSelectColumn"
      @reset-selected-col="resetGridState"
    />
    <PreviewSelectedRow
      v-else
      :columnTypes="columnTypes"
      :selectedRow="selectedRows?.length ? selectedRows[0] : null"
    />
  </Teleport>

  <Teleport defer to="#bottom-panel" v-if="isActiveTeleport">
    <QuickQueryHistoryLogsPanel
      :tableName="tableName"
      :schema-name="schemaName"
    />
  </Teleport>

  <QuickQueryErrorPopup
    v-model:open="openErrorModal"
    :message="errorMessage || ''"
  />

  <div
    ref="containerRef"
    class="flex flex-col h-full w-full relative"
    tabindex="0"
  >
    <LoadingOverlay :visible="isMutating || isFetchingTableData" />

    <div class="px-1">
      <QuickQueryControlBar
        :total-selected-rows="selectedRows?.length"
        :isAllowNextPage="isAllowNextPage"
        :isAllowPreviousPage="isAllowPreviousPage"
        :totalRows="totalRows"
        :limit="pagination.limit"
        :currentTotalRows="data?.length || 0"
        :offset="pagination.offset"
        :has-edited-rows="hasEditedRows"
        :pending-changes-count="pendingChangesCount"
        :isViewVirtualTable="isVirtualTable"
        @onPaginate="onUpdatePagination"
        @onNextPage="onNextPage"
        @onPreviousPage="onPreviousPage"
        @onRefresh="onRefresh"
        @onDiscardChanges="onDiscardChanges"
        @onSaveData="onSaveData"
        @onDeleteRows="onDeleteRows"
        @onAddEmptyRow="onAddEmptyRow"
        @onShowFilter="
          () => {
            quickQueryFilterRef?.onShowSearch();
          }
        "
        @onToggleHistoryPanel="appConfigStore.onToggleBottomPanel"
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
        :dbType="currentDbType"
        :composeWith="composeWith"
        @onChangeComposeWith="onChangeComposeWith"
      />
    </div>

    <div class="flex-1 overflow-hidden px-1 mb-0.5">
      <WrapperErdDiagram
        v-if="openedQuickQueryTab[QuickQueryTabView.Erd]"
        v-show="quickQueryTabView === QuickQueryTabView.Erd"
        :tableId="buildTableNodeId({ tableName, schemaName })"
      />

      <div
        v-if="openedQuickQueryTab[QuickQueryTabView.Structure]"
        v-show="quickQueryTabView === QuickQueryTabView.Structure"
        class="h-full"
      >
        <StructureTable
          :isVirtualTable="isVirtualTable"
          :schema="schemaName"
          :tableName="tableName"
          :connectionString="connectionString"
          :virtualTableId="props.virtualTableId"
        />
      </div>

      <QuickQueryContextMenu
        v-show="quickQueryTabView === QuickQueryTabView.Data"
        :data="data"
        :total-selected-rows="selectedRows.length"
        :has-edited-rows="hasEditedRows"
        :cellContextMenu="quickQueryTableRef?.cellContextMenu"
        :cellHeaderContextMenu="quickQueryTableRef?.cellHeaderContextMenu"
        :selectedRows="selectedRows"
        :table-name="tableName"
        :schema-name="schemaName"
        @onClearContextMenu="quickQueryTableRef?.clearCellContextMenu()"
        @onPaginate="onUpdatePagination"
        @onNextPage="onNextPage"
        @onPreviousPage="onPreviousPage"
        @onRefresh="onRefresh"
        @onSaveData="onSaveData"
        @onDeleteRows="onDeleteRows"
        @onAddEmptyRow="onAddEmptyRow"
        @onFilterByValue="onAddFilterByContextCell"
        @onCopyRows="onCopyRows"
        @on-paste-rows="onPasteRows"
        @on-copy-selected-cell="onCopySelectedCell"
      >
        <QuickQueryTable
          class="h-full border rounded-md"
          ref="quickQueryTableRef"
          :selected-rows="selectedRows"
          :data="data || []"
          :orderBy="orderBy"
          @on-selected-rows="onSelectedRowsChange"
          @update:order-by="onUpdateOrderBy"
          @onOpenBackReferencedTableModal="onOpenBackReferencedTableModal"
          @onOpenForwardReferencedTableModal="onOpenForwardReferencedTableModal"
          :isHaveRelationByFieldName="isHaveRelationByFieldName"
          :foreignKeyColumns="foreignKeyColumns"
          :foreignKeys="foreignKeys"
          :primaryKeyColumns="primaryKeyColumns"
          :columnTypes="columnTypes"
          :defaultPageSize="DEFAULT_QUERY_SIZE"
          :offset="pagination.offset"
          @on-focus-cell="onFocusedCellChange"
          :selectedColumnFieldId="selectedColumnFieldId"
          :current-schema-name="schemaName"
          :current-table-name="tableName"
          :isViewOnly="isViewOnly"
        />
      </QuickQueryContextMenu>
    </div>
  </div>
</template>
