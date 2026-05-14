import { nextTick, onActivated, watch, type Ref } from 'vue';
import type { Column } from 'ag-grid-community';
import {
  DEFAULT_COLUMN_ADDITIONAL_GAP_WIDTH,
  HASH_INDEX_ID,
} from '~/components/base/dynamic-table/constants';
import {
  estimateAllColumnWidths,
  type RowData,
} from '~/components/base/dynamic-table/utils';

interface UseQuickQueryGridSizingOptions {
  gridApi: Ref<any>;
  data: Ref<RowData[] | undefined>;
  primaryKeyColumns: Ref<string[]>;
  foreignKeyColumns: Ref<string[]>;
  selectedColumnFieldId: Ref<string | undefined>;
}

export const useQuickQueryGridSizing = ({
  gridApi,
  data,
  primaryKeyColumns,
  foreignKeyColumns,
  selectedColumnFieldId,
}: UseQuickQueryGridSizingOptions) => {
  watch(
    selectedColumnFieldId,
    async () => {
      await nextTick();
      gridApi.value?.refreshCells({ force: true });
    },
    { flush: 'post' }
  );

  const onRowDataUpdated = () => {
    if (!gridApi.value) {
      return;
    }

    const columns = (gridApi.value.getAllGridColumns() || []) as Column[];
    const rows = (data.value || []).slice(0, 10);
    const columnWidths = estimateAllColumnWidths({
      columns,
      rows,
    });
    const setPrimaryKeys = new Set(primaryKeyColumns.value);
    const setForeignKey = new Set(foreignKeyColumns.value);

    gridApi.value.updateGridOptions({
      columnDefs: columns.map((column: Column) => {
        const fieldId = column.getColDef().field!;
        const isPrimaryKey = setPrimaryKeys.has(fieldId);
        const isForeignKey = setForeignKey.has(fieldId);
        const isKey = isPrimaryKey || isForeignKey;
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
    if (!gridApi.value) {
      return;
    }

    await nextTick();

    const scrollPosition = gridApi.value.getState();
    const gridBody = document.querySelector('.ag-body-viewport');

    if (gridBody) {
      gridBody.scrollTop = scrollPosition.scroll?.top || 0;
    }

    const columns = (gridApi.value?.getAllGridColumns() || []) as Column[];
    let sumColumnWidth = 0;

    for (const column of columns) {
      if (sumColumnWidth >= (scrollPosition.scroll?.left || 0)) {
        gridApi.value.ensureColumnVisible(column.getColId(), 'start');
        break;
      }

      sumColumnWidth += column.getActualWidth();
    }
  });

  return {
    onRowDataUpdated,
  };
};
