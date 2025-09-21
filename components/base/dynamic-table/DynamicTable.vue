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
import DynamicPrimaryKeyHeader from './DynamicPrimaryKeyHeader.vue';
import {
  baseTableTheme,
  DEFAULT_HASH_INDEX_WIDTH,
  HASH_INDEX_HEADER,
  HASH_INDEX_ID,
} from './constants';
import { useAgGridApi } from './hooks';
import { calculateColumnWidths, type RowData, valueFormatter } from './utils';

// TODO: refactor this component to reuse in query table
/* props ------------------------------------------------------------- */
const props = defineProps<{
  columns: MappedRawColumn[];
  data: RowData[];
  class?: HTMLAttributes['class'];
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
  if (!props.columns?.length || !props.data?.length) {
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

      const column: ColDef = {
        headerName: fieldName,
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
          return valueFormatter(params, type);
        },
      };
      colDefs.push(column);
    }
  );

  return colDefs;
});

const gridOptions = computed(() => {
  const options: GridOptions = {
    rowClass: 'class-row-border-none',
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

//TODO: check condition for best performance
// watch(
//   () => columnDefs,
//   newColumnDefs => {
//     console.log('newColumns');
//     gridApi.value!.setGridOption('columnDefs', toRaw(newColumnDefs.value));
//     gridApi.value!.refreshHeader();
//   },
//   { deep: true } // since it's an array of objects
// );

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
    },
  ],
  {
    isPreventDefault: false,
    target: containerRef,
  }
);

const onRowDataUpdated = async () => {
  if (!gridApi.value) {
    return;
  }

  // gridApi.value?.refreshCells({ force: true });
  // gridApi.value.resetColumnState();
  // gridApi.value.refreshHeader();

  const columns = gridApi.value?.getAllGridColumns() || [];

  const ids = columns?.map(column => column.getColId());

  gridApi.value.autoSizeColumns(ids, false);

  const columnWidths = calculateColumnWidths({
    charWidth: 8,
    maxWidth: 300,
    minWidth: 35,
    columns,
    data: props.data || [],
    gapWidth: 15,
  });

  console.log('🚀 ~ onRowDataUpdated ~ columnWidths:', columnWidths);

  gridApi.value.updateGridOptions({
    columnDefs: columns.map(column => {
      const field = column.getColDef().field!;
      return {
        ...column.getColDef(),
        width: columnWidths[field],
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
      :auto-size-strategy="{
        type: 'fitGridWidth',
      }"
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
