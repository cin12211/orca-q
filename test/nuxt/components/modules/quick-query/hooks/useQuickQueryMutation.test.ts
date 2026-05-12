import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HASH_INDEX_ID } from '~/components/base/dynamic-table/constants';
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

  it('builds update SQL that preserves booleans, escaped strings and json arrays on save', async () => {
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
        sqlUpdateStatements: [
          `UPDATE "public"."users" SET "active" = FALSE, "profile" = '["a","b","c"]', "name" = 'O''Hara' WHERE "id" = 1`,
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

  it('builds insert SQL that preserves typed values for newly added rows on save', async () => {
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

    expect(mockFetch).toHaveBeenCalledWith('/api/tables/bulk-update', {
      method: 'POST',
      body: {
        sqlUpdateStatements: [
          `INSERT INTO "public"."users" ("name", "active", "profile", "note") VALUES ('O''Hara', TRUE, '["x","y"]', NULL)`,
        ],
        connection: 'params',
      },
      onResponseError: expect.any(Function),
    });
  });

  it('builds delete SQL that safely escapes key values', async () => {
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
        sqlDeleteStatements: [
          `DELETE FROM "public"."users" WHERE "name" = 'ada''s-row'`,
        ],
        connection: 'params',
      },
      onResponseError: expect.any(Function),
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      'Rows deleted successfully!'
    );
  });
});
