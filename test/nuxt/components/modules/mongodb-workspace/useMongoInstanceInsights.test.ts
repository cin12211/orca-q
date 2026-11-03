import { defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMongoInstanceInsights } from '~/components/modules/mongodb-workspace/hooks';

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

const overviewSample = (capturedAt: string, query: number) => ({
  version: '7.0.2',
  host: 'db:27017',
  process: 'mongod',
  storageEngine: 'wiredTiger',
  uptimeSeconds: 60,
  connections: { current: 2, available: 98, totalCreated: 5 },
  opcounters: {
    insert: 0,
    query,
    update: 0,
    delete: 0,
    getmore: 0,
    command: 0,
  },
  memory: { residentMb: 64, virtualMb: 512 },
  network: { bytesIn: 1, bytesOut: 2, numRequests: 3 },
  capturedAt,
  serverStatusError: null,
});

function mountHook() {
  let hook!: ReturnType<typeof useMongoInstanceInsights>;
  const connection = ref({ id: 'c1', database: 'shop' } as any);

  mount(
    defineComponent({
      setup() {
        hook = useMongoInstanceInsights({ connection });
        hook.autoRefresh.value = false;
        return () => h('div');
      },
    })
  );

  return { hook, connection };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useMongoInstanceInsights', () => {
  it('loads the overview section for the connection on mount', async () => {
    mockFetch.mockResolvedValueOnce(overviewSample('2026-01-01T00:00:00Z', 10));

    const { hook } = mountHook();
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mongodb/instance-insights/overview',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ database: 'shop' }),
      })
    );
    expect(hook.overview.value?.version).toBe('7.0.2');
    // A single sample cannot produce a rate yet.
    expect(hook.opcounterRates.value).toBeNull();
    expect(hook.isInitialLoading.value).toBe(false);
  });

  it('derives op rates from consecutive overview samples', async () => {
    mockFetch
      .mockResolvedValueOnce(overviewSample('2026-01-01T00:00:00Z', 10))
      .mockResolvedValueOnce(overviewSample('2026-01-01T00:00:05Z', 60));

    const { hook } = mountHook();
    await flushPromises();
    await hook.refresh();

    expect(hook.opcounterRates.value?.query).toBe(10);
    expect(hook.opcounterRates.value?.total).toBe(10);
  });

  it('fetches replication lazily when its section opens', async () => {
    mockFetch
      .mockResolvedValueOnce(overviewSample('2026-01-01T00:00:00Z', 0))
      .mockResolvedValueOnce({
        topology: 'standalone',
        role: 'standalone',
        setName: null,
        primary: null,
        me: null,
        hosts: [],
        members: [],
        membersError: null,
      });

    const { hook } = mountHook();
    await flushPromises();
    hook.activeSection.value = 'replication';
    await flushPromises();

    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/mongodb/instance-insights/replication',
      expect.anything()
    );
    expect(hook.replication.value?.topology).toBe('standalone');
  });

  it('records the server message when a request fails', async () => {
    mockFetch.mockRejectedValueOnce({
      data: { message: 'connection refused' },
    });

    const { hook } = mountHook();
    await flushPromises();

    expect(hook.error.value).toBe('connection refused');
    expect(hook.overview.value).toBeUndefined();
  });
});
