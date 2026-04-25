import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HASH_INDEX_ID } from '~/components/base/dynamic-table/constants';
import { useQuickQueryMutation } from '~/components/modules/quick-query/hooks/useQuickQueryMutation';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('vue-sonner', () => ({
  toast: mockToast,
}));

vi.mock('~/core/helpers', () => ({
  copyRowsToClipboard: vi.fn(),
}));

const createGridApi = () => {
  const selectedRow = { setSelected: vi.fn() };

  return {
    applyTransaction: vi.fn(),
    clearFocusedCell: vi.fn(),
    deselectAll: vi.fn(),
    forEachNode: vi.fn((callback: () => void) => {
      callback();
    }),
    getRowNode: vi.fn(() => selectedRow),
    setFocusedCell: vi.fn(),
  };
};

const createMutation = () => {
  const gridApi = createGridApi();
  const refreshCount = vi.fn();
  const refreshTableData = vi.fn();
  const quickQueryTableRef = ref({
    gridApi,
    editedCells: [],
  }) as any;

  const mutation = useQuickQueryMutation({
    tableName: 'users',
    schemaName: 'public',
    primaryKeys: ref(['id']),
    columnNames: ref(['id', 'name']),
    data: ref([{ id: 1, name: 'Alice' }]),
    selectedRows: ref([]),
    pagination: { offset: 0, limit: 25 },
    addHistoryLog: vi.fn(),
    refreshTableData,
    refreshCount,
    openErrorModal: ref(false),
    errorMessage: ref(undefined),
    quickQueryTableRef,
    connection: ref(undefined),
  });

  return {
    gridApi,
    mutation,
    quickQueryTableRef,
    refreshCount,
    refreshTableData,
  };
};

describe('useQuickQueryMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts a newly added row as a pending change immediately', () => {
    const { mutation, quickQueryTableRef, gridApi } = createMutation();

    mutation.onAddEmptyRow();

    expect(gridApi.applyTransaction).toHaveBeenCalledWith({
      add: [{ [HASH_INDEX_ID]: 2, id: undefined, name: undefined }],
      addIndex: 1,
    });
    expect(quickQueryTableRef.value.editedCells).toEqual([
      {
        rowId: 1,
        changedData: {},
        isNewRow: true,
      },
    ]);
    expect(mutation.pendingChangesCount.value).toBe(1);
    expect(mutation.hasEditedRows.value).toBe(true);
  });

  it('counts edited rows and new rows but ignores reverted rows', () => {
    const { mutation, quickQueryTableRef } = createMutation();

    quickQueryTableRef.value.editedCells = [
      {
        rowId: 0,
        changedData: {},
      },
      {
        rowId: 1,
        changedData: {},
        isNewRow: true,
      },
      {
        rowId: 2,
        changedData: { name: 'Bob' },
      },
    ];

    expect(mutation.pendingChangesCount.value).toBe(2);
    expect(mutation.hasEditedRows.value).toBe(true);
  });

  it('discards pending changes and refreshes the grid data', () => {
    const {
      mutation,
      quickQueryTableRef,
      gridApi,
      refreshCount,
      refreshTableData,
    } = createMutation();

    quickQueryTableRef.value.editedCells = [
      {
        rowId: 0,
        changedData: { name: 'Bob' },
      },
      {
        rowId: 1,
        changedData: {},
        isNewRow: true,
      },
    ];

    mutation.onDiscardChanges();

    expect(quickQueryTableRef.value.editedCells).toEqual([]);
    expect(gridApi.deselectAll).toHaveBeenCalledTimes(1);
    expect(gridApi.clearFocusedCell).toHaveBeenCalledTimes(1);
    expect(refreshCount).toHaveBeenCalledTimes(1);
    expect(refreshTableData).toHaveBeenCalledTimes(1);
    expect(mockToast.info).toHaveBeenCalledWith('Changes discarded.');
  });
});
