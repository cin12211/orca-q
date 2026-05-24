import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HASH_INDEX_ID,
  NEW_ROW_FLAG_ID,
} from '~/components/base/data-grid/constants';
import { useQuickQueryMutation } from '~/components/modules/quick-query/hooks/useQuickQueryMutation';

const { mockToast, mockFetch, mockGetConnectionParams } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
  },
  mockFetch: Object.assign(vi.fn(), {
    raw: vi.fn(async () => ({ _data: {} })),
    create: vi.fn(),
  }),
  mockGetConnectionParams: vi.fn(() => ({})),
}));

vi.mock('vue-sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/core/helpers/connection-helper', () => ({
  getConnectionParams: mockGetConnectionParams,
}));

vi.mock('~/core/helpers', () => ({
  copyRowsToClipboard: vi.fn(),
}));

vi.stubGlobal('$fetch', mockFetch);

const createGridApi = () => {
  const selectedRow = { setSelected: vi.fn() };

  return {
    applyTransaction: vi.fn(),
    clearFocusedCell: vi.fn(),
    deselectAll: vi.fn(),
    forEachNode: vi.fn((callback: () => void) => {
      callback();
    }),
    getDisplayedRowAtIndex: vi.fn(() => selectedRow),
    getRowNode: vi.fn(() => selectedRow),
    setFocusedCell: vi.fn(),
  };
};

const createMutation = ({
  primaryKeys = ['id'],
  columnNames = ['id', 'name'],
  data = [{ id: 1, name: 'Alice' }],
}: {
  primaryKeys?: string[];
  columnNames?: string[];
  data?: Record<string, any>[];
} = {}) => {
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
    primaryKeys: ref(primaryKeys),
    columnNames: ref(columnNames),
    data: ref(data),
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
    mockFetch.mockResolvedValue({ queryTime: 12 });
    mockFetch.raw.mockResolvedValue({ _data: {} });
    mockFetch.create.mockReturnValue(mockFetch);
    mockGetConnectionParams.mockReturnValue({ connection: 'params' });
  });

  it('counts a newly added row as a pending change immediately', () => {
    const { mutation, quickQueryTableRef, gridApi } = createMutation();

    mutation.onAddEmptyRow();

    expect(gridApi.applyTransaction).toHaveBeenCalledWith({
      add: [
        expect.objectContaining({
          [HASH_INDEX_ID]: 2,
          id: undefined,
          name: undefined,
          [NEW_ROW_FLAG_ID]: true,
        }),
      ],
      addIndex: 1,
    });
    expect(quickQueryTableRef.value.editedCells).toEqual([
      expect.objectContaining({
        changedData: {},
        isNewRow: true,
      }),
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

  it('sends raw update mutation that preserves booleans, escaped strings and json arrays on save', async () => {
    const { mutation, quickQueryTableRef, refreshCount, refreshTableData } =
      createMutation();

    quickQueryTableRef.value.editedCells = [
      {
        rowId: 0,
        changedData: {
          active: false,
          profile: '["a","b","c"]',
          name: "O'Hara",
        },
      },
    ];

    await mutation.onSaveData();

    expect(mockFetch).toHaveBeenCalledWith('/api/tables/bulk-update', {
      method: 'POST',
      body: {
        tableName: 'users',
        schemaName: 'public',
        pKeys: ['id'],
        updates: [
          {
            pKeyValue: { id: 1, name: 'Alice' },
            update: { active: false, profile: '["a","b","c"]', name: "O'Hara" },
          },
        ],
        connection: 'params',
      },
      onResponseError: expect.any(Function),
    });
    expect(quickQueryTableRef.value.editedCells).toEqual([]);
    expect(refreshCount).toHaveBeenCalledTimes(1);
    expect(refreshTableData).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith('Data saved successfully!');
  });

  it('sends raw insertItems to bulk-insert endpoint for newly added rows on save', async () => {
    const { mutation, quickQueryTableRef } = createMutation();

    quickQueryTableRef.value.editedCells = [
      {
        rowId: 1,
        isNewRow: true,
        changedData: {
          name: "O'Hara",
          active: true,
          profile: '["x","y"]',
          note: null,
        },
      },
    ];

    await mutation.onSaveData();

    expect(mockFetch).toHaveBeenCalledWith('/api/tables/bulk-insert', {
      method: 'POST',
      body: {
        tableName: 'users',
        schemaName: 'public',
        insertItems: [
          { name: "O'Hara", active: true, profile: '["x","y"]', note: null },
        ],
        connection: 'params',
      },
      onResponseError: expect.any(Function),
    });
  });

  it('calls both bulk-update and bulk-insert in parallel when mixed changes exist on save', async () => {
    const { mutation, quickQueryTableRef } = createMutation({
      data: [{ id: 1, name: 'Alice' }],
    });

    quickQueryTableRef.value.editedCells = [
      { rowId: 0, changedData: { name: 'Updated' } },
      { rowId: 99, isNewRow: true, changedData: { name: 'New', active: true } },
    ];

    await mutation.onSaveData();

    const calls = mockFetch.mock.calls.map((c: any[]) => c[0]);
    expect(calls).toContain('/api/tables/bulk-update');
    expect(calls).toContain('/api/tables/bulk-insert');
  });

  it('sends raw pKeyValues for deletion without building SQL at FE', async () => {
    const { mutation } = createMutation({
      primaryKeys: ['name'],
      data: [{ id: 7, name: "ada's-row" }],
    });

    mutation.onSelectedRowsChange([
      {
        name: "ada's-row",
      },
    ]);

    await mutation.onDeleteRows();

    expect(mockFetch).toHaveBeenCalledWith('/api/tables/bulk-delete', {
      method: 'POST',
      body: {
        tableName: 'users',
        schemaName: 'public',
        pKeys: ['name'],
        pKeyValues: [{ name: "ada's-row" }],
        connection: 'params',
      },
      onResponseError: expect.any(Function),
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      'Rows deleted successfully!'
    );
  });

  it('sends full pKeyValues array to BE even when count exceeds 500', async () => {
    const data = Array.from({ length: 600 }, (_, i) => ({
      id: i + 1,
      name: `row${i}`,
    }));
    const { mutation } = createMutation({
      primaryKeys: ['id'],
      data,
    });

    const selectedRows = data.map(r => ({ id: r.id }));
    mutation.onSelectedRowsChange(selectedRows);

    await mutation.onDeleteRows();

    expect(mockFetch).toHaveBeenCalledWith('/api/tables/bulk-delete', {
      method: 'POST',
      body: {
        tableName: 'users',
        schemaName: 'public',
        pKeys: ['id'],
        pKeyValues: selectedRows,
        connection: 'params',
      },
      onResponseError: expect.any(Function),
    });
  });

  it('sends full updates array to bulk-update BE even when count exceeds 500', async () => {
    const data = Array.from({ length: 600 }, (_, i) => ({
      id: i + 1,
      name: `row${i}`,
    }));
    const { mutation, quickQueryTableRef } = createMutation({
      primaryKeys: ['id'],
      data,
    });

    quickQueryTableRef.value.editedCells = data.map((row, i) => ({
      rowId: i,
      changedData: { name: `updated${i}` },
    }));

    await mutation.onSaveData();

    expect(mockFetch).toHaveBeenCalledWith('/api/tables/bulk-update', {
      method: 'POST',
      body: expect.objectContaining({
        tableName: 'users',
        schemaName: 'public',
        pKeys: ['id'],
        updates: expect.arrayContaining([
          expect.objectContaining({
            pKeyValue: expect.any(Object),
            update: expect.any(Object),
          }),
        ]),
      }),
      onResponseError: expect.any(Function),
    });

    const callBody = mockFetch.mock.calls[0][1].body;
    expect(callBody.updates).toHaveLength(600);
  });
});
