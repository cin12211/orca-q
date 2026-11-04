import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useDataGridSelection } from '~/components/base/data-grid/hooks/useDataGridSelection';

describe('useDataGridSelection', () => {
  it('forwards selected rows and focused cell without forcing scroll', () => {
    const rowData = { id: 1, name: 'alpha' };
    const gridApi = ref({
      getSelectedRows: vi.fn(() => [rowData]),
      getSelectedNodes: vi.fn(() => [{ rowIndex: 4 }]),
      getFocusedCell: vi.fn(() => ({
        rowIndex: 4,
        column: { getColId: () => 'name' },
      })),
      getDisplayedRowAtIndex: vi.fn(() => ({ data: rowData })),
      ensureIndexVisible: vi.fn(),
      ensureColumnVisible: vi.fn(),
    } as any);

    const onSelectedRows = vi.fn();
    const onFocusCell = vi.fn();

    const { onSelectionChanged, onCellFocus } = useDataGridSelection({
      gridApi,
      onSelectedRows,
      onFocusCell,
    });

    onSelectionChanged();
    onCellFocus();

    expect(onSelectedRows).toHaveBeenCalledWith([rowData]);
    expect(onFocusCell).toHaveBeenCalledWith('alpha');
    expect(gridApi.value.ensureIndexVisible).not.toHaveBeenCalled();
    expect(gridApi.value.ensureColumnVisible).not.toHaveBeenCalled();
  });

  it('does not emit a focused value when the grid has no focused cell', () => {
    const gridApi = ref({
      getSelectedRows: vi.fn(() => []),
      getSelectedNodes: vi.fn(() => [{ rowIndex: 2 }]),
      getFocusedCell: vi.fn(() => null),
      getDisplayedRowAtIndex: vi.fn(),
      ensureIndexVisible: vi.fn(),
      ensureColumnVisible: vi.fn(),
    } as any);

    const onFocusCell = vi.fn();

    const { onSelectionChanged, onCellFocus } = useDataGridSelection({
      gridApi,
      onSelectedRows: vi.fn(),
      onFocusCell,
    });

    onSelectionChanged();
    onCellFocus();

    expect(gridApi.value.ensureIndexVisible).not.toHaveBeenCalled();
    expect(gridApi.value.ensureColumnVisible).not.toHaveBeenCalled();
    expect(onFocusCell).not.toHaveBeenCalled();
  });
});
