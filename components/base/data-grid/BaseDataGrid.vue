<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import { markRaw } from 'vue';
import type {
  CellContextMenuEvent,
  CellValueChangedEvent,
  ColDef,
  ColTypeDef,
  GridOptions,
  GridReadyEvent,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { DEFAULT_BUFFER_ROWS } from '~/core/constants';
import AgJsonCellEditor from './components/AgJsonCellEditor.vue';
import BaseDataGridCopyContextMenu from './components/BaseDataGridCopyContextMenu.vue';
import BaseDataGridEmptyOverlay from './components/BaseDataGridEmptyOverlay.vue';
import {
  useAgGridApi,
  useDataGridContextMenu,
  useDataGridSelection,
  useTableTheme,
} from './hooks';
import { cellValueFormatter } from './utils';

/**
 * BaseDataGrid is the lowest-level shared AG Grid wrapper used by feature
 * tables (raw-query result, quick-query table, ...).
 *
 * Responsibilities (everything every consumer ends up reimplementing):
 *  - manage the grid API + theme (with live updates on theme change)
 *  - wire range-selection mouse handlers
 *  - manage cell- and header-context-menu state
 *  - emit selection-changed / cell-focused / click-outside signals
 *  - bind the cmd/ctrl+C copy hotkey
 *
 * It is intentionally column-/row-agnostic: callers are responsible for
 * building `columnDefs` and `rowData`, and for any feature-specific
 * `gridOptions` (column types, cell styling, custom components, ...). Those
 * options are deep-merged on top of the base defaults. Editing is disabled by
 * default and must be explicitly enabled by feature grids that own mutation
 * flows, such as Quick Query and Raw Query.
 */
const props = withDefaults(
  defineProps<{
    columnDefs: ColDef[];
    rowData: unknown[];
    gridOptions?: GridOptions;
    columnTypes?: Record<string, ColTypeDef>;
    components?: Record<string, unknown>;
    class?: HTMLAttributes['class'];
    selectedRows?: unknown[];
    autoScrollOnSelection?: boolean;
    enableSimpleCopyContextMenu?: boolean;
    enableCopyAsSql?: boolean;
    contextMenuTableName?: string;
    contextMenuSchemaName?: string;
    enableCopyHotkey?: boolean;
    enableClickOutside?: boolean;
    allowEditing?: boolean;
    suppressScrollOnNewData?: boolean;
    copyHeadersToClipboard?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
  }>(),
  {
    autoScrollOnSelection: true,
    enableSimpleCopyContextMenu: true,
    enableCopyAsSql: false,
    enableCopyHotkey: true,
    enableClickOutside: false,
    allowEditing: false,
    suppressScrollOnNewData: true,
    copyHeadersToClipboard: false,
    emptyTitle: 'No data found',
    emptyDescription: 'There are no rows to display.',
  }
);

const emit = defineEmits<{
  (e: 'selectionChanged', rows: unknown[]): void;
  (e: 'cellFocused', value: unknown | undefined): void;
  (e: 'cellValueChanged', event: CellValueChangedEvent): void;
  (e: 'rowDataUpdated'): void;
  (e: 'cellContextMenu', event: CellContextMenuEvent): void;
  (e: 'columnHeaderContextMenu', event: CellContextMenuEvent): void;
  (e: 'gridReady', event: GridReadyEvent): void;
  (e: 'clickOutside', event: PointerEvent): void;
}>();

const containerRef = ref<HTMLElement>();
const agGridRef = useTemplateRef<HTMLElement>('agGridRef');
const selectedRowsState = ref<Record<string, unknown>[]>([]);

const { gridApi, onGridReady: onAgGridReady } = useAgGridApi();

watch(
  () => props.selectedRows,
  rows => {
    if (Array.isArray(rows)) {
      selectedRowsState.value = rows as Record<string, unknown>[];
    }
  },
  { immediate: true }
);

const handleGridReady = (event: GridReadyEvent) => {
  onAgGridReady(event);
  emit('gridReady', event);
};

const { handleCellMouseOverDebounced, handleCellMouseDown } =
  useRangeSelectionTable({
    enableAutoScroll: props.autoScrollOnSelection,
    gridApi,
    gridRef: agGridRef,
  });

const { onSelectionChanged, onCellFocus } = useDataGridSelection({
  gridApi,
  onSelectedRows: rows => {
    selectedRowsState.value = rows as Record<string, unknown>[];
    emit('selectionChanged', rows);
  },
  onFocusCell: value => emit('cellFocused', value),
});

const {
  cellContextMenu,
  cellHeaderContextMenu,
  onCellContextMenu: handleCellContextMenu,
  onCellHeaderContextMenu: handleCellHeaderContextMenu,
  clearCellContextMenu,
} = useDataGridContextMenu({
  hasSelectedRows: () => selectedRowsState.value.length > 0,
});

const onCellContextMenu = (event: CellContextMenuEvent) => {
  handleCellContextMenu(event);
  emit('cellContextMenu', event);
};

const onCellHeaderContextMenu = (event: CellContextMenuEvent) => {
  handleCellHeaderContextMenu(event);
  emit('columnHeaderContextMenu', event);
};

onClickOutside(agGridRef, event => {
  if (!props.enableClickOutside) return;
  emit('clickOutside', event);
});

const tableTheme = useTableTheme();

// Live-update the theme on the already-mounted grid so changes propagate
// without remount.
watch(tableTheme, newTheme => {
  gridApi.value?.updateGridOptions({ theme: newTheme });
});

const mergedGridOptions = computed<GridOptions>(() => {
  const baseOptions: GridOptions = {
    rowBuffer: DEFAULT_BUFFER_ROWS,
    // Prevent AG Grid from parsing dots in flat field keys (e.g. 'table.column') as deep object access
    suppressFieldDotNotation: true,
    rowClass: 'class-row-border-none',

    getRowStyle: params => {
      if ((params.node.rowIndex || 0) % 2 === 0) {
        return { background: 'var(--muted)' };
      }
    },
    rowSelection: {
      mode: 'multiRow',
      checkboxes: false,
      headerCheckbox: false,
      enableSelectionWithoutKeys: false,
      enableClickSelection: 'enableSelection',
      copySelectedRows: false,
    },
    theme: tableTheme.value,
    pagination: false,
    undoRedoCellEditing: props.allowEditing,
    undoRedoCellEditingLimit: 25,
    animateRows: true,
    onCellMouseDown: handleCellMouseDown,
    onCellMouseOver: handleCellMouseOverDebounced,
    noRowsOverlayComponent: 'BaseDataGridEmptyOverlay',
    noRowsOverlayComponentParams: {
      title: props.emptyTitle,
      description: props.emptyDescription,
    },
    components: {
      BaseDataGridEmptyOverlay: markRaw(BaseDataGridEmptyOverlay),
      AgJsonCellEditor: markRaw(AgJsonCellEditor),
    },
  };

  const userOptions = props.gridOptions ?? {};

  return {
    ...baseOptions,
    ...userOptions,
    undoRedoCellEditing:
      props.allowEditing && (userOptions.undoRedoCellEditing ?? true),
    // Deep-merge `components` so consumers can add custom cell editors without
    // dropping the ones already provided via `props.components`.
    components: {
      ...(baseOptions.components ?? {}),
      ...(userOptions.components ?? {}),
      ...(props.components ?? {}),
    },
  };
});

const effectiveColumnDefs = computed<ColDef[]>(() => {
  if (props.allowEditing) {
    return props.columnDefs;
  }

  return props.columnDefs.map(column => ({
    ...column,
    editable: false,
  }));
});

const simpleContextMenuProps = computed(() => {
  if (!props.enableSimpleCopyContextMenu) {
    return {};
  }

  return {
    cellContextMenu: cellContextMenu.value,
    cellHeaderContextMenu: cellHeaderContextMenu.value,
    data: props.rowData as Record<string, unknown>[],
    selectedRows: selectedRowsState.value,
    tableName: props.contextMenuTableName,
    schemaName: props.contextMenuSchemaName,
    enableCopyAsSql: props.enableCopyAsSql,
    onClearContextMenu: clearCellContextMenu,
  };
});

if (props.enableCopyHotkey) {
  useHotkeys(
    [
      {
        key: 'meta+c',
        callback: async () => {
          const selectedCell = gridApi.value?.getFocusedCell();
          if (!selectedCell) return;

          const rowNode = gridApi.value?.getDisplayedRowAtIndex(
            selectedCell.rowIndex
          );
          const colId = selectedCell.column.getColId();
          const cellValue = rowNode?.data?.[colId];

          await navigator.clipboard.writeText(
            cellValueFormatter(cellValue) || ''
          );
        },
        excludeInput: true,
      },
    ],
    {
      isPreventDefault: false,
      target: containerRef,
    }
  );
}

const onCellValueChanged = (event: CellValueChangedEvent) => {
  if (!props.allowEditing) return;
  emit('cellValueChanged', event);
};

const onRowDataUpdated = () => {
  emit('rowDataUpdated');
};

defineExpose({
  gridApi,
  cellContextMenu,
  cellHeaderContextMenu,
  clearCellContextMenu,
});
</script>

<template>
  <div ref="containerRef" class="h-full">
    <component
      :is="
        props.enableSimpleCopyContextMenu ? BaseDataGridCopyContextMenu : 'div'
      "
      v-bind="simpleContextMenuProps"
      class="h-full"
    >
      <AgGridVue
        ref="agGridRef"
        :class="props.class"
        :grid-options="mergedGridOptions"
        :column-defs="effectiveColumnDefs"
        :column-types="columnTypes"
        :row-data="rowData"
        :suppress-scroll-on-new-data="suppressScrollOnNewData"
        :copy-headers-to-clipboard="copyHeadersToClipboard"
        @grid-ready="handleGridReady"
        @selection-changed="onSelectionChanged"
        @cell-focused="onCellFocus"
        @cell-value-changed="onCellValueChanged"
        @row-data-updated="onRowDataUpdated"
        @cell-context-menu="onCellContextMenu"
        @column-header-context-menu="onCellHeaderContextMenu"
      />
    </component>
  </div>
</template>

<style>
.ag-cell-value {
  user-select: none;
}

.ag-root-wrapper {
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  border: none;
}

.cellCenter .ag-cell-wrapper {
  justify-content: center;
}

.col-highlight-cell {
  background: var(--ag-selected-row-background-color);
}
</style>
