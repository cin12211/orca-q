/**
 * Composable that re-estimates column widths when row-data updates, and
 * restores scroll position when the component is re-activated (keep-alive).
 *
 * Extracted from the old `DynamicTable.vue` so any `BaseDataGrid` consumer
 * can opt-in to the same auto-sizing behaviour.
 */
import { nextTick, onActivated, type Ref } from 'vue';
import type { Column, GridApi } from 'ag-grid-community';
import {
  DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH,
  HASH_INDEX_ID,
} from '../constants';
import { estimateAllColumnWidths, type RowData } from '../utils';

interface UseDataGridAutoSizingOptions {
  gridApi: Ref<GridApi | null | undefined>;
  data: Ref<RowData[] | undefined>;
  /** Column fields that should get extra width for a key icon. */
  keyFields?: Ref<Set<string>> | undefined;
  /** Skip auto-sizing entirely. */
  disabled?: Ref<boolean> | boolean;
}

export function useDataGridAutoSizing({
  gridApi,
  data,
  keyFields,
  disabled = false,
}: UseDataGridAutoSizingOptions) {
  const onRowDataUpdated = () => {
    const isDisabled =
      typeof disabled === 'boolean' ? disabled : disabled.value;

    if (!gridApi.value || isDisabled) {
      return;
    }

    const columns = (gridApi.value.getAllGridColumns() || []) as Column[];
    const rows = (data.value || []).slice(0, 10);
    const columnWidths = estimateAllColumnWidths({ columns, rows });
    const keys = keyFields?.value;

    gridApi.value.updateGridOptions({
      columnDefs: columns.map((column: Column) => {
        const fieldId = column.getColDef().field!;
        const isKey = keys?.has(fieldId) ?? false;
        const additionalGap = isKey ? DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH : 0;

        return {
          ...column.getColDef(),
          width:
            fieldId === HASH_INDEX_ID
              ? column.getActualWidth()
              : columnWidths[fieldId] + additionalGap,
        };
      }),
    });
  };

  onActivated(async () => {
    if (!gridApi.value) return;

    await nextTick();

    const scrollPosition = gridApi.value.getState();
    const gridBody = document.querySelector('.ag-body-viewport');

    if (gridBody) {
      gridBody.scrollTop = scrollPosition.scroll?.top || 0;
    }

    const columns = (gridApi.value.getAllGridColumns() || []) as Column[];
    let sumColumnWidth = 0;

    for (const column of columns) {
      if (sumColumnWidth >= (scrollPosition.scroll?.left || 0)) {
        gridApi.value.ensureColumnVisible(column.getColId(), 'start');
        break;
      }

      sumColumnWidth += column.getActualWidth();
    }
  });

  return { onRowDataUpdated };
}
