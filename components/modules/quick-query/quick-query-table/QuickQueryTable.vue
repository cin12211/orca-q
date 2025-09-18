<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type {
  CellClassParams,
  CellValueChangedEvent,
  ColDef,
  ColTypeDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  SizeColumnsToFitGridStrategy,
  SuppressKeyboardEventParams,
  ValueFormatterParams,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { baseTableTheme } from '~/components/base/dynamic-table/constants';
import { DEFAULT_QUERY_SIZE } from '~/utils/constants';
import CustomCellUuid from './CustomCellUuid.vue';
import CustomHeaderTable from './CustomHeaderTable.vue';

//TODO: refactor, and move reuseable
// Define interfaces for better type safety
interface RowData {
  [key: string]: unknown;
}

/* props ------------------------------------------------------------- */
const props = defineProps<{
  data?: RowData[];
  defaultPageSize?: number;
  orderBy: OrderBy;
  foreignKeys: string[];
  primaryKeys: string[];
  columnTypes: { name: string; type: string }[];
  offset: number;
  class?: HTMLAttributes['class'];
  isHaveRelationByFieldName: (columnName: string) => boolean | undefined;
  selectedColumnFieldId?: string | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:orderBy', value: OrderBy): void;
  (e: 'onSelectedRows', value: RowData[]): void;
  (
    e: 'onOpenPreviewReverseTableModal',
    value: { id: string; columnName: string }
  ): void;
  (e: 'onFocusCell', value: unknown | undefined): void;
}>();

const pageSize = ref<number>(props.defaultPageSize ?? DEFAULT_QUERY_SIZE);
const gridApi = ref<GridApi | null>(null);

const agGridRef = useTemplateRef<HTMLElement>('agGridRef');

onClickOutside(agGridRef, () => {
  emit('onFocusCell', undefined);
  // gridApi.value?.deselectAll();
});

const editedCells = ref<
  { rowId: number; changedData: { [key: string]: unknown } }[]
>([]);

/* reactive state ---------------------------------------------------- */
const rowData = computed<RowData[]>(() =>
  (props.data ?? []).map((e, index) => {
    return {
      '#': index + props.offset + 1,
      ...e,
    };
  })
);

const { onStopRangeSelection, onCellMouseOverDebounced, onCellMouseDown } =
  useRangeSelectionTable({});

/* grid ready callback ---------------------------------------------- */
const onGridReady = (e: GridReadyEvent) => {
  gridApi.value = e.api;
  //Do something
};

/* Handle cell value changed --------------------------------------- */
const onCellValueChanged = (event: CellValueChangedEvent) => {
  const { colDef, newValue, rowIndex } = event;
  const rowId = Number(rowIndex); // Use row ID or index
  const field = colDef.field;

  if (rowId !== null && field) {
    // Add to edited cells if not already present

    const oldFieldValue = props?.data?.[rowId]?.[field];

    const haveDifferent = oldFieldValue !== newValue;

    const haveEditedCellRecord = editedCells.value.some(
      cell => cell.rowId === rowId
    );

    if (haveDifferent && !haveEditedCellRecord) {
      editedCells.value.push({
        rowId,
        changedData: {
          [field]: newValue,
        },
      });
      return;
    }

    if (haveDifferent) {
      editedCells.value = editedCells.value.map(cell => {
        if (cell.rowId === rowId) {
          return {
            ...cell,
            changedData: {
              ...cell.changedData,
              [field]: newValue,
            },
          };
        }
        return cell;
      });
    } else {
      editedCells.value = editedCells.value.map(cell => {
        if (cell.rowId === rowId) {
          const newChangedData = cell.changedData;

          delete newChangedData[field];

          return {
            ...cell,
            changedData: newChangedData,
          };
        }
        return cell;
      });
    }
  }
};

/* derive columns on the fly ---------------------------------------- */
const columnDefs = computed<ColDef[]>(() => {
  if (!props.columnTypes?.length || !props.data?.length) {
    return [];
  }

  const columns: ColDef[] = [];
  columns.push({
    colId: '#',
    headerName: '#',
    field: '#',
    filter: false,
    resizable: true,
    editable: false,
    sortable: false,
    type: 'indexColumn',
    headerComponentParams: {
      allowSorting: false,
    },
    pinned: 'left',
  });

  props.columnTypes.forEach(({ name, type }) => {
    const fieldId = name;

    const sort =
      props.orderBy.columnName === fieldId ? props.orderBy.order : undefined;

    const isPrimaryKey = props.primaryKeys.includes(fieldId);

    const haveRelationByFieldName = props.isHaveRelationByFieldName(fieldId);

    const column: ColDef = {
      headerName: fieldId,
      field: fieldId,
      colId: fieldId,
      filter: false,
      resizable: true,
      editable: true,
      sortable: false,
      type: 'editableColumn',
      headerComponentParams: {
        allowSorting: true,
        sort,
        onUpdateSort: (value: OrderBy) => {
          emit('update:orderBy', value);
        },
        fieldId,
        isPrimaryKey,
        isForeignKey: props.foreignKeys.includes(fieldId),
      },
      cellRenderer: isPrimaryKey ? CustomCellUuid : undefined,
      cellRendererParams: {
        isPrimaryKey: isPrimaryKey && haveRelationByFieldName,
        onOpenPreviewReverseTableModal: (id: string) =>
          emit('onOpenPreviewReverseTableModal', {
            id,
            columnName: fieldId,
          }),
      },
      valueFormatter: (params: ValueFormatterParams) => {
        const value = params.value;

        if (value === null) {
          return 'NULL';
        }

        if (type === 'jsonb' || type === 'json') {
          return value ? JSON.stringify(value, null, 2) : '';
        }

        if (
          typeof value === 'object' &&
          value !== null &&
          Object.prototype.toString.call(value) === '[object Object]'
        ) {
          return value ? JSON.stringify(value, null, 2) : '';
        }

        return value;
      },
    };
    columns.push(column);
  });

  return columns;
});

const gridOptions = computed(() => {
  const options: GridOptions = {
    rowClass: 'class-row-border-none',
    // getRowClass: params => {
    //   if ((params.node.rowIndex || 0) % 2 === 0) {
    //     return 'class-row-even';
    //   }
    // },
    getRowStyle: params => {
      if ((params.node.rowIndex || 0) % 2 === 0) {
        return { background: 'var(--color-neutral-100)' };
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
    theme: baseTableTheme,
    pagination: false,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 25,
    animateRows: true,
    onCellMouseDown,
    onCellMouseOver: onCellMouseOverDebounced,
  };
  return options;
});

//
function suppressDeleteKeyboardEvent(params: SuppressKeyboardEventParams) {
  const event = params.event;
  const key = event.key;

  const KEY_BACKSPACE = 'Backspace';

  const KEY_DELETE = 'Delete';
  const deleteKeys = [KEY_BACKSPACE, KEY_DELETE];

  const suppress = deleteKeys.some(function (suppressedKey) {
    return suppressedKey === key || key.toUpperCase() === suppressedKey;
  });

  return suppress;
}

const defaultColDef = ref<ColDef>({
  headerComponent: CustomHeaderTable,
  suppressKeyboardEvent: suppressDeleteKeyboardEvent,
});

const columnTypes = ref<{
  [key: string]: ColTypeDef;
}>({
  editableColumn: {
    cellStyle: (params: CellClassParams) => {
      const rowId = Number(params.node.id ?? params.node.rowIndex);

      if (props.data?.[rowId] === undefined) {
        return { backgroundColor: 'var(--color-green-200)' };
      }

      const field = params.colDef.field ?? '';

      const style: { backgroundColor?: string; color?: string } = {};

      const oldValue = props?.data?.[rowId]?.[field];

      if (oldValue === null) {
        style.color = 'var(--muted-foreground)';
      }

      const haveDifferent = oldValue !== params.value;

      if (haveDifferent) {
        style.backgroundColor = 'var(--color-orange-200)';
        delete style.color;
      }

      return style;
    },
    cellClass: (p: CellClassParams) => {
      const isSelectedCol = p.column.getColId() === props.selectedColumnFieldId;
      return isSelectedCol ? 'col-highlight-cell cellCenter' : 'cellCenter';
    },
  },
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

watch(
  () => props.selectedColumnFieldId,
  async () => {
    await nextTick();
    gridApi.value?.refreshCells({ force: true });
    gridApi.value?.refreshHeader();
  },
  { flush: 'post' }
);

const forceRefreshTable = () => {
  // const columnIds: string[] = [];
  // props.columnTypes?.forEach(column => {
  //   if (column.type === 'uuid') {
  //     columnIds.push(column.name);
  //   }
  // });
  // gridApi.value?.sizeColumnsToFit({
  //   defaultMaxWidth: 360,
  //   defaultMinWidth: 120,
  //   columnLimits: [
  //     { key: '#', minWidth: 35 },
  //     ...columnIds.map(e => {
  //       return {
  //         key: e,
  //         minWidth: 200,
  //       };
  //     }),
  //   ],
  // });
  // gridApi.value?.autoSizeColumns(columnIds, false);
  // gridApi.value?.autoSizeAllColumns();
};

// watch(
//   () => [props.columnTypes, rowData, gridApi.value],
//   () => {
//     if (props.columnTypes.length && rowData.value.length) {
//       setTimeout(() => {
//         // forceRefreshTable();
//       }, 150);
//     }
//   },
//   {
//     deep: true,
//     immediate: true,
//   }
// );

defineExpose({ gridApi, editedCells, columnDefs });
</script>

<template>
  <AgGridVue
    @mouseup="onStopRangeSelection"
    @click.keyup="onStopRangeSelection"
    @mouseleave="onStopRangeSelection"
    @selection-changed="onSelectionChanged"
    @cell-value-changed="onCellValueChanged"
    @grid-ready="onGridReady"
    @cell-focused="onCellFocus"
    :class="props.class"
    :grid-options="gridOptions"
    :defaultColDef="defaultColDef"
    :columnTypes="columnTypes"
    :columnDefs="columnDefs"
    :rowData="rowData"
    :paginationPageSize="pageSize"
    :auto-size-strategy="{
      type: 'fitCellContents',
      skipHeader: false,
    }"
    :suppress-auto-size="true"
    ref="agGridRef"
    :row-buffer="5"
  />
</template>

<style>
/* .class-row-border-none {
  border: 0px;
} */

/* .class-row-even {
  background-color: var(--color-gray-100);
} */

.ag-cell-value {
  user-select: none;
}

.ag-cell {
  color: var(--color-black);
}

.dark .ag-cell {
  color: var(--color-white);
}

.ag-root-wrapper {
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  border: none;
}

/* .ag-row-selected:before {
  background-color: var(--color-slate-200);
} */

.cellCenter .ag-cell-wrapper {
  justify-content: center;
}

.col-highlight-cell {
  background: rgba(165, 165, 165, 0.15);
  box-shadow: inset 0 0 0 9999px rgba(160, 160, 160, 0.08);
}
</style>
