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

    expect(toast.success).toHaveBeenCalledWith(
      'Redis key saved successfully',
      {
        description: 'Updated orders:1',
      }
    );
  });
});
