import type { Ref } from 'vue';
import type { GridApi } from 'ag-grid-community';

/**
 * Wires the two universal selection signals every AG Grid consumer needs:
 *
 * - `onSelectionChanged`: forwards the current selected rows up to the caller
 * - `onCellFocus`: reads the focused cell value out of the grid and forwards it
 *
 * The grid API ref is passed in (not created here) so the same instance can be
 * shared with the rest of the wrapper component.
 */
export const useDataGridSelection = ({
  gridApi,
  onSelectedRows,
  onFocusCell,
}: {
  gridApi: Ref<GridApi | null>;
  onSelectedRows: (rows: unknown[]) => void;
  onFocusCell: (value: unknown | undefined) => void;
}) => {
  const onSelectionChanged = () => {
    if (!gridApi.value) return;
    onSelectedRows(gridApi.value.getSelectedRows());
  };

  const onCellFocus = () => {
    const selectedCell = gridApi.value?.getFocusedCell();
    if (!selectedCell) return;

    const rowNode = gridApi.value?.getDisplayedRowAtIndex(
      selectedCell.rowIndex
    );
    const colId = selectedCell.column.getColId();
    const cellValue = rowNode?.data?.[colId];

    onFocusCell(cellValue ?? undefined);
  };

  return { onSelectionChanged, onCellFocus };
};
