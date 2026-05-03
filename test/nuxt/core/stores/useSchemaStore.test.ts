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
});
