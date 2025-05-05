<script setup lang="ts">
import { computed, ref } from 'vue';
import type {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  SizeColumnsToFitGridStrategy,
} from 'ag-grid-community';
import { iconOverrides, themeBalham } from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';

// Define interfaces for better type safety
interface RowData {
  [key: string]: unknown;
}

/* props ------------------------------------------------------------- */
const props = defineProps<{
  data?: RowData[];
  caption?: string;
  defaultPageSize?: number;
}>();

/* reactive state ---------------------------------------------------- */
const rowData = computed<RowData[]>(() => props.data ?? []);
const quickFilter = ref<string>(''); // Explicit string type
const pageSize = ref<number>(props.defaultPageSize ?? 10);

const gridApi = ref<GridApi | null>(null);

/* derive columns on the fly ---------------------------------------- */
const columnDefs = computed<ColDef[]>(() =>
  rowData.value.length
    ? Object.keys(rowData.value[0]).map((key: string) => ({
        field: key,
        sortable: true,
        filter: false,
        resizable: true,
        flex: 1,
        editable: true,
      }))
    : []
);

/* grid ready callback ---------------------------------------------- */
const onGridReady = (e: GridReadyEvent) => {
  gridApi.value = e.api;
  //Do something
};

const mySvgIcons = iconOverrides({
  type: 'image', // Use 'image' to allow SVG rendering
  mask: true,
  icons: {
    filter: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Huge Icons by Hugeicons - undefined --><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.857 12.506C6.37 10.646 4.596 8.6 3.627 7.45c-.3-.356-.398-.617-.457-1.076c-.202-1.572-.303-2.358.158-2.866S4.604 3 6.234 3h11.532c1.63 0 2.445 0 2.906.507c.461.508.36 1.294.158 2.866c-.06.459-.158.72-.457 1.076c-.97 1.152-2.747 3.202-5.24 5.065a1.05 1.05 0 0 0-.402.747c-.247 2.731-.475 4.227-.617 4.983c-.229 1.222-1.96 1.957-2.888 2.612c-.552.39-1.222-.074-1.293-.678a196 196 0 0 1-.674-6.917a1.05 1.05 0 0 0-.402-.755" color="currentColor"/></svg>`,
    },
  },
});

const customizedTheme = themeBalham
  .withParams({
    accentColor: 'var(--color-gray-900)',
    wrapperBorderRadius: 'var(--radius)',
    borderRadius: 'var(--radius-sm)',
    borderColor: 'var(--input)',
  })
  .withPart(mySvgIcons);

const autoSizeStrategy: SizeColumnsToFitGridStrategy = {
  type: 'fitGridWidth',
  defaultMinWidth: 150,
};

const gridOptions: GridOptions = {
  rowClass: 'class-row-border-none',
  getRowClass: params => {
    if ((params.node.rowIndex || 0) % 2 === 0) {
      return 'class-row-even';
    }
  },
};
</script>

<template>
  <AgGridVue
    class="flex-1"
    :grid-options="gridOptions"
    :autoSizeStrategy="autoSizeStrategy"
    :theme="customizedTheme"
    :columnDefs="columnDefs"
    :rowData="rowData"
    :quickFilterText="quickFilter"
    :pagination="true"
    :paginationPageSize="pageSize"
    :rowSelection="'single'"
    :pagination-page-size-selector="[10, 20, 30, 50, 100]"
    enableCellTextSelection
    cell-ed
    @grid-ready="onGridReady"
  />
</template>

<style>
.class-row-border-none {
  border: 0px;
}

.class-row-even {
  background-color: var(--muted);
}
</style>
