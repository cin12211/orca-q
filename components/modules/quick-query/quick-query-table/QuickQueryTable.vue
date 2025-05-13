<script setup lang="ts">
import { computed, ref } from 'vue';
import type { HTMLAttributes } from 'vue';
import type {
  CellClassParams,
  CellValueChangedEvent,
  ColDef,
  ColTypeDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  SuppressKeyboardEventParams,
} from 'ag-grid-community';
import { _debounce, themeBalham } from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { DEFAULT_QUERY_SIZE } from '~/utils/constants';
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
}>();

const emit = defineEmits<{
  (e: 'update:orderBy', value: OrderBy): void;
  (e: 'onSelectedRows', value: RowData[]): void;
}>();

const pageSize = ref<number>(props.defaultPageSize ?? DEFAULT_QUERY_SIZE);
const gridApi = ref<GridApi | null>(null);
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

const customizedTheme = themeBalham.withParams({
  // accentColor: 'var(--color-gray-900)',
  wrapperBorderRadius: 0,
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--input)',
  columnBorder: true,
});

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
      copySelectedRows: true,
    },
    autoSizeStrategy: {
      type: 'fitCellContents',
      // defaultMinWidth: 100,
    },
    theme: customizedTheme,
    pagination: false,
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 25,

    animateRows: true,
    onCellMouseDown,
    onCellMouseOver: onCellMouseOverDebounced,
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
    resizable: true,
    flex: 1,
    editable: false,
    sortable: false,
    type: 'indexColumn',
    headerComponentParams: {
      allowSorting: false,
    },
  });

  props.columnTypes.forEach(({ name }) => {
    const fieldId = name;

    const sort =
      props.orderBy.columnName === fieldId ? props.orderBy.order : undefined;

    const column = {
      headerName: fieldId,
      field: fieldId,
      filter: false,
      resizable: true,
      flex: 1,
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
        isPrimaryKey: props.primaryKeys.includes(fieldId),
        isForeignKey: props.foreignKeys.includes(fieldId),
        // dataType:
        //   fieldId !== '#'
        //     ? `(${props.columnTypes.find(c => c.name === fieldId)?.type || ''})`
        //     : '',
      },
    };
    columns.push(column);
  });

  return columns;
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
  indexColumn: {},
  editableColumn: {
    cellStyle: (params: CellClassParams) => {
      const rowId = Number(params.node.id ?? params.node.rowIndex);

      if (props.data?.[rowId] === undefined) {
        return { backgroundColor: 'var(--color-green-200)' };
      }

      const field = params.colDef.field ?? '';

      const oldValue = props?.data?.[rowId]?.[field];

      const haveDifferent = oldValue !== params.value;

      if (haveDifferent) {
        return { backgroundColor: 'var(--color-orange-200)' };
      }

      return { backgroundColor: 'unset' };
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

defineExpose({ gridApi, editedCells });
</script>

<template>
  <AgGridVue
    @mouseup="onStopRangeSelection"
    @mouseleave="onStopRangeSelection"
    @selection-changed="onSelectionChanged"
    @cell-value-changed="onCellValueChanged"
    @grid-ready="onGridReady"
    :class="props.class"
    :grid-options="gridOptions"
    :defaultColDef="defaultColDef"
    :columnTypes="columnTypes"
    :columnDefs="columnDefs"
    :rowData="rowData"
    :paginationPageSize="pageSize"
  />
</template>

<style>
.class-row-border-none {
  border: 0px;
}

.class-row-even {
  background-color: var(--muted);
}

.ag-cell-value {
  user-select: none;
}

.ag-root-wrapper {
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  border: none;
}

/* .ag-row-selected:before {
  background-color: var(--color-slate-200);
} */
</style>
