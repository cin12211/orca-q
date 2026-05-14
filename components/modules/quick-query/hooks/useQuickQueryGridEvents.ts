import { ref, type Ref } from 'vue';
import type { CellContextMenuEvent } from 'ag-grid-community';
import type { RowData } from '~/components/base/dynamic-table/utils';

interface UseQuickQueryGridEventsOptions {
  gridApi: Ref<any>;
  selectedRows: Ref<RowData[]>;
  onSelectedRows: (rows: RowData[]) => void;
  onFocusCell: (value: unknown | undefined) => void;
}

export const useQuickQueryGridEvents = ({
  gridApi,
  selectedRows,
  onSelectedRows,
  onFocusCell,
}: UseQuickQueryGridEventsOptions) => {
  const cellContextMenu = ref<CellContextMenuEvent | undefined>();
  const cellHeaderContextMenu = ref<CellContextMenuEvent | undefined>();

  const onSelectionChanged = () => {
    if (!gridApi.value) {
      return;
    }

    onSelectedRows(gridApi.value.getSelectedRows());
  };

  const onCellFocus = () => {
    const selectedCell = gridApi.value?.getFocusedCell();

    if (!selectedCell) {
      return;
    }

    const rowNode = gridApi.value?.getDisplayedRowAtIndex(
      selectedCell.rowIndex
    );
    const colId = selectedCell.column.getColId();
    const cellValue = rowNode?.data?.[colId];

    onFocusCell(cellValue ?? undefined);
  };

  const onCellContextMenu = (event: CellContextMenuEvent) => {
    if (!selectedRows.value?.length) {
      event?.node?.setSelected(true);
    }

    cellContextMenu.value = event;
  };

  const onCellHeaderContextMenu = (event: CellContextMenuEvent) => {
    cellHeaderContextMenu.value = event;
  };

  const clearCellContextMenu = () => {
    cellContextMenu.value = undefined;
    cellHeaderContextMenu.value = undefined;
  };

  return {
    cellContextMenu,
    cellHeaderContextMenu,
    onSelectionChanged,
    onCellFocus,
    onCellContextMenu,
    onCellHeaderContextMenu,
    clearCellContextMenu,
  };
};
