import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTableSize } from '~/core/composables/useTableSize';
import { useAppContext } from '~/core/contexts/useAppContext';

vi.mock('~/core/contexts/useAppContext', () => ({
  useAppContext: vi.fn(),
}));

const { useFetchMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(),
}));

mockNuxtImport('useFetch', () => useFetchMock);

describe('useTableSize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppContext as any).mockReturnValue({
      connectionStore: {
        selectedConnection: {
          connectionString: 'postgres://localhost:5432/db',
        },
      },
    });
  });

  it('calls table size endpoint with expected method', () => {
    useFetchMock.mockReturnValue({
      data: ref({}),
      status: ref('success'),
    });

    useTableSize({ tableName: 'users', schemaName: 'public' });

    const [url, options] = useFetchMock.mock.calls[0];
    expect(url).toBe('/api/tables/size');
    expect(options.method).toBe('POST');
  });

  it('passes table and schema in body', () => {
    useFetchMock.mockReturnValue({ data: ref({}), status: ref('success') });

    useTableSize({ tableName: 'orders', schemaName: 'sales' });

    const [url, options] = useFetchMock.mock.calls[0];
    expect(url).toBe('/api/tables/size');
    expect(options.body.tableName).toBe('orders');
    expect(options.body.schema).toBe('sales');
  });

  it('includes connection string from app context', () => {
    useFetchMock.mockReturnValue({ data: ref({}), status: ref('success') });

    useTableSize({ tableName: 'users', schemaName: 'public' });

    const [url, options] = useFetchMock.mock.calls[0];
    expect(url).toBe('/api/tables/size');
    expect(options.body.dbConnectionString).toBe(
      'postgres://localhost:5432/db'
    );
  });

  it('builds stable query key from table and schema', () => {
    useFetchMock.mockReturnValue({ data: ref({}), status: ref('success') });

    useTableSize({ tableName: 'users', schemaName: 'public' });

    const [url, options] = useFetchMock.mock.calls[0];
    expect(url).toBe('/api/tables/size');
    expect(options.key).toBe('table-size-users-public');
  });

  it('returns computed table size object from fetch data', () => {
    useFetchMock.mockReturnValue({
      data: ref({ tableSize: '10 MB', dataSize: '6 MB', indexSize: '4 MB' }),
      status: ref('success'),
    });

    const { tableSize } = useTableSize({
      tableName: 'users',
      schemaName: 'public',
    });

    expect(tableSize.value.tableSize).toBe('10 MB');
    expect(tableSize.value.dataSize).toBe('6 MB');
    expect(tableSize.value.indexSize).toBe('4 MB');
  });

  it('returns empty object when fetch data is undefined', () => {
    useFetchMock.mockReturnValue({
      data: ref(undefined),
      status: ref('pending'),
    });

    const { tableSize } = useTableSize({
      tableName: 'users',
      schemaName: 'public',
    });

    expect(tableSize.value).toEqual({});
  });

  it('passes through status ref from useFetch', () => {
    const status = ref('pending');
    useFetchMock.mockReturnValue({ data: ref({}), status });

    const { status: composableStatus } = useTableSize({
      tableName: 'users',
      schemaName: 'public',
    });

    expect(composableStatus.value).toBe('pending');
  });

  it('handles missing selected connection safely', () => {
    (useAppContext as any).mockReturnValue({
      connectionStore: {
        selectedConnection: undefined,
      },
    });

    useFetchMock.mockReturnValue({ data: ref({}), status: ref('success') });

    expect(() =>
      useTableSize({ tableName: 'users', schemaName: 'public' })
    ).not.toThrow();
  });
});
