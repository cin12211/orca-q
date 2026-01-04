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
  ICellEditorParams,
  SuppressKeyboardEventParams,
  ValueFormatterParams,
  ValueSetterParams,
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
  estimateAllColumnWidths,
  type RowData,
} from '~/components/base/dynamic-table/utils';
import type { ForeignKeyMetadata } from '~/server/api/get-schema-meta-data';
import { DEFAULT_BUFFER_ROWS, DEFAULT_QUERY_SIZE } from '~/utils/constants';
import AgJsonCellEditor from './AgJsonCellEditor.vue';
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
  selectedRows: RowData[];
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

const cellContextMenu = ref<CellContextMenuEvent | undefined>();
const cellHeaderContextMenu = ref<CellContextMenuEvent | undefined>();

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

const mapColumnDef = computed(() => {
  return new Map(
    props.columnTypes.map(columnType => [columnType.name, columnType])
  );
});

const isJSONColumn = (fieldId: string) => {
  const fieldType = mapColumnDef.value.get(fieldId)?.type || '';

  return ['object', 'json', 'jsonb'].includes(fieldType);
};

/* Handle cell value changed --------------------------------------- */
const onCellValueChanged = (event: CellValueChangedEvent) => {
  const { colDef, newValue, rowIndex } = event;
  const rowId = Number(rowIndex); // Use row ID or index
  const fieldId = colDef.field;

  const isObjectColumn = isJSONColumn(fieldId ?? '');

  const fieldType = mapColumnDef.value.get(fieldId ?? '')?.type || '';

  const isBoolenColumn = fieldType === 'bool';

  if (rowId !== null && fieldId) {
    const oldFieldValue = props?.data?.[rowId]?.[fieldId];

    let haveDifferent = oldFieldValue !== newValue;

    if (isObjectColumn) {
      haveDifferent =
        JSON.stringify(oldFieldValue) !== JSON.stringify(newValue);
    }

    const haveEditedCellRecord = editedCells.value.some(
      cell => cell.rowId === rowId
    );

    let formatNewValue = isObjectColumn ? JSON.stringify(newValue) : newValue;

    if (!formatNewValue) {
      formatNewValue = null;
    }

    if (isBoolenColumn) {
      formatNewValue = !!formatNewValue;
    }

    if (haveDifferent && !haveEditedCellRecord) {
      editedCells.value.push({
        rowId,
        changedData: {
          [fieldId]: formatNewValue,
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
              [fieldId]: formatNewValue,
            },
          };
        }
        return cell;
      });
    } else {
      editedCells.value = editedCells.value.map(cell => {
        if (cell.rowId === rowId) {
          const newChangedData = cell.changedData;

          delete newChangedData[fieldId];

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

    const isObjectColumn = ['json', 'jsonb'].includes(type);

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

      cellEditorSelector: (_params: ICellEditorParams) => {
        if (isObjectColumn) {
          return {
            component: 'AgJsonCellEditor',
            popup: true,
            popupPosition: 'under',
          };
        }
      },

      valueFormatter: (params: ValueFormatterParams) => {
        const value = params.value;

        if (typeof value === 'number' || typeof value === 'bigint') {
          return value.toString();
        }

        if (value === null) {
          return 'NULL';
        }

        if (isObjectColumn) {
          return JSON.stringify(value, null, 2);
        }

        return (value || '') as string;
      },
      valueSetter: (params: ValueSetterParams) => {
        if (isObjectColumn) {
          try {
            const newValue = JSON.parse(params.newValue);
            params.data[fieldId] = newValue;
            return true;
          } catch (e) {
            console.error(`Invalid JSON format in column ${fieldId}:`, e);
            return false;
          }
        } else {
          params.data[fieldId] = params.newValue;
          return true;
        }
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
      const field = params.colDef.colId ?? '';
      if (!field || !props.data) {
        return undefined;
      }

      const isObjectColumn = isJSONColumn(field ?? '');

      const rowId = Number(params.node.id ?? params.node.rowIndex);

      const originalRowData = props.data[rowId];

      if (originalRowData === undefined) {
        return { backgroundColor: 'var(--color-green-200)' };
      }

      const style: { backgroundColor?: string; color?: string } = {};

      const originalFieldValue = originalRowData[field];
      const newValue = params.value;

      if (originalFieldValue === null || newValue === null) {
        style.color = 'var(--muted-foreground)';
      }

      let isChanged = false;

      if (isObjectColumn) {
        isChanged =
          JSON.stringify(originalFieldValue) !== JSON.stringify(newValue);
      } else {
        isChanged = originalFieldValue !== newValue;
      }

      if (isChanged) {
        style.backgroundColor = 'var(--color-orange-200)';
        delete style.color;
      } else {
        style.backgroundColor = 'unset';
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
    components: {
      AgJsonCellEditor,
    },
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
  if (!props.selectedRows?.length) {
    event?.node?.setSelected(true);
  }

  cellContextMenu.value = event;
};

const onCellHeaderContextMenu = (event: CellContextMenuEvent) => {
  cellHeaderContextMenu.value = event;
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

const clearCellContextMenu = () => {
  cellContextMenu.value = undefined;
  cellHeaderContextMenu.value = undefined;
};

defineExpose({
  gridApi,
  editedCells,
  columnDefs,
  cellContextMenu,
  cellHeaderContextMenu,
  clearCellContextMenu,
});

//  @mouseup="onStopRangeSelection"
//     @click.keyup="onStopRangeSelection"
//     @mouseleave="onStopRangeSelection"

onActivated(async () => {
  if (!gridApi.value) return;

  await nextTick();

  const scrollPosition = gridApi.value.getState();
  const gridBody = document.querySelector('.ag-body-viewport');

  if (gridBody) {
    gridBody.scrollTop = scrollPosition.scroll?.top || 0;
  }

  const columns = gridApi.value?.getAllGridColumns() || [];
  let sumColmnWidth = 0;

  for (const column of columns) {
    if (sumColmnWidth >= (scrollPosition.scroll?.left || 0)) {
      gridApi.value.ensureColumnVisible(column.getColId(), 'start');
      break;
    }

    sumColmnWidth += column.getActualWidth();
  }
});
</script>

<template>
  <AgGridVue
    @selection-changed="onSelectionChanged"
    @cell-value-changed="onCellValueChanged"
    @grid-ready="onGridReady"
    @cell-focused="onCellFocus"
    @rowDataUpdated="onRowDataUpdated"
    @cellContextMenu="onCellContextMenu"
    @columnHeaderContextMenu="onCellHeaderContextMenu"
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
