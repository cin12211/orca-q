<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import type {
  CellClassParams,
  ColDef,
  ColTypeDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import { themeBalham } from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import type { MappedRawColumn } from '~/components/modules/raw-query/interfaces';
import DynamicPrimaryKeyHeader from './DynamicPrimaryKeyHeader.vue';

// TODO: refactor this component to reuse in query table
/* props ------------------------------------------------------------- */
const props = defineProps<{
  columns: MappedRawColumn[];
  data: unknown[][];
  class?: HTMLAttributes['class'];
}>();

const emit = defineEmits<{
  (e: 'onSelectedRows', value: unknown[]): void;
  (e: 'onFocusCell', value: unknown | undefined): void;
}>();

const gridApi = ref<GridApi | null>(null);

const agGridRef = useTemplateRef<HTMLElement>('agGridRef');

const containerRef = ref<InstanceType<typeof HTMLElement>>();

onClickOutside(agGridRef, () => {
  // emit('onFocusCell', undefined);
  // gridApi.value?.deselectAll();
});

/* reactive state ---------------------------------------------------- */
const rowData = computed<unknown[]>(() =>
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

const columnDefs = computed<ColDef[]>(() => {
  const colDefs: ColDef[] = [];
  colDefs.push({
    headerName: '#',
    field: '#',
    filter: false,
    resizable: false,
    editable: false,
    sortable: true,
    pinned: 'left',
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
          const value = params.value;

          //TODO: reuse function format json -> string
          if (type === 'jsonb' || type === 'json') {
            return value ? JSON.stringify(params.value, null, 2) : '';
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

      colDefs.push(column);
    }
  );

  return colDefs;
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

      if (!field) {
        return;
      }

      const oldValue = props?.data?.[rowId]?.[Number(field)];

      const haveDifferent = oldValue !== params.value;

      if (haveDifferent) {
        return { backgroundColor: 'var(--color-orange-200)' };
      }
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

defineExpose({ gridApi });
</script>

<template>
  <div class="h-full" ref="containerRef">
    <AgGridVue
      @selection-changed="onSelectionChanged"
      @grid-ready="onGridReady"
      @cell-focused="onCellFocus"
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
