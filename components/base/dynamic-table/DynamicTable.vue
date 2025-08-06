<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import { themeBalham } from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';

interface RowData {
  [key: string]: unknown;
}

/* props ------------------------------------------------------------- */
const props = defineProps<{
  data: RowData[];
  foreignKeys: string[];
  primaryKeys: string[];
  class?: HTMLAttributes['class'];
}>();

const mappedColumns = computed(() => {
  const record = props.data?.[0] as Record<string, any>;

  const columns = [];

  for (const key in record) {
    columns.push({
      name: key,
      type: '',
    });
  }

  return columns;
});

const emit = defineEmits<{
  (e: 'onSelectedRows', value: RowData[]): void;
  (e: 'onFocusCell', value: unknown | undefined): void;
}>();

const gridApi = ref<GridApi | null>(null);

const agGridRef = useTemplateRef<HTMLElement>('agGridRef');

onClickOutside(agGridRef, () => {
  // emit('onFocusCell', undefined);
  // gridApi.value?.deselectAll();
});

/* reactive state ---------------------------------------------------- */
const rowData = computed<RowData[]>(() =>
  (props.data ?? []).map((e, index) => {
    return {
      '#': index + 1,
      ...e,
    };
  })
);

// const { onStopRangeSelection, onCellMouseOverDebounced, onCellMouseDown } =
//   useRangeSelectionTable({});

const customizedTheme = themeBalham.withParams({
  // accentColor: 'var(--color-gray-900)',
  backgroundColor: 'var(--background)',
  // wrapperBorderRadius: 0,
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--input)',
  columnBorder: true,
  wrapperBorderRadius: 'var(--radius)',
  checkboxBorderRadius: 5,
  checkboxCheckedBackgroundColor: 'var(--foreground)',
  checkboxCheckedShapeColor: 'var(--background)',
  checkboxCheckedBorderColor: 'transparent',
});

/* grid ready callback ---------------------------------------------- */
const onGridReady = (e: GridReadyEvent) => {
  gridApi.value = e.api;
  //Do something
};

const gridOptions = computed(() => {
  const options: GridOptions = {
    rowClass: 'class-row-border-none',
    getRowClass: params => {
      if ((params.node.rowIndex || 0) % 2 === 0) {
        return 'class-row-even';
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
    autoSizeStrategy: {
      type: 'fitCellContents',
    },
    theme: customizedTheme,
    pagination: false,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 25,
    animateRows: true,
    // onCellMouseDown,
    // onCellMouseOver: onCellMouseOverDebounced,
  };
  return options;
});

/* derive columns on the fly ---------------------------------------- */
const columnDefs = computed<ColDef[]>(() => {
  const columns: ColDef[] = [];
  columns.push({
    headerName: '#',
    field: '#',
    filter: false,
    resizable: false,
    editable: false,
    sortable: true,
    pinned: 'left',
  });

  mappedColumns.value.forEach(({ name }) => {
    const fieldId = name;

    const column: ColDef = {
      headerName: fieldId,
      field: fieldId,
      filter: true,
      resizable: true,
      editable: false,
      sortable: true,
      cellClass: 'cellCenter',

      valueFormatter: (params: ValueFormatterParams) => {
        // check object value
        const value = params.value;
        if (
          typeof value === 'object' &&
          value !== null &&
          Object.prototype.toString.call(value) === '[object Object]'
        ) {
          return value ? JSON.stringify(params.value, null, 2) : '';
        }

        return params.value;
      },
    };
    columns.push(column);
  });

  return columns;
});

/* handle selection changes ----------------------------------------- */
const onSelectionChanged = () => {
  if (gridApi.value) {
    const selectedRows = gridApi.value.getSelectedRows();
    handleSelection(selectedRows);
  }
};

const handleSelection = (selectedRows: RowData[]) => {
  emit('onSelectedRows', selectedRows);
};

const onCellFocus = () => {
  const selectedCell = gridApi.value?.getFocusedCell();

  if (selectedCell) {
    const rowNode = gridApi.value?.getDisplayedRowAtIndex(
      selectedCell.rowIndex
    );
    const colId = selectedCell.column.getColId();
    const cellValue = rowNode?.data?.[colId];
    emit('onFocusCell', cellValue ?? undefined);
  }
};

defineExpose({ gridApi });
</script>

<template>
  <AgGridVue
    @selection-changed="onSelectionChanged"
    @grid-ready="onGridReady"
    @cell-focused="onCellFocus"
    :class="props.class"
    :grid-options="gridOptions"
    :columnDefs="columnDefs"
    :rowData="rowData"
    ref="agGridRef"
  />
</template>
