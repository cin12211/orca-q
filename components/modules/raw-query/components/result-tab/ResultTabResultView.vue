<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import { HASH_INDEX_ID } from '~/components/base/data-grid/constants';
import { buildDynamicRowData } from '~/components/base/data-grid/utils';
import PreviewRelationTable from '~/components/modules/quick-query/previewRelationTable/PreviewRelationTable.vue';
import { useHotkeys } from '~/core/composables/useHotKeys';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores';
import {
  useRawQueryEditedCells,
  useRawQueryMutation,
  useRawQueryRelationPreview,
} from '../../hooks';
import type { ExecutedResultItem, MappedRawColumn } from '../../interfaces';
import {
  buildRawQueryColumnDefs,
  createCommandResultFactory,
  groupColumnsByTable,
  type RawQueryEditedCell,
  type RawQueryDirtyTracker,
} from '../../utils';
import RawQueryContextMenu from '../RawQueryContextMenu.vue';
import RawQueryResultControlBar from './RawQueryResultControlBar.vue';
import RawQueryUpdatePreviewDialog from './RawQueryUpdatePreviewDialog.vue';

const props = defineProps<{
  activeTab: ExecutedResultItem;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, any>[];
  executeLoading: boolean;
  isStreaming: boolean;
}>();

const rawQueryTableRef = ref<InstanceType<typeof BaseDataGrid>>();
const containerRef = ref<HTMLElement>();
const schemaStore = useSchemaStore();
const { reservedSchemas } = storeToRefs(schemaStore);

const selectedRows = ref<Record<string, any>[]>([]);

const onSelectedRowsChange = (rows: unknown[]) => {
  selectedRows.value = rows as Record<string, any>[];
};

const commandResult = computed(() =>
  createCommandResultFactory(
    props.activeTab.metadata.command || '',
    props.activeTab.metadata.rowCount || 0,
    props.activeTab.metadata.connection?.type as DatabaseClientType
  )
);

const isMutation = computed(() => commandResult.value.isMutation);
const mutationMessage = computed(() => commandResult.value.message);
const hasResultColumns = computed(() => props.activeTabColumns.length > 0);
const showNoResultsEmptyState = computed(
  () =>
    props.activeTab.result.length === 0 &&
    !hasResultColumns.value &&
    !props.executeLoading &&
    !props.isStreaming
);

const reservedTables = computed(() => {
  const connectionId = props.activeTab.metadata.connection?.id;
  if (!connectionId) return [];
  return reservedSchemas.value[connectionId] || [];
});

/* ------------------------------------------------------------------ *
 * Editability: enabled only when at least one column has a known
 * (schema, table) AND that table has a primary-key column in the
 * result so we can build a safe WHERE clause.
 * ------------------------------------------------------------------ */
const tableGroups = computed(() => groupColumnsByTable(props.activeTabColumns));

const isEditingEnabled = computed(() => {
  if (props.isStreaming) return false;
  for (const [, group] of tableGroups.value) {
    if (group.primaryKeyFields.length > 0) return true;
  }
  return false;
});

type RawQueryRow = Record<string, unknown>;

const cloneRawQueryRows = (rows: RawQueryRow[]): RawQueryRow[] =>
  rows.map(row => ({ ...row }));

const buildRawQueryRowData = (rows: RawQueryRow[]): RawQueryRow[] =>
  buildDynamicRowData(rows) as RawQueryRow[];

const stripGridMetaFromRows = (rows: RawQueryRow[]): RawQueryRow[] =>
  rows.map(row => {
    const { [HASH_INDEX_ID]: _hashIndex, ...dataRow } = row;
    return { ...dataRow };
  });

const mergeTrackedCells = (
  ...cellGroups: RawQueryEditedCell[][]
): RawQueryEditedCell[] => {
  const merged = new Map<string, RawQueryEditedCell>();

  for (const cells of cellGroups) {
    for (const cell of cells) {
      merged.set(`${cell.rowId}:${cell.fieldId}`, cell);
    }
  }

  return [...merged.values()];
};

const activeTabColumnsRef = computed(() => props.activeTabColumns);
const formattedDataRef = computed<RawQueryRow[]>(
  () => props.formattedData || []
);

/**
 * `baselineRows` is the last accepted data state:
 *  - initial query result on first render / tab switch
 *  - updated to current grid values after a successful save
 *
 * `rowData` is the live AG Grid backing array, which AG Grid mutates in place
 * while the user edits.
 */
const baselineRows = ref<RawQueryRow[]>(
  cloneRawQueryRows(formattedDataRef.value)
);
const rowData = ref<RawQueryRow[]>(buildRawQueryRowData(baselineRows.value));
const acceptedCells = ref<RawQueryEditedCell[]>([]);

const { editedCells, onCellValueChanged, clearEditedCells } =
  useRawQueryEditedCells({
    columns: activeTabColumnsRef,
    originalRows: baselineRows,
  });

function refreshDirtyCells() {
  rawQueryTableRef.value?.gridApi?.refreshCells({ force: true });
}

const highlightedCells = computed(() =>
  mergeTrackedCells(acceptedCells.value, editedCells.value)
);

const syncGridRowsFromBaseline = () => {
  rowData.value = buildRawQueryRowData(baselineRows.value);
};

const acceptPendingChanges = () => {
  const pendingCells = editedCells.value.slice();

  if (!pendingCells.length) {
    return;
  }

  baselineRows.value = stripGridMetaFromRows(rowData.value);
  acceptedCells.value = mergeTrackedCells(acceptedCells.value, pendingCells);
  clearEditedCells();
};

const discardPendingChanges = () => {
  clearEditedCells();
  syncGridRowsFromBaseline();
  refreshDirtyCells();
};

watch([formattedDataRef, () => props.activeTab.id], ([rows]) => {
  baselineRows.value = cloneRawQueryRows(rows);
  acceptedCells.value = [];
  clearEditedCells();
  syncGridRowsFromBaseline();
});

/**
 * Mutable tracker passed to column defs so cellStyle can read the dirty set
 * without rebuilding col defs on every edit. After save/discard we clear it
 * and force a grid repaint.
 */
const dirtyTracker: RawQueryDirtyTracker = { cells: [] };

watch(
  highlightedCells,
  cells => {
    dirtyTracker.cells = cells;
    // AG Grid evaluates cellStyle *before* this watcher runs, so the cell
    // already rendered with stale dirty state. Force a repaint now that the
    // tracker is up-to-date.
    refreshDirtyCells();
  },
  { immediate: true }
);

const connectionRef = computed(() => props.activeTab.metadata.connection);

const selectedRowsRef = computed(() => selectedRows.value);

const {
  isPreviewOpen,
  isMutating,
  pendingAction,
  previewGroups,
  hasNoPkWarning,
  totalUpdateCount,
  requestSave,
  deleteGroups,
  deleteHasNoPkWarning,
  totalDeleteCount,
  requestDelete,
  cancelPreview,
  confirmAndExecute,
} = useRawQueryMutation({
  connection: connectionRef,
  columns: activeTabColumnsRef,
  rows: baselineRows,
  editedCells,
  selectedRows: selectedRowsRef,
  onSaved: acceptPendingChanges,
  onDeleted: () => {
    // After delete the result is stale — clear selection so counts reset.
    selectedRows.value = [];
  },
});

/* ------------------------------------------------------------------ *
 * Relation preview (forward / back-ref click on cells)
 * ------------------------------------------------------------------ */
const {
  relationRoot,
  previewRelationBreadcrumbs,
  openRelationPreview,
  clearRelationPreview,
  onOpenBackReferencedTableModal,
  onOpenForwardReferencedTableModal,
  onUpdateSelectedTabInBreadcrumb,
  onBackPreviousBreadcrumb,
  onBackPreviousBreadcrumbByIndex,
} = useRawQueryRelationPreview();

const columnDefs = computed(() =>
  buildRawQueryColumnDefs({
    columns: props.activeTabColumns,
    rows: baselineRows.value,
    reservedTables: reservedTables.value,
    isEditingEnabled: isEditingEnabled.value,
    dirtyTracker,
    onOpenRelationPreview: openRelationPreview,
  })
);

/* Pipe ag-grid edit events into the dirty-tracker via BaseDataGrid event. */

/* ------------------------------------------------------------------ *
 * Keyboard shortcuts (scoped to this result view, mirroring QuickQuery)
 * ⌘S  → save pending edits
 * ⌘⌥⌫ → delete selected rows
 * ------------------------------------------------------------------ */
useHotkeys(
  [
    {
      key: 'meta+s',
      callback: () => {
        if (!isEditingEnabled.value || isMutating.value) return;
        requestSave();
      },
      isPreventDefault: true,
    },
    {
      key: 'meta+alt+backspace',
      callback: () => {
        if (!isEditingEnabled.value || isMutating.value) return;
        requestDelete();
      },
      isPreventDefault: true,
    },
  ],
  { target: containerRef }
);
</script>

<template>
  <div ref="containerRef" class="h-full w-full flex flex-col">
    <PreviewRelationTable
      v-if="relationRoot && previewRelationBreadcrumbs.length"
      :open="previewRelationBreadcrumbs.length > 0"
      :breadcrumbs="previewRelationBreadcrumbs"
      :currentTableName="relationRoot.tableName"
      :connectionId="activeTab.metadata.connection?.id || ''"
      :workspaceId="activeTab.metadata.connection?.workspaceId || ''"
      :rootSchemaName="relationRoot.schemaName"
      @clear-breadcrumb="clearRelationPreview"
      @onOpenBackReferencedTableModal="onOpenBackReferencedTableModal"
      @onOpenForwardReferencedTableModal="onOpenForwardReferencedTableModal"
      @onUpdateSelectedTabInBreadcrumb="onUpdateSelectedTabInBreadcrumb"
      @onBackPreviousBreadcrumb="onBackPreviousBreadcrumb"
      @onBackPreviousBreadcrumbByIndex="onBackPreviousBreadcrumbByIndex"
    />

    <RawQueryUpdatePreviewDialog
      :open="isPreviewOpen"
      :action="pendingAction"
      :update-groups="previewGroups"
      :total-updates="totalUpdateCount"
      :update-has-no-pk-warning="hasNoPkWarning"
      :delete-groups="deleteGroups"
      :total-deletes="totalDeleteCount"
      :delete-has-no-pk-warning="deleteHasNoPkWarning"
      :is-mutating="isMutating"
      @confirm="confirmAndExecute"
      @cancel="cancelPreview"
    />

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
      v-else-if="showNoResultsEmptyState"
      title="No Results"
      desc="The query returned no records."
      class="h-full"
    />

    <template v-else>
      <RawQueryResultControlBar
        v-if="rowData.length"
        :pending-count="editedCells.length"
        :is-mutating="isMutating"
        :is-editing-enabled="isEditingEnabled"
        :total-selected-rows="selectedRows.length"
        @save="requestSave"
        @discard="discardPendingChanges"
        @delete="requestDelete"
      />

      <RawQueryContextMenu
        :data="formattedData || []"
        :selectedRows="selectedRows"
        :cellContextMenu="rawQueryTableRef?.cellContextMenu"
        :cellHeaderContextMenu="rawQueryTableRef?.cellHeaderContextMenu"
        @onClearContextMenu="rawQueryTableRef?.clearCellContextMenu()"
        class="flex-1 min-h-0"
      >
        <BaseDataGrid
          ref="rawQueryTableRef"
          :column-defs="columnDefs"
          :row-data="rowData"
          :selected-rows="selectedRows"
          empty-title="No Results"
          empty-description="The query returned no records."
          class="h-full"
          :allow-editing="isEditingEnabled"
          :suppress-scroll-on-new-data="true"
          @selection-changed="onSelectedRowsChange"
          @cell-value-changed="onCellValueChanged"
        />
      </RawQueryContextMenu>
    </template>
  </div>
</template>
