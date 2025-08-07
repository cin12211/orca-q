<script setup lang="ts">
import { LoadingOverlay } from '#components';
import { useTableQueryBuilder } from '~/composables/useTableQueryBuilder';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import { ComposeOperator, DEFAULT_QUERY_SIZE } from '~/utils/constants';
import type { FilterSchema } from '~/utils/quickQuery';
import { EDatabaseType } from '../../management-connection/constants';
import { QuickQueryTabView } from '../constants';
import {
  useQuickQuery,
  useQuickQueryMutation,
  useQuickQueryTableInfo,
  useReverseTables,
} from '../hooks';
import QuickQueryControlBar from '../quick-query-control-bar/QuickQueryControlBar.vue';
import QuickQueryFilter from '../quick-query-filter/QuickQueryFilter.vue';
import QuickQueryContextMenu from '../quick-query-table/QuickQueryContextMenu.vue';
import QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';
import PreviewReverseTable from './PreviewReverseTable.vue';

const props = defineProps<{
  tableName: string;
  schemaName: string;
  // recordId: string;
  // fkColumn?: string;
  initFilters?: FilterSchema[];
  breadcrumbs?: string[];
}>();

const previewReverseTableModal = reactive({
  open: false,
  recordId: '',
  columnName: '',
});

const containerRef = ref<InstanceType<typeof HTMLElement>>();

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
  primaryKeys,
  isLoadingTableSchema,
  tableSchema,
  columnTypes,
} = useQuickQueryTableInfo({
  tableName: props.tableName,
  schemaName: props.schemaName,
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
  primaryKeys: primaryKeys,
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
  tableSchema,
  newSchema => {
    if (newSchema) {
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

const appLayoutStore = useAppLayoutStore();

const tabView = ref<QuickQueryTabView>(QuickQueryTabView.Data);

const isActiveTeleport = ref(true);

onActivated(() => {
  isActiveTeleport.value = true;
});

onDeactivated(() => {
  isActiveTeleport.value = false;
});

const onOpenPreviewReverseTableModal = ({
  id,
  columnName,
}: {
  id: string;
  columnName: string;
}) => {
  previewReverseTableModal.open = true;
  previewReverseTableModal.recordId = id;
  previewReverseTableModal.columnName = columnName;
};

const { isHaveRelationByFieldName } = useReverseTables({
  schemaName: props.schemaName,
  tableName: props.tableName,
});
</script>

<template>
  <PreviewReverseTable
    v-model:open="previewReverseTableModal.open"
    :schemaName="props.schemaName"
    :tableName="props.tableName"
    :recordId="previewReverseTableModal.recordId"
    :columnName="previewReverseTableModal.columnName"
    v-if="previewReverseTableModal.open"
    :breadcrumbs="breadcrumbs"
  />

  <Teleport defer to="#preview-select-row" v-if="isActiveTeleport">
    <PreviewSelectedRow
      :columnTypes="columnTypes"
      :selectedRow="selectedRows?.length ? selectedRows[0] : null"
    />
  </Teleport>

  <Teleport defer to="#bottom-panel" v-if="isActiveTeleport">
    <QuickQueryHistoryLogsPanel
      :tableName="props.tableName"
      :schema-name="props.schemaName"
    />
  </Teleport>

  <QuickQueryErrorPopup
    v-model:open="openErrorModal"
    :message="errorMessage || ''"
  />

  <div ref="containerRef" class="flex flex-col h-full w-full relative">
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
        @onToggleHistoryPanel="appLayoutStore.onToggleBottomPanel"
        v-model:tabView="tabView"
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
        :composeWith="composeWith"
        @onChangeComposeWith="onChangeComposeWith"
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
          @onOpenPreviewReverseTableModal="onOpenPreviewReverseTableModal"
          :isHaveRelationByFieldName="isHaveRelationByFieldName"
          :foreignKeys="foreignKeys"
          :primaryKeys="primaryKeys"
          :columnTypes="columnTypes"
          :defaultPageSize="DEFAULT_QUERY_SIZE"
          :offset="pagination.offset"
        />
      </QuickQueryContextMenu>
    </div>
  </div>
</template>
