import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'vue-sonner';
import { useRedisWorkspace } from '~/components/modules/redis-workspace/hooks/useRedisWorkspace';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

const mockFetch = vi.fn();

vi.stubGlobal('$fetch', mockFetch);

vi.mock('~/core/persist/storage-adapter', () => ({
  initPlatformStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/core/persist/migration', () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock('~/core/stores', async importOriginal => {
  const actual = await importOriginal<typeof import('~/core/stores')>();
  const createAsyncNoopStore = () => ({
    loadPersistData: vi.fn().mockResolvedValue(undefined),
  });

  return {
    ...actual,
    useAppConfigStore: createAsyncNoopStore,
    useAgentStore: createAsyncNoopStore,
    useWorkspacesStore: createAsyncNoopStore,
    useManagementConnectionStore: () => ({
      ...createAsyncNoopStore(),
      selectedConnection: null,
    }),
    useWSStateStore: createAsyncNoopStore,
    useEnvironmentTagStore: () => ({
      loadTags: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

const flushReactive = async () => {
  await Promise.resolve();
  await nextTick();
};

const makeConnection = () => ({
  id: 'redis-conn',
  workspaceId: 'ws-1',
  name: 'Redis Fixture',
  type: DatabaseClientType.REDIS,
  method: EConnectionMethod.STRING,
  connectionString: 'redis://127.0.0.1:6379/0',
  createdAt: '2026-04-29T00:00:00.000Z',
});

describe('useRedisWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockFetch.mockImplementation(async (url, options) => {
      if (url === '/api/redis/browser') {
        return {
          cursor: '0',
          keys: [],
          databases: [
            { index: 0, label: 'DB 0', keyCount: 1, expires: 0, avgTtl: null },
          ],
          selectedKeyDetail: null,
        };
      }

      if (url === '/api/redis/browser/value') {
        const key = (options as { body?: { key?: string } })?.body?.key;

        return key
          ? {
              key,
              type: 'string',
              ttl: -1,
              ttlLabel: 'Persisted',
              databaseIndex: 0,
              value: key,
              previewKind: 'text',
              editingSupported: true,
              memoryUsage: null,
              memoryUsageHuman: null,
              length: key.length,
              encoding: 'embstr',
              stringFormat: 'plain',
            }
          : null;
      }

      return {};
    });
  });

  it('surfaces a read-only edit unavailable state when value writes are rejected', async () => {
    mockFetch.mockImplementation(async url => {
      if (url === '/api/redis/browser') {
        return {
          cursor: '0',
          keys: [],
          databases: [
            { index: 0, label: 'DB 0', keyCount: 1, expires: 0, avgTtl: null },
          ],
          selectedKeyDetail: null,
        };
      }

      if (url === '/api/redis/browser/value') {
        throw {
          data: {
            message: "READONLY You can't write against a read only replica.",
          },
        };
      }

      return {};
    });

    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
    });

    await flushReactive();
    workspace.session.value!.selectedKey = 'orders:1';
    workspace.selectedKeyDetail.value = {
      key: 'orders:1',
      type: 'string',
      ttl: -1,
      ttlLabel: 'Persisted',
      databaseIndex: 0,
      value: 'draft',
      previewKind: 'text',
      editingSupported: true,
      memoryUsage: null,
      memoryUsageHuman: null,
      length: 5,
      encoding: 'embstr',
      stringFormat: 'plain',
    };

    await workspace.saveSelectedValue({
      previewKind: 'text',
      value: 'paid',
    });

    expect(workspace.editUnavailableReason.value).toContain('read-only');
    expect(workspace.canEditSelectedValue.value).toBe(false);
  });

  it('refreshes the browser tab when the selected key changes in the shared session', async () => {
    mockFetch.mockImplementation(async (url, options) => {
      if (url === '/api/redis/browser') {
        return {
          cursor: '0',
          keys: [],
          databases: [
            { index: 0, label: 'DB 0', keyCount: 1, expires: 0, avgTtl: null },
          ],
          selectedKeyDetail: null,
        };
      }

      if (url !== '/api/redis/browser/value') {
        return {};
      }

      const selectedKey = (options as { body?: { key?: string | null } })?.body
        ?.key;

      return selectedKey
        ? {
            key: selectedKey,
            type: 'string',
            ttl: -1,
            ttlLabel: 'Persisted',
            databaseIndex: 0,
            value: selectedKey,
            previewKind: 'text',
            editingSupported: true,
            memoryUsage: null,
            memoryUsageHuman: null,
            length: selectedKey.length,
            encoding: 'embstr',
            stringFormat: 'plain',
          }
        : null;
    });

    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
      tabInfo: ref({
        id: 'redis-browser-redis-conn',
        workspaceId: 'ws-1',
        connectionId: 'redis-conn',
        schemaId: '',
        index: 0,
        name: 'Redis Browser',
        icon: 'hugeicons:database-sync-01',
        type: TabViewType.RedisBrowser,
        routeName: 'workspaceId-connectionId-redis-tabViewId',
        routeParams: {
          workspaceId: 'ws-1',
          connectionId: 'redis-conn',
          tabViewId: 'redis-browser-redis-conn',
        },
        metadata: {
          type: TabViewType.RedisBrowser,
          selectedKey: 'orders:1',
        },
      } as any),
    });

    await flushReactive();

    expect(workspace.selectedKeyDetail.value?.key).toBe('orders:1');

    mockFetch.mockClear();
    workspace.session.value!.selectedKey = 'orders:2';
    await flushReactive();

    expect(workspace.selectedKeyDetail.value?.key).toBe('orders:2');
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/redis/browser/value',
      expect.objectContaining({
        body: expect.objectContaining({
          key: 'orders:2',
        }),
      })
    );
  });

  it('shows a success toast after saving a Redis value update', async () => {
    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
    });

    await flushReactive();
    workspace.session.value!.selectedKey = 'orders:1';
    workspace.selectedKeyDetail.value = {
      key: 'orders:1',
      type: 'string',
      ttl: -1,
      ttlLabel: 'Persisted',
      databaseIndex: 0,
      value: 'draft',
      previewKind: 'text',
      editingSupported: true,
      memoryUsage: null,
      memoryUsageHuman: null,
      length: 5,
      encoding: 'embstr',
      stringFormat: 'plain',
    };

    await workspace.saveSelectedValue({
      previewKind: 'text',
      value: 'paid',
      ttlSeconds: 300,
    });

    expect(toast.success).toHaveBeenCalledWith('Redis key saved successfully', {
      description: 'Updated orders:1',
    });
  });

  it('defaults selectedDatabaseIndex from connection string when database property is missing', async () => {
    const connWithDbInString = {
      ...makeConnection(),
      connectionString: 'redis://127.0.0.1:63279/13',
      database: undefined,
    };

    const workspace = useRedisWorkspace({
      connection: ref(connWithDbInString),
    });

    await flushReactive();

    expect(workspace.selectedDatabaseIndex.value).toBe(13);
  });

  const makeBrowserTabInfo = () =>
    ref({
      id: 'redis-browser-redis-conn',
      workspaceId: 'ws-1',
      connectionId: 'redis-conn',
      schemaId: '',
      index: 0,
      name: 'Redis Browser',
      icon: 'hugeicons:database-sync-01',
      type: TabViewType.RedisBrowser,
      routeName: 'workspaceId-connectionId-redis-tabViewId',
      routeParams: {
        workspaceId: 'ws-1',
        connectionId: 'redis-conn',
        tabViewId: 'redis-browser-redis-conn',
      },
      metadata: {
        type: TabViewType.RedisBrowser,
      },
    } as any);

  it('serves a previously fetched key detail from cache without another network call', async () => {
    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
      tabInfo: makeBrowserTabInfo(),
    });

    await flushReactive();
    workspace.session.value!.selectedKey = 'orders:1';
    await flushReactive();

    expect(workspace.selectedKeyDetail.value?.key).toBe('orders:1');

    workspace.session.value!.selectedKey = 'orders:2';
    await flushReactive();
    expect(workspace.selectedKeyDetail.value?.key).toBe('orders:2');

    mockFetch.mockClear();
    workspace.session.value!.selectedKey = 'orders:1';
    await flushReactive();

    expect(workspace.selectedKeyDetail.value?.key).toBe('orders:1');
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/redis/browser/value',
      expect.anything()
    );
  });

  it('bypasses the cache and refetches when focusKey is called for a manual refresh', async () => {
    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
      tabInfo: makeBrowserTabInfo(),
    });

    await flushReactive();
    workspace.session.value!.selectedKey = 'orders:1';
    await flushReactive();

    mockFetch.mockClear();
    await workspace.focusKey('orders:1');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/redis/browser/value',
      expect.objectContaining({
        body: expect.objectContaining({ key: 'orders:1' }),
      })
    );
  });

  it('deletes a single key, clears it from the list, and clears the selection if it was selected', async () => {
    mockFetch.mockImplementation(async (url, options) => {
      if (url === '/api/redis/browser') {
        return {
          cursor: '0',
          truncated: false,
          keys: [
            { key: 'orders:1', type: 'string', ttl: -1 },
            { key: 'orders:2', type: 'string', ttl: -1 },
          ],
          databases: [
            { index: 0, label: 'DB 0', keyCount: 2, expires: 0, avgTtl: null },
          ],
          selectedKeyDetail: null,
        };
      }

      if (url === '/api/redis/browser/value' && options?.method === 'DELETE') {
        return { deletedCount: 1 };
      }

      return {};
    });

    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
    });

    await flushReactive();
    await workspace.refreshKeys();
    workspace.session.value!.selectedKey = 'orders:1';
    await flushReactive();

    await workspace.deleteKey('orders:1');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/redis/browser/value',
      expect.objectContaining({
        method: 'DELETE',
        body: expect.objectContaining({ key: 'orders:1' }),
      })
    );
    expect(workspace.keys.value.map(item => item.key)).toEqual(['orders:2']);
    expect(workspace.session.value!.selectedKey).toBeNull();
  });

  it('deletes multiple keys in bulk without touching the selection when it is unaffected', async () => {
    mockFetch.mockImplementation(async (url, options) => {
      if (url === '/api/redis/browser') {
        return {
          cursor: '0',
          truncated: false,
          keys: [
            { key: 'orders:1', type: 'string', ttl: -1 },
            { key: 'orders:2', type: 'string', ttl: -1 },
            { key: 'inventory:1', type: 'string', ttl: -1 },
          ],
          databases: [],
          selectedKeyDetail: null,
        };
      }

      if (url === '/api/redis/browser/keys' && options?.method === 'DELETE') {
        return { deletedCount: 2 };
      }

      return {};
    });

    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
    });

    await flushReactive();
    await workspace.refreshKeys();
    workspace.session.value!.selectedKey = 'inventory:1';
    await flushReactive();

    await workspace.deleteKeys(['orders:1', 'orders:2']);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/redis/browser/keys',
      expect.objectContaining({
        method: 'DELETE',
        body: expect.objectContaining({ keys: ['orders:1', 'orders:2'] }),
      })
    );
    expect(workspace.keys.value.map(item => item.key)).toEqual(['inventory:1']);
    expect(workspace.session.value!.selectedKey).toBe('inventory:1');
  });

  it('previews the full set of keys matching a group prefix', async () => {
    mockFetch.mockImplementation(async (url, options) => {
      if (url === '/api/redis/browser') {
        const body = (options as { body?: { keyPattern?: string } })?.body;

        if (body?.keyPattern === 'orders:*') {
          return {
            cursor: '0',
            truncated: false,
            keys: [
              { key: 'orders:1', type: 'string', ttl: -1 },
              { key: 'orders:2', type: 'string', ttl: -1 },
            ],
            databases: [],
            selectedKeyDetail: null,
          };
        }

        return {
          cursor: '0',
          truncated: false,
          keys: [],
          databases: [],
          selectedKeyDetail: null,
        };
      }

      return {};
    });

    const workspace = useRedisWorkspace({
      connection: ref(makeConnection()),
    });

    await flushReactive();

    const preview = await workspace.previewGroupKeys('orders');

    expect(preview).toEqual(['orders:1', 'orders:2']);
  });
});
