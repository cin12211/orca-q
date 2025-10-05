<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type {
  CellClassParams,
  ColDef,
  ColTypeDef,
  GridOptions,
  ValueFormatterParams,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
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
  estimateColumnWidth,
  estimateAllColumnWidths,
} from './utils';

// TODO: refactor this component to reuse in query table
/* props ------------------------------------------------------------- */
const props = defineProps<{
  columns: MappedRawColumn[];
  data: RowData[];
  class?: HTMLAttributes['class'];
  skipReColumnSize?: boolean;
}>();

const emit = defineEmits<{
  (e: 'onSelectedRows', value: unknown[]): void;
  (e: 'onFocusCell', value: unknown | undefined): void;
}>();

const { gridApi, onGridReady } = useAgGridApi();

const agGridRef = useTemplateRef<HTMLElement>('agGridRef');

const containerRef = ref<InstanceType<typeof HTMLElement>>();

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

// const { onStopRangeSelection, onCellMouseOverDebounced, onCellMouseDown } =
//   useRangeSelectionTable({});

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

  const setColumnName = new Set();

  const tempRows = (props.data || []).slice(0, 10);

  props.columns.forEach(
    (
      {
        canMutate,
        queryFieldName,
        type,
        tableName,
        isPrimaryKey,
        isForeignKey,
      },
      index
    ) => {
      const fieldId = `${index}`;

      let fieldName = queryFieldName;

      if (setColumnName.has(fieldName)) {
        fieldName = `${tableName}.${queryFieldName}`;
      } else {
        setColumnName.add(fieldName);
      }

      const headerName = fieldName;

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
        editable: canMutate,
        sortable: true,
        cellClass: 'cellCenter',
        type: 'editableColumn',
        headerComponentParams: {
          innerHeaderComponent: DynamicPrimaryKeyHeader,
          isPrimaryKey: isPrimaryKey,
          isForeignKey: isForeignKey,
        },
        valueFormatter: (params: ValueFormatterParams) => {
          return cellValueFormatter(params.value, type);
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

      const oldValue = props?.data?.[rowId]?.[Number(field)];

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

          await navigator.clipboard.writeText(String(cellValue));
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

defineExpose({ gridApi });
</script>

<template>
  <div class="h-full" ref="containerRef">
    <AgGridVue
      @selection-changed="onSelectionChanged"
      @grid-ready="onGridReady"
      @cell-focused="onCellFocus"
      @row-data-updated="onRowDataUpdated"
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
