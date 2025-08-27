<script setup lang="ts">
import { computed, ref } from 'vue';
import type {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import { iconOverrides, themeBalham } from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        filter: true,
        resizable: true,
        editable: false,
        valueFormatter: (params: ValueFormatterParams) => {
          // check type value is object

          const value = params.value;

          if (
            typeof value === 'object' &&
            value !== null &&
            Object.prototype.toString.call(value) === '[object Object]'
          ) {
            return value ? JSON.stringify(params.value, null, 2) : '';
          }

          return value;
        },
      }))
    : []
);

/* grid ready callback ---------------------------------------------- */
const onGridReady = (e: GridReadyEvent) => {
  gridApi.value = e.api;
  //Do something
};

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
  <div class="py-2 h-full flex flex-col space-y-2">
    <!-- <div class="flex items-center gap-2">
      <div class="relative w-full">
        <Icon
          name="lucide:search"
          class="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground"
        />
        <Input
          v-model="quickFilter"
          type="text"
          placeholder="Search in all fields..."
          class="pl-8 w-full h-8"
        />
      </div>

      <Button
        :variant="quickFilter ? 'default' : 'secondary'"
        @click="quickFilter = ''"
        size="sm"
      >
        Clear
      </Button>
    </div> -->

    <!-- The grid itself ------------------------------------------- -->
    <AgGridVue
      class="flex-1"
      :grid-options="gridOptions"
      :autoSizeStrategy="{
        type: 'fitCellContents',
      }"
      :theme="customizedTheme"
      :columnDefs="columnDefs"
      :rowData="rowData"
      :quickFilterText="quickFilter"
      :pagination="false"
      :paginationPageSize="pageSize"
      :rowSelection="'single'"
      :pagination-page-size-selector="[10, 20, 30, 50, 100]"
      enableCellTextSelection
      cell-ed
      @grid-ready="onGridReady"
    />

    <!-- Footer: page info & page-size selector -------------------- -->
  </div>
</template>

<style>
.class-row-border-none {
  border: 0px;
}

.class-row-even {
  background-color: var(--muted);
}
</style>
