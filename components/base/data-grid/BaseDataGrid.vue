<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type {
  CellContextMenuEvent,
  CellValueChangedEvent,
  ColDef,
  ColTypeDef,
  GridOptions,
  GridReadyEvent,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import {
  useAgGridApi,
  useTableTheme,
} from '~/components/base/dynamic-table/hooks';
import { cellValueFormatter } from '~/components/base/dynamic-table/utils';
import { DEFAULT_BUFFER_ROWS } from '~/core/constants';
import { useDataGridContextMenu, useDataGridSelection } from './hooks';

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
 * It is intentionally column-/row-/edit-agnostic: callers are responsible for
 * building `columnDefs` and `rowData`, and for any feature-specific
 * `gridOptions` (column types, cell styling, custom components, ...). Those
 * options are deep-merged on top of the base defaults.
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
    enableCopyHotkey?: boolean;
    enableClickOutside?: boolean;
    suppressScrollOnNewData?: boolean;
    copyHeadersToClipboard?: boolean;
  }>(),
  {
    enableCopyHotkey: true,
    enableClickOutside: false,
    suppressScrollOnNewData: true,
    copyHeadersToClipboard: false,
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

const { gridApi, onGridReady: onAgGridReady } = useAgGridApi();

const handleGridReady = (event: GridReadyEvent) => {
  onAgGridReady(event);
  emit('gridReady', event);
};

const { handleCellMouseOverDebounced, handleCellMouseDown } =
  useRangeSelectionTable({
    gridApi,
    gridRef: agGridRef,
  });

const { onSelectionChanged, onCellFocus } = useDataGridSelection({
  gridApi,
  onSelectedRows: rows => emit('selectionChanged', rows),
  onFocusCell: value => emit('cellFocused', value),
});

const {
  cellContextMenu,
  cellHeaderContextMenu,
  onCellContextMenu: handleCellContextMenu,
  onCellHeaderContextMenu: handleCellHeaderContextMenu,
  clearCellContextMenu,
} = useDataGridContextMenu({
  hasSelectedRows: () => !!props.selectedRows?.length,
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
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 25,
    animateRows: true,
    onCellMouseDown: handleCellMouseDown,
    onCellMouseOver: handleCellMouseOverDebounced,
  };

  const userOptions = props.gridOptions ?? {};

  return {
    ...baseOptions,
    ...userOptions,
    // Deep-merge `components` so consumers can add custom cell editors without
    // dropping the ones already provided via `props.components`.
    components: {
      ...(baseOptions.components ?? {}),
      ...(userOptions.components ?? {}),
      ...(props.components ?? {}),
    },
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
    <AgGridVue
      ref="agGridRef"
      :class="props.class"
      :grid-options="mergedGridOptions"
      :column-defs="columnDefs"
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
