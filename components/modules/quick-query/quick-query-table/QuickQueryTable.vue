<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import type { GridApi } from 'ag-grid-community';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import type { RowData } from '~/components/base/data-grid/utils';
import type { OrderBy } from '~/core/composables/useTableQueryBuilder';
import type { SchemaForeignKeyMetadata as ForeignKeyMetadata } from '~/core/types';
import {
  useQuickQueryColumnDefs,
  useQuickQueryEditedCells,
  useQuickQueryGridOptions,
  useQuickQueryGridSizing,
} from '../hooks';
import { buildQuickQueryRowData } from '../utils/quickQueryTable';

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

/**
 * QuickQueryTable is now a thin wrapper over `BaseDataGrid` — the unified
 * AG Grid shell that owns grid API lifecycle, theme, range selection,
 * selection/focus/context-menu, click-outside, and the copy hotkey.
 *
 * QuickQueryTable's remaining responsibilities are domain-specific:
 *  - build columnDefs from PK/FK metadata + custom header
 *  - track edited cells (dirty + new rows)
 *  - apply quick-query gridOptions (pagination, JSON editor, suppress delete)
 *  - re-fit column widths on row-data updates and restore scroll on activate
 */
const baseGridRef = ref<InstanceType<typeof BaseDataGrid>>();

/* Forward the grid API as a computed Ref so existing composables (which
 * expect `Ref<GridApi | null>`) keep working unchanged. */
const gridApi = computed<GridApi | null>(
  () => (baseGridRef.value?.gridApi as GridApi | null | undefined) ?? null
);

const rowData = computed<RowData[]>(() =>
  buildQuickQueryRowData(props.data, props.offset)
);

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

/* `useQuickQueryGridOptions` still composes columnTypes / defaultColDef /
 * pagination / cell editor registration. The legacy gridApi / mouse handler
 * params are now no-ops (BaseDataGrid owns range selection + theme watch),
 * but we keep passing them so the composable signature is untouched. */
const { gridOptions } = useQuickQueryGridOptions({
  defaultPageSize: props.defaultPageSize,
  data: toRef(props, 'data'),
  selectedColumnFieldId: toRef(props, 'selectedColumnFieldId'),
  isJSONColumn,
  gridApi,
});

const { onRowDataUpdated } = useQuickQueryGridSizing({
  gridApi,
  data: toRef(props, 'data'),
  primaryKeyColumns: toRef(props, 'primaryKeyColumns'),
  foreignKeyColumns: toRef(props, 'foreignKeyColumns'),
  selectedColumnFieldId: toRef(props, 'selectedColumnFieldId'),
});

/* Context-menu state lives on BaseDataGrid; forward it to consumers. */
const cellContextMenu = computed(() => baseGridRef.value?.cellContextMenu);
const cellHeaderContextMenu = computed(
  () => baseGridRef.value?.cellHeaderContextMenu
);
const clearCellContextMenu = () => {
  baseGridRef.value?.clearCellContextMenu();
};

const onClickOutsideGrid = (event: PointerEvent) => {
  emit('onFocusCell', undefined);
  emit('onClickOutSide', event);
};

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
  <BaseDataGrid
    ref="baseGridRef"
    :class="props.class"
    :column-defs="columnDefs"
    :row-data="rowData"
    :grid-options="gridOptions"
    :selected-rows="props.selectedRows"
    :allow-editing="!props.isViewOnly"
    enable-click-outside
    @selection-changed="rows => emit('onSelectedRows', rows as RowData[])"
    @cell-focused="value => emit('onFocusCell', value)"
    @cell-value-changed="onCellValueChanged"
    @row-data-updated="onRowDataUpdated"
    @click-outside="onClickOutsideGrid"
  />
</template>
