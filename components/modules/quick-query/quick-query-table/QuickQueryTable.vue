<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useAgGridApi } from '~/components/base/dynamic-table/hooks';
import type { RowData } from '~/components/base/dynamic-table/utils';
import type { OrderBy } from '~/core/composables/useTableQueryBuilder';
import type { SchemaForeignKeyMetadata as ForeignKeyMetadata } from '~/core/types';
import {
  useQuickQueryColumnDefs,
  useQuickQueryEditedCells,
  useQuickQueryGridEvents,
  useQuickQueryGridOptions,
  useQuickQueryGridSizing,
} from '../hooks';
import { buildQuickQueryRowData } from '../utils';

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
  isViewOnly?: boolean;
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

const { gridApi, onGridReady } = useAgGridApi();
const agGridRef = useTemplateRef<HTMLElement>('agGridRef');

onClickOutside(agGridRef, event => {
  emit('onFocusCell', undefined);
  emit('onClickOutSide', event);
});

const rowData = computed<RowData[]>(() =>
  buildQuickQueryRowData(props.data, props.offset)
);

const { handleCellMouseOverDebounced, handleCellMouseDown } =
  useRangeSelectionTable({
    gridApi: gridApi,
    gridRef: agGridRef,
  });

const { editedCells, isJSONColumn, onCellValueChanged } =
  useQuickQueryEditedCells({
    data: toRef(props, 'data'),
    columnTypes: toRef(props, 'columnTypes'),
  });

const { columnDefs } = useQuickQueryColumnDefs({
  columnTypes: toRef(props, 'columnTypes'),
  primaryKeyColumns: toRef(props, 'primaryKeyColumns'),
  foreignKeyColumns: toRef(props, 'foreignKeyColumns'),
  foreignKeys: toRef(props, 'foreignKeys'),
  orderBy: toRef(props, 'orderBy'),
  isViewOnly: toRef(props, 'isViewOnly'),
  currentTableName: toRef(props, 'currentTableName'),
  currentSchemaName: toRef(props, 'currentSchemaName'),
  isHaveRelationByFieldName: props.isHaveRelationByFieldName,
  onUpdateOrderBy: value => emit('update:orderBy', value),
  onOpenBackReferencedTableModal: value =>
    emit('onOpenBackReferencedTableModal', value),
  onOpenForwardReferencedTableModal: value =>
    emit('onOpenForwardReferencedTableModal', value),
});

const { gridOptions } = useQuickQueryGridOptions({
  defaultPageSize: props.defaultPageSize,
  data: toRef(props, 'data'),
  selectedColumnFieldId: toRef(props, 'selectedColumnFieldId'),
  isJSONColumn,
  gridApi,
  onCellMouseDown: handleCellMouseDown,
  onCellMouseOver: handleCellMouseOverDebounced,
});

const {
  cellContextMenu,
  cellHeaderContextMenu,
  onSelectionChanged,
  onCellFocus,
  onCellContextMenu,
  onCellHeaderContextMenu,
  clearCellContextMenu,
} = useQuickQueryGridEvents({
  gridApi,
  selectedRows: toRef(props, 'selectedRows'),
  onSelectedRows: rows => emit('onSelectedRows', rows),
  onFocusCell: value => emit('onFocusCell', value),
});

const { onRowDataUpdated } = useQuickQueryGridSizing({
  gridApi,
  data: toRef(props, 'data'),
  primaryKeyColumns: toRef(props, 'primaryKeyColumns'),
  foreignKeyColumns: toRef(props, 'foreignKeyColumns'),
  selectedColumnFieldId: toRef(props, 'selectedColumnFieldId'),
});

defineExpose({
  gridApi,
  editedCells,
  columnDefs,
  cellContextMenu,
  cellHeaderContextMenu,
  clearCellContextMenu,
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

/* .ag-cell {
  color: var(--foreground);
}

.dark .ag-cell {
  color: var(--foreground);
} */

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
