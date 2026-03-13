import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTableQueryBuilder } from '~/core/composables/useTableQueryBuilder';
import { ComposeOperator } from '~/core/constants';

vi.mock('~/components/modules/quick-query/utils', () => ({
  formatWhereClause: vi.fn(() => 'WHERE "id" = 1'),
}));

vi.mock('~/core/stores', () => ({
  useQuickQueryLogs: vi.fn(() => ({
    createLog: vi.fn(),
  })),
}));

const { useFetchMock, refreshTableDataMock, refreshCountMock } = vi.hoisted(
  () => ({
    useFetchMock: vi.fn(),
    refreshTableDataMock: vi.fn(),
    refreshCountMock: vi.fn(),
  })
);

mockNuxtImport('useFetch', () => useFetchMock);

const createComposable = ({
  primaryKeys = ['id'],
  columns = ['id', 'name'],
}: {
  primaryKeys?: string[];
  columns?: string[];
} = {}) => {
  useFetchMock.mockReset();

  useFetchMock
    .mockReturnValueOnce({
      data: ref({ result: [{ id: 1, name: 'A' }] }),
      status: ref('success'),
      refresh: refreshTableDataMock,
    })
    .mockReturnValueOnce({
      data: ref({ result: [{ count: '42' }] }),
      status: ref('success'),
      refresh: refreshCountMock,
    });

  return useTableQueryBuilder({
    connection: ref('postgres://localhost:5432/db') as any,
    tableName: 'users',
    primaryKeys: ref(primaryKeys),
    columns: ref(columns),
    schemaName: 'public',
    workspaceId: ref('ws-1'),
    connectionId: ref('conn-1'),
    isPersist: false,
  });
};

describe('useTableQueryBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds base query string from schema and table', () => {
    const composable = createComposable();

    expect(composable.baseQueryString.value).toContain('from "public"."users"');
  });

  it('builds main query string with default limit and offset', () => {
    const composable = createComposable();

    expect(composable.queryString.value).toContain('LIMIT 100');
    expect(composable.queryString.value).toContain('OFFSET 0');
  });

  it('uses primary key for default order by when present', () => {
    const composable = createComposable({
      primaryKeys: ['id'],
      columns: ['id', 'name'],
    });

    expect(composable.queryString.value).toContain('ORDER BY "id" ASC');
  });

  it('falls back to first column when no primary key exists', () => {
    const composable = createComposable({
      primaryKeys: [],
      columns: ['name', 'email'],
    });

    expect(composable.queryString.value).toContain('ORDER BY "name" ASC');
  });

  it('has empty where clause when filter UI is hidden', () => {
    const composable = createComposable();

    expect(composable.whereClauses.value).toBe('');
  });

  it('uses formatted where clause when filters are visible', () => {
    const composable = createComposable();

    composable.isShowFilters.value = true;
    composable.filters.value = [{ field: 'id', value: 1 } as any];
    composable.composeWith.value = ComposeOperator.AND;

    expect(composable.whereClauses.value).toBe('WHERE "id" = 1');
  });

  it('does not update pagination for invalid values', () => {
    const composable = createComposable();

    composable.onUpdatePagination({ limit: -1, offset: -5 });

    expect(composable.pagination.limit).toBe(100);
    expect(composable.pagination.offset).toBe(0);
    expect(refreshTableDataMock).not.toHaveBeenCalled();
  });

  it('does not go below zero when moving to previous page from zero', () => {
    const composable = createComposable();

    composable.onPreviousPage();

    expect(composable.pagination.offset).toBe(0);
    expect(refreshTableDataMock).toHaveBeenCalledTimes(1);
  });

  it('computes total rows from count query result', () => {
    const composable = createComposable();

    expect(composable.totalRows.value).toBe(42);
  });

  it('exposes table data from query response', () => {
    const composable = createComposable();

    expect(composable.data.value).toEqual([{ id: 1, name: 'A' }]);
  });

  it('computes previous page availability from offset', () => {
    const composable = createComposable();

    expect(composable.isAllowPreviousPage.value).toBe(false);

    composable.pagination.offset = 100;

    expect(composable.isAllowPreviousPage.value).toBe(true);
  });
});
