import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import {
  EConnectionMethod,
  EConnectionProviderKind,
  EManagedSqliteProvider,
} from '~/core/types/entities/connection.entity';

const mockFetch = vi.fn();

vi.stubGlobal('$fetch', mockFetch);

vi.mock('~/core/storage', () => ({
  createStorageApis: () => ({
    workspaceStateStorage: {
      create: vi.fn(),
      update: vi.fn(),
      getAll: vi.fn().mockResolvedValue([]),
    },
  }),
}));

vi.mock('~/core/composables/useWorkspaceConnectionRoute', () => ({
  useWorkspaceConnectionRoute: () => ({
    workspaceId: ref('ws-1'),
    connectionId: ref('conn-1'),
  }),
}));

describe('useSchemaStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('loads schemas for managed SQLite connections without host or connection string', async () => {
    mockFetch.mockResolvedValue([
      {
        name: 'main',
        tables: ['users'],
        views: [],
        functions: [],
        table_details: {},
        view_details: {},
      },
    ]);

    const store = useSchemaStore();

    await store.fetchSchemas({
      connectionId: 'conn-1',
      workspaceId: 'ws-1',
      connection: {
        id: 'conn-1',
        workspaceId: 'ws-1',
        name: 'Turso Demo',
        type: DatabaseClientType.SQLITE3,
        method: EConnectionMethod.MANAGED,
        providerKind: EConnectionProviderKind.TURSO,
        managedSqlite: {
          provider: EManagedSqliteProvider.TURSO,
          url: 'libsql://demo.turso.io',
          authToken: 'token',
        },
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/metadata/meta-data',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          providerKind: EConnectionProviderKind.TURSO,
          managedSqlite: {
            provider: EManagedSqliteProvider.TURSO,
            url: 'libsql://demo.turso.io',
            authToken: 'token',
          },
        }),
      })
    );
    expect(store.schemas['conn-1']?.[0]?.name).toBe('main');
  });

  it('loads schemas for Cloudflare D1 connections without host or connection string', async () => {
    mockFetch.mockResolvedValue([
      {
        name: 'main',
        tables: ['audit_logs'],
        views: [],
        functions: [],
        table_details: {},
        view_details: {},
      },
    ]);

    const store = useSchemaStore();

    await store.fetchSchemas({
      connectionId: 'conn-d1',
      workspaceId: 'ws-1',
      connection: {
        id: 'conn-d1',
        workspaceId: 'ws-1',
        name: 'Cloudflare D1',
        type: DatabaseClientType.SQLITE3,
        method: EConnectionMethod.MANAGED,
        providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
        managedSqlite: {
          provider: EManagedSqliteProvider.CLOUDFLARE_D1,
          accountId: 'account-id',
          databaseId: 'database-id',
          apiToken: 'token',
        },
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/metadata/meta-data',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          providerKind: EConnectionProviderKind.CLOUDFLARE_D1,
          managedSqlite: {
            provider: EManagedSqliteProvider.CLOUDFLARE_D1,
            accountId: 'account-id',
            databaseId: 'database-id',
            apiToken: 'token',
          },
        }),
      })
    );
    expect(store.schemas['conn-d1']?.[0]?.name).toBe('main');
  });

  it('skips schema fetches for Redis connections', async () => {
    const store = useSchemaStore();

    await store.fetchSchemas({
      connectionId: 'conn-redis',
      workspaceId: 'ws-1',
      connection: {
        id: 'conn-redis',
        workspaceId: 'ws-1',
        name: 'Redis Fixture',
        type: DatabaseClientType.REDIS,
        method: EConnectionMethod.STRING,
        connectionString: 'redis://127.0.0.1:6379',
        createdAt: '2026-04-28T00:00:00.000Z',
      },
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(store.schemaLoadSessions['conn-redis']?.status).toBe('idle');
    expect(store.schemaLoadSessions['conn-redis']?.statusMessage).toContain(
      'only available for SQL connections'
    );
  });

  it('requests names-only metadata at connect time and stores schemas with no children', async () => {
    mockFetch.mockResolvedValue([
      {
        name: 'public',
        tables: null,
        views: null,
        functions: null,
        table_details: null,
        view_details: null,
      },
      {
        name: 'analytics',
        tables: null,
        views: null,
        functions: null,
        table_details: null,
        view_details: null,
      },
    ]);

    const store = useSchemaStore();
    const connection = {
      id: 'conn-1',
      workspaceId: 'ws-1',
      name: 'Postgres',
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
      connectionString: 'postgresql://user:pass@localhost:5432/db',
      createdAt: '2026-04-28T00:00:00.000Z',
    };

    await store.fetchSchemas({
      connectionId: 'conn-1',
      workspaceId: 'ws-1',
      connection,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/metadata/meta-data',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ namesOnly: true }),
      })
    );

    expect(store.schemas['conn-1']).toHaveLength(2);
    expect(store.schemas['conn-1']?.[0]).toMatchObject({
      name: 'public',
      tables: [],
      views: [],
      functions: [],
      tableDetails: null,
      viewDetails: null,
    });
  });

  it('stores the is_system flag from names-only metadata and keeps it after loading that schema', async () => {
    const nameOnly = (name: string, is_system: boolean) => ({
      name,
      is_system,
      tables: null,
      views: null,
      functions: null,
      table_details: null,
      view_details: null,
    });
    const connection = {
      id: 'conn-sys',
      workspaceId: 'ws-1',
      name: 'Postgres',
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
      connectionString: 'postgresql://user:pass@localhost:5432/db',
      createdAt: '2026-04-28T00:00:00.000Z',
    };

    mockFetch.mockResolvedValueOnce([
      nameOnly('public', false),
      nameOnly('pg_catalog', true),
    ]);

    const store = useSchemaStore();
    await store.fetchSchemas({
      connectionId: 'conn-sys',
      workspaceId: 'ws-1',
      connection,
    });

    expect(
      store.schemas['conn-sys']?.map(schema => [schema.name, schema.isSystem])
    ).toEqual([
      ['public', false],
      ['pg_catalog', true],
    ]);

    mockFetch.mockResolvedValueOnce([
      {
        ...nameOnly('pg_catalog', true),
        tables: ['pg_class'],
        views: [],
        functions: [],
        table_details: {},
        view_details: {},
      },
    ]);

    await store.fetchSchemaDetail({
      connectionId: 'conn-sys',
      workspaceId: 'ws-1',
      connection,
      schemaName: 'pg_catalog',
    });

    const pgCatalog = store.schemas['conn-sys']?.find(
      schema => schema.name === 'pg_catalog'
    );
    expect(pgCatalog).toMatchObject({ isSystem: true, tables: ['pg_class'] });
  });

  describe('fetchSchemaDetail', () => {
    const connection = {
      id: 'conn-1',
      workspaceId: 'ws-1',
      name: 'Postgres',
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
      connectionString: 'postgresql://user:pass@localhost:5432/db',
      createdAt: '2026-04-28T00:00:00.000Z',
    };

    const fullSchemaResponse = [
      {
        name: 'public',
        tables: ['users', 'orders'],
        views: [],
        functions: [],
        table_details: {
          users: {
            table_id: 'public.users',
            columns: [],
            foreign_keys: [],
            primary_keys: [],
          },
        },
        view_details: {},
      },
    ];

    it('fetches full metadata for a single schema and merges it into the cache', async () => {
      mockFetch.mockResolvedValue(fullSchemaResponse);

      const store = useSchemaStore();

      await store.fetchSchemaDetail({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
        schemaName: 'public',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metadata/meta-data',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ schemaName: 'public' }),
        })
      );

      const body = mockFetch.mock.calls[0]?.[1]?.body;
      expect(body.namesOnly).toBeUndefined();

      expect(store.schemas['conn-1']?.[0]).toMatchObject({
        name: 'public',
        tables: ['users', 'orders'],
      });
      expect(store.schemas['conn-1']?.[0]?.tableDetails?.users).toBeDefined();
    });

    it('preserves other already-cached schemas when merging one schema detail', async () => {
      const store = useSchemaStore();

      // seed a names-only cache with two schemas first
      mockFetch.mockResolvedValueOnce([
        {
          name: 'public',
          tables: null,
          views: null,
          functions: null,
          table_details: null,
          view_details: null,
        },
        {
          name: 'analytics',
          tables: null,
          views: null,
          functions: null,
          table_details: null,
          view_details: null,
        },
      ]);

      await store.fetchSchemas({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
      });

      mockFetch.mockResolvedValueOnce(fullSchemaResponse);

      await store.fetchSchemaDetail({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
        schemaName: 'public',
      });

      expect(store.schemas['conn-1']).toHaveLength(2);
      expect(
        store.schemas['conn-1']?.find(s => s.name === 'analytics')
      ).toMatchObject({ tables: [] });
      expect(
        store.schemas['conn-1']?.find(s => s.name === 'public')
      ).toMatchObject({ tables: ['users', 'orders'] });
    });

    it('memoizes: repeated calls for the same schema do not refetch', async () => {
      mockFetch.mockResolvedValue(fullSchemaResponse);

      const store = useSchemaStore();

      await store.fetchSchemaDetail({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
        schemaName: 'public',
      });

      await store.fetchSchemaDetail({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
        schemaName: 'public',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('bypasses memoization and refetches when isRefresh is true', async () => {
      mockFetch.mockResolvedValue(fullSchemaResponse);

      const store = useSchemaStore();

      await store.fetchSchemaDetail({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
        schemaName: 'public',
      });

      await store.fetchSchemaDetail({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
        schemaName: 'public',
        isRefresh: true,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not fetch when schemaName is missing', async () => {
      const store = useSchemaStore();

      await store.fetchSchemaDetail({
        connectionId: 'conn-1',
        workspaceId: 'ws-1',
        connection,
        schemaName: '',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not fetch for unsupported (Redis) connections', async () => {
      const store = useSchemaStore();

      await store.fetchSchemaDetail({
        connectionId: 'conn-redis',
        workspaceId: 'ws-1',
        connection: {
          id: 'conn-redis',
          workspaceId: 'ws-1',
          name: 'Redis Fixture',
          type: DatabaseClientType.REDIS,
          method: EConnectionMethod.STRING,
          connectionString: 'redis://127.0.0.1:6379',
          createdAt: '2026-04-28T00:00:00.000Z',
        },
        schemaName: 'public',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
