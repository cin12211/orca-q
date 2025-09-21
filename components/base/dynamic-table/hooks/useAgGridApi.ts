import { ref } from 'vue';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';

export function useAgGridApi() {
  const gridApi = ref<GridApi | null>(null);

  const onGridReady = (e: GridReadyEvent) => {
    gridApi.value = e.api;
  };

  return {
    gridApi,
    onGridReady,
  };
}
