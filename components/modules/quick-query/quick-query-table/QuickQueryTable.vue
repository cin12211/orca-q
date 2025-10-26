<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type {
  CellClassParams,
  CellContextMenuEvent,
  CellValueChangedEvent,
  ColDef,
  ColTypeDef,
  GridOptions,
  SuppressKeyboardEventParams,
  ValueFormatterParams,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import {
  baseTableTheme,
  DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH,
  DEFAULT_HASH_INDEX_WIDTH,
  HASH_INDEX_HEADER,
  HASH_INDEX_ID,
} from '~/components/base/dynamic-table/constants';
import { useAgGridApi } from '~/components/base/dynamic-table/hooks';
import {
  cellValueFormatter,
  type RowData,
  estimateAllColumnWidths,
} from '~/components/base/dynamic-table/utils';
import type { ForeignKeyMetadata } from '~/server/api/get-schema-meta-data';
import { DEFAULT_BUFFER_ROWS, DEFAULT_QUERY_SIZE } from '~/utils/constants';
import CustomCellUuid from './CustomCellUuid.vue';
import CustomHeaderTable from './CustomHeaderTable.vue';

// document.getElementsByClassName('ag-body-viewport')
/* props ------------------------------------------------------------- */
const props = defineProps<{
  data?: RowData[];
  defaultPageSize?: number;
  orderBy: OrderBy;
  foreignKeys: ForeignKeyMetadata[];
  foreignKeyColumns: string[];
  primaryKeyColumns: string[];
  columnTypes: { name: string; type: string }[];
  offset: number;
  class?: HTMLAttributes['class'];
  isHaveRelationByFieldName: (columnName: string) => boolean | undefined;
  selectedColumnFieldId?: string | undefined;
  currentTableName: string;
  currentSchemaName: string;
}>();

const emit = defineEmits<{
  (e: 'onClickOutSide', event: PointerEvent): void;
  (e: 'update:orderBy', value: OrderBy): void;
  (e: 'onSelectedRows', value: RowData[]): void;
  (
    e: 'onOpenBackReferencedTableModal',
    value: {
      id: string;
      tableName: string;
      columnName: string;
      schemaName: string;
    }
  ): void;
  (e: 'onFocusCell', value: unknown | undefined): void;
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

const pageSize = ref<number>(props.defaultPageSize ?? DEFAULT_QUERY_SIZE);

const { gridApi, onGridReady } = useAgGridApi();

const agGridRef = useTemplateRef<HTMLElement>('agGridRef');

const cellContextMenu = ref<
  | {
      cellValue: unknown;
      columnName: string;
    }
  | undefined
>();

onClickOutside(agGridRef, event => {
  emit('onFocusCell', undefined);
  emit('onClickOutSide', event);
  // gridApi.value?.deselectAll();
});

const editedCells = ref<
  { rowId: number; changedData: { [key: string]: unknown } }[]
>([]);

/* reactive state ---------------------------------------------------- */
const rowData = computed<RowData[]>(() =>
  (props.data ?? []).map((e, index) => {
    return {
      [HASH_INDEX_ID]: index + props.offset + 1,
      ...e,
    };
  })
);

const { handleCellMouseOverDebounced, handleCellMouseDown } =
  useRangeSelectionTable({
    gridApi: gridApi,
    gridRef: agGridRef,
  });

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
  if (!props.columnTypes?.length) {
    return [];
  }

  const columns: ColDef[] = [];
  columns.push({
    colId: HASH_INDEX_ID,
    headerName: HASH_INDEX_HEADER,
    field: HASH_INDEX_ID,
    filter: false,
    resizable: true,
    editable: false,
    sortable: false,
    type: 'indexColumn',
    headerComponentParams: {
      allowSorting: false,
    },
    pinned: 'left',
    width: DEFAULT_HASH_INDEX_WIDTH,
  });

  const setPrimaryKeys = new Set(props.primaryKeyColumns);
  const setForeignKeyColumns = new Set(props.foreignKeyColumns);

  const mapForeignKeys = new Map(
    props.foreignKeys.map(foreignKey => [foreignKey.column, foreignKey])
  );

  props.columnTypes.forEach(({ name, type }) => {
    const fieldId = name;

    const sort =
      props.orderBy.columnName === fieldId ? props.orderBy.order : undefined;

    const isPrimaryKey = setPrimaryKeys.has(fieldId);
    const isForeignKey = setForeignKeyColumns.has(fieldId);

    const foreignKey = mapForeignKeys.get(fieldId);

    const haveRelationByFieldName = props.isHaveRelationByFieldName(fieldId);

    const isShowCustomCellUuid =
      (isPrimaryKey && haveRelationByFieldName) || (isForeignKey && foreignKey);

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
        isForeignKey,
      },
      cellRenderer: isShowCustomCellUuid ? CustomCellUuid : undefined,
      cellRendererParams: {
        isPrimaryKey: isShowCustomCellUuid,
        onOpenPreviewReverseTableModal: (id: string) => {
          if (isForeignKey && foreignKey) {
            emit('onOpenForwardReferencedTableModal', {
              id,
              tableName: foreignKey.referenced_table,
              columnName: foreignKey.referenced_column,
              schemaName: foreignKey.referenced_table_schema,
            });
          } else {
            emit('onOpenBackReferencedTableModal', {
              id,
              columnName: fieldId,
              tableName: props.currentTableName,
              schemaName: props.currentSchemaName,
            });
          }
        },
      },
      valueFormatter: (params: ValueFormatterParams) => {
        return cellValueFormatter(params.value, type);
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

const gridOptions = computed(() => {
  const options: GridOptions = {
    paginationPageSize: pageSize.value,
    rowBuffer: DEFAULT_BUFFER_ROWS,
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
    onCellMouseDown: handleCellMouseDown,
    onCellMouseOver: handleCellMouseOverDebounced,
    defaultColDef: defaultColDef.value,
    columnTypes: columnTypes.value,
  };

  return options;
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

const onCellContextMenu = (event: CellContextMenuEvent) => {
  const columnName = event.colDef.field;
  const cellValue = event.value;

  if (columnName) {
    cellContextMenu.value = {
      cellValue,
      columnName,
    };
  }
};

watch(
  () => props.selectedColumnFieldId,
  async () => {
    await nextTick();
    gridApi.value?.refreshCells({ force: true });
  },
  { flush: 'post' }
);

const onRowDataUpdated = () => {
  if (!gridApi.value) {
    return;
  }

  const columns = gridApi.value.getAllGridColumns() || [];

  const rows = (props.data || []).slice(0, 10);

  const columnWidths = estimateAllColumnWidths({
    columns,
    rows,
  });

  const setPrimaryKeys = new Set(props.primaryKeyColumns);
  const setForeignKey = new Set(props.foreignKeyColumns);

  gridApi.value.updateGridOptions({
    columnDefs: columns.map(column => {
      const fieldId = column.getColDef().field!;

      const isPrimaryKey = setPrimaryKeys.has(fieldId);
      const isForeignKey = setForeignKey.has(fieldId);

      const isKey = isPrimaryKey || isForeignKey;

      const additionalGap = isKey ? DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH : 0;

      return {
        ...column.getColDef(),
        width: columnWidths[fieldId] + additionalGap,
      };
    }),
  });
};

defineExpose({ gridApi, editedCells, columnDefs, cellContextMenu });

//  @mouseup="onStopRangeSelection"
//     @click.keyup="onStopRangeSelection"
//     @mouseleave="onStopRangeSelection"
</script>

<template>
  <AgGridVue
    @selection-changed="onSelectionChanged"
    @cell-value-changed="onCellValueChanged"
    @grid-ready="onGridReady"
    @cell-focused="onCellFocus"
    @rowDataUpdated="onRowDataUpdated"
    @cellContextMenu="onCellContextMenu"
    :class="props.class"
    :grid-options="gridOptions"
    :columnDefs="columnDefs"
    :rowData="rowData"
    ref="agGridRef"
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
  background: var(--ag-selected-row-background-color);
}
</style>
