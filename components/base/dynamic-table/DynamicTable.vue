<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type {
  CellClassParams,
  CellContextMenuEvent,
  ColDef,
  ColTypeDef,
  GridOptions,
  ICellEditorParams,
  ValueFormatterParams,
  ValueGetterParams,
  ValueSetterParams,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import AgJsonCellEditor from '~/components/modules/quick-query/quick-query-table/AgJsonCellEditor.vue';
import type { MappedRawColumn } from '~/components/modules/raw-query/interfaces';
import { DEFAULT_BUFFER_ROWS } from '~/utils/constants';
import DynamicPrimaryKeyHeader from './DynamicPrimaryKeyHeader.vue';
import {
  baseTableTheme,
  DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH,
  DEFAULT_COLUMN_RAW_GAP_WIDTH,
  DEFAULT_HASH_INDEX_WIDTH,
  HASH_INDEX_HEADER,
  HASH_INDEX_ID,
} from './constants';
import { useAgGridApi } from './hooks';
import {
  type RowData,
  cellValueFormatter,
  estimateAllColumnWidths,
  estimateColumnWidth,
} from './utils';

// TODO: refactor this component to reuse in query table
/* props ------------------------------------------------------------- */
const props = defineProps<{
  columns: MappedRawColumn[];
  data: RowData[];
  class?: HTMLAttributes['class'];
  skipReColumnSize?: boolean;
  columnKeyBy: 'index' | 'field';
  selectedRows?: RowData[];
}>();

const emit = defineEmits<{
  (e: 'onSelectedRows', value: unknown[]): void;
  (e: 'onFocusCell', value: unknown | undefined): void;
}>();

const { gridApi, onGridReady } = useAgGridApi();

const agGridRef = useTemplateRef<HTMLElement>('agGridRef');

const containerRef = ref<InstanceType<typeof HTMLElement>>();
const cellContextMenu = ref<CellContextMenuEvent | undefined>();
const cellHeaderContextMenu = ref<CellContextMenuEvent | undefined>();

onClickOutside(agGridRef, () => {
  // emit('onFocusCell', undefined);
  // gridApi.value?.deselectAll();
});

const rowData = computed<unknown[]>(() =>
  (props.data ?? []).map((e, index) => {
    return {
      [HASH_INDEX_ID]: index + 1,
      ...e,
    };
  })
);

const { handleCellMouseOverDebounced, handleCellMouseDown } =
  useRangeSelectionTable({
    gridApi: gridApi,
    gridRef: agGridRef,
  });

const columnDefs = computed<ColDef[]>(() => {
  if (!props.columns?.length) {
    return [];
  }

  const colDefs: ColDef[] = [];
  colDefs.push({
    colId: HASH_INDEX_ID,
    headerName: HASH_INDEX_HEADER,
    field: HASH_INDEX_ID,
    filter: false,
    resizable: false,
    editable: false,
    sortable: true,
    pinned: 'left',
    width: DEFAULT_HASH_INDEX_WIDTH,
  });

  const tempRows = (props.data || []).slice(0, 10);

  props.columns.forEach(
    (
      {
        originalName,
        // canMutate,
        // queryFieldName,
        // type,
        // tableName,
        isPrimaryKey,
        isForeignKey,
        aliasFieldName,
      },
      index
    ) => {
      let fieldId = '';

      if (props.columnKeyBy === 'index') {
        fieldId = `${index}`;
      } else {
        fieldId = originalName;
      }

      const headerName = aliasFieldName;

      const additionalGap =
        isPrimaryKey || isForeignKey ? DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH : 0;

      const estimatedWidth =
        estimateColumnWidth({
          headerName,
          rows: tempRows,
          field: fieldId,
          gapWidth: DEFAULT_COLUMN_RAW_GAP_WIDTH,
        }) + additionalGap;

      const column: ColDef = {
        headerName,
        field: fieldId,
        filter: true,
        resizable: true,
        editable: true,
        // editable: canMutate,//TODO: fix for editable inline
        sortable: true,
        cellClass: 'cellCenter',
        type: 'editableColumn',
        headerComponentParams: {
          innerHeaderComponent: DynamicPrimaryKeyHeader,
          isPrimaryKey: isPrimaryKey,
          isForeignKey: isForeignKey,
        },

        cellEditorSelector: (params: ICellEditorParams) => {
          const value = params.data[fieldId];

          const type = typeof value;

          // Object or Array → complex JSON
          if (type === 'object' && value !== null) {
            return {
              component: 'AgJsonCellEditor',
              popup: true,
              popupPosition: 'under',
            };
          }

          // If value is null or undefined → allow editing as string (or keep null)
          // if (value === null || value === undefined) {
          //   return {
          //     component: 'agTextCellEditor', // or your own null-friendly editor
          //   };
          // }
          // // // Primitive types
          // if (type === 'string') {
          //   return { component: 'agTextCellEditor' };
          // }
          // if (type === 'number') {
          //   return { component: 'agNumberCellEditor' };
          // }
          // if (type === 'boolean') {
          //   return { component: 'agCheckboxCellEditor' }; // optional: or custom select
          // }
          // // // Fallback
          // return { component: 'agTextCellEditor' };
        },

        // cellEditor: 'AgJsonCellEditor',
        // cellEditorPopup: true,

        valueFormatter: (params: ValueFormatterParams) => {
          const value = params.value;
          if (value === null) {
            return 'NULL';
          }

          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2); // Chuỗi có định dạng đẹp
          }

          return (value || '') as string;
        },

        // // // Chuyển Object thành chuỗi JSON khi vào chế độ chỉnh sửa
        // valueGetter: (params: ValueGetterParams) => {
        //   const value = params.data[fieldId];
        //   if (typeof value === 'object' && value !== null) {
        //     return JSON.stringify(value, null, 2); // Chuỗi có định dạng đẹp
        //   }
        //   return value; // Giá trị nguyên thủy
        // },

        // // Chuyển chuỗi JSON trở lại Object khi thoát chế độ chỉnh sửa
        valueSetter: (params: ValueSetterParams) => {
          try {
            const newValue = JSON.parse(params.newValue);
            params.data[fieldId] = newValue;
            return true; // Cập nhật thành công
          } catch (e) {
            console.error(`Invalid JSON format in column ${fieldId}:`, e);
            // Có thể giữ lại giá trị cũ hoặc trả về false để hủy cập nhật
            return false; // Cập nhật thất bại
          }
        },

        width: estimatedWidth,
      };
      colDefs.push(column);
    }
  );

  return colDefs;
});

const gridOptions = computed(() => {
  const options: GridOptions = {
    rowClass: 'class-row-border-none',
    rowBuffer: DEFAULT_BUFFER_ROWS,
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
    components: {
      AgJsonCellEditor,
    },
  };
  return options;
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

      const style: { backgroundColor?: string; color?: string } = {};

      if (!field) {
        return;
      }

      let fieldId: string | number = '';

      if (props.columnKeyBy === 'index') {
        fieldId = Number(field);
      } else {
        fieldId = field;
      }

      const oldValue = props?.data?.[rowId]?.[fieldId];

      if (oldValue === null) {
        style.color = 'var(--muted-foreground)';
      }

      // TODO: Cinny open when support edit in raw query
      // const haveDifferent =
      //   JSON.stringify(oldValue) !== JSON.stringify(params.value);

      // if (haveDifferent) {
      //   style.backgroundColor = 'var(--color-orange-200)';
      //   delete style.color;
      // }
      return style;
    },
    cellClass: () => {
      return 'cellCenter';
    },
  },
});

const onSelectionChanged = () => {
  if (gridApi.value) {
    const selectedRows = gridApi.value.getSelectedRows();
    handleSelection(selectedRows);
  }
};

const handleSelection = (selectedRows: unknown[]) => {
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

useHotkeys(
  [
    {
      key: 'meta+c',
      callback: async () => {
        const selectedCell = gridApi.value?.getFocusedCell();

        if (selectedCell) {
          const rowNode = gridApi.value?.getDisplayedRowAtIndex(
            selectedCell.rowIndex
          );
          const colId = selectedCell.column.getColId();
          const cellValue = rowNode?.data?.[colId];

          await navigator.clipboard.writeText(
            cellValueFormatter(cellValue) || ''
          );
        }
      },
      excludeInput: true,
    },
  ],
  {
    isPreventDefault: false,
    target: containerRef,
  }
);

const onRowDataUpdated = async () => {
  if (!gridApi.value || props.skipReColumnSize) {
    return;
  }

  const columns = gridApi.value?.getAllGridColumns() || [];
  const mapColumns = new Map();

  props.columns.forEach((column, index) => {
    if (column.isPrimaryKey || column.isForeignKey) {
      mapColumns.set(index.toString(), true);
    }
  });

  const tempRows = (props.data || []).slice(0, 10);

  const columnWidths = estimateAllColumnWidths({
    columns,
    rows: tempRows || [],
    gapWidth: DEFAULT_COLUMN_RAW_GAP_WIDTH,
  });

  gridApi.value.updateGridOptions({
    columnDefs: columns.map(column => {
      const field = column.getColDef().field!;

      const isKey = mapColumns.get(field);

      const additionalGap = isKey ? DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH : 0;

      return {
        ...column.getColDef(),
        width: columnWidths[field] + additionalGap,
      };
    }),
  });
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

const clearCellContextMenu = () => {
  cellContextMenu.value = undefined;
  cellHeaderContextMenu.value = undefined;
};

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

defineExpose({
  gridApi,
  columnDefs,
  cellContextMenu,
  cellHeaderContextMenu,
  clearCellContextMenu,
});
</script>

<template>
  <div class="h-full" ref="containerRef">
    <AgGridVue
      @selection-changed="onSelectionChanged"
      @grid-ready="onGridReady"
      @cell-focused="onCellFocus"
      @row-data-updated="onRowDataUpdated"
      @cellContextMenu="onCellContextMenu"
      @columnHeaderContextMenu="onCellHeaderContextMenu"
      :class="props.class"
      :grid-options="gridOptions"
      :columnDefs="columnDefs"
      :rowData="rowData"
      :columnTypes="columnTypes"
      :copy-headers-to-clipboard="true"
      ref="agGridRef"
    />
  </div>
</template>
<style>
.cellCenter .ag-cell-wrapper {
  justify-content: center;
}

.ag-cell {
  color: var(--color-black);
}
</style>
