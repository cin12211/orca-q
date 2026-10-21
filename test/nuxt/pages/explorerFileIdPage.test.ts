import { computed, defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import ExplorerFilePage from '~/pages/[workspaceId]/[connectionId]/explorer/[fileId].vue';

const { fileContentMock, mountCounts } = vi.hoisted(() => ({
  fileContentMock: vi.fn(),
  mountCounts: { postgres: 0, redis: 0 },
}));

vi.mock('~/components/modules/raw-query/hooks/useRawQueryFileContent', () => ({
  useRawQueryFileContent: fileContentMock,
}));

const createEntryStub = (label: keyof typeof mountCounts) =>
  defineComponent({
    name: `${label}-entry-stub`,
    setup() {
      mountCounts[label] += 1;
      return () => h('div', { 'data-testid': `${label}-entry` }, label);
    },
  });

vi.mock(
  '~/components/modules/driver/postgres/raw-query/containers/PostgresRawQuery.vue',
  () => ({ __esModule: true, default: createEntryStub('postgres') })
);

vi.mock(
  '~/components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue',
  () => ({ __esModule: true, default: createEntryStub('redis') })
);

const connections = [
  { id: 'pg-1', name: 'PG one', type: DatabaseClientType.POSTGRES },
  { id: 'pg-2', name: 'PG two', type: DatabaseClientType.POSTGRES },
  { id: 'redis-1', name: 'Redis', type: DatabaseClientType.REDIS },
  { id: 'snowflake-1', name: 'Snowflake', type: DatabaseClientType.SNOWFLAKE },
];

const selectedConnectionId = ref('');
const connectionsRef = ref<typeof connections>(connections);

const createFileContent = () => ({
  fieldDefs: ref([]),
  fileContents: ref(''),
  fileVariables: ref(''),
  currentFile: ref(undefined),
  selectedConnectionId,
  updateSelectedConnection: (connectionId: string) => {
    selectedConnectionId.value = connectionId;
  },
  updateFileContent: vi.fn(),
  updateFileVariables: vi.fn(),
  connection: computed(() =>
    connections.find(item => item.id === selectedConnectionId.value)
  ),
  currentOpenedConnection: ref(undefined),
  connectionsByWsId: connectionsRef,
  updateFileCursorPos: vi.fn(),
  loadFileContent: vi.fn().mockResolvedValue(undefined),
  isFromCache: true,
});

let wrappers: ReturnType<typeof mount>[] = [];

/** The page shares one module-level connection ref, so nothing may outlive a test. */
const mountPage = () => {
  const wrapper = mount(ExplorerFilePage);
  wrappers.push(wrapper);

  return wrapper;
};

const MAX_SETTLE_ATTEMPTS = 50;

/**
 * The entries are async components, and the first loader call has to pull the
 * module through the test module runner, which takes longer than a microtask.
 * Retry until the page rendered what the assertion is about.
 */
const settleUntil = async (isReady: () => boolean) => {
  for (let attempt = 0; attempt < MAX_SETTLE_ATTEMPTS; attempt += 1) {
    await flushPromises();
    if (isReady()) return;
    await new Promise(resolve => setTimeout(resolve));
  }

  await flushPromises();
};

const settleEntry = (wrapper: ReturnType<typeof mount>, testId: string) =>
  settleUntil(() => wrapper.find(`[data-testid="${testId}"]`).exists());

describe('explorer [fileId] page', () => {
  beforeEach(() => {
    selectedConnectionId.value = '';
    connectionsRef.value = connections;
    mountCounts.postgres = 0;
    mountCounts.redis = 0;
    fileContentMock.mockReset();
    fileContentMock.mockImplementation(createFileContent);
  });

  afterEach(() => {
    wrappers.forEach(wrapper => wrapper.unmount());
    wrappers = [];
  });

  it('waits instead of claiming the engine is unsupported while the connection is unknown', async () => {
    connectionsRef.value = [];
    const wrapper = mountPage();
    await settleUntil(() => false);

    expect(wrapper.text()).not.toContain('Raw query is not supported');
    expect(wrapper.text()).not.toContain('Connection not found');
    expect(wrapper.findComponent({ name: 'LoadingOverlay' }).exists()).toBe(
      true
    );
  });

  it('shows a not-found state, not a spinner, when the store is hydrated but the connection is missing', async () => {
    selectedConnectionId.value = 'deleted-connection';

    const wrapper = mountPage();
    await settleUntil(() => wrapper.text().includes('Connection not found'));

    expect(wrapper.text()).toContain('Connection not found');
    expect(wrapper.findComponent({ name: 'LoadingOverlay' }).exists()).toBe(
      false
    );
  });

  it('renders the engine entry of the selected connection and re-resolves on an engine change', async () => {
    selectedConnectionId.value = 'pg-1';

    const wrapper = mountPage();
    await settleEntry(wrapper, 'postgres-entry');

    expect(wrapper.find('[data-testid="postgres-entry"]').exists()).toBe(true);
    expect(mountCounts.postgres).toBe(1);

    selectedConnectionId.value = 'redis-1';
    await settleEntry(wrapper, 'redis-entry');

    expect(wrapper.find('[data-testid="redis-entry"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="postgres-entry"]').exists()).toBe(false);
    expect(mountCounts.redis).toBe(1);
  });

  it('keeps the same entry mounted when switching between connections of one engine', async () => {
    selectedConnectionId.value = 'pg-1';

    const wrapper = mountPage();
    await settleEntry(wrapper, 'postgres-entry');

    expect(mountCounts.postgres).toBe(1);

    selectedConnectionId.value = 'pg-2';
    await settleUntil(() => false);

    expect(wrapper.find('[data-testid="postgres-entry"]').exists()).toBe(true);
    expect(mountCounts.postgres).toBe(1);
  });

  it('shows the unsupported state for an engine without a raw query editor', async () => {
    selectedConnectionId.value = 'snowflake-1';

    const wrapper = mountPage();
    await settleUntil(() =>
      wrapper.text().includes('Raw query is not supported')
    );

    expect(wrapper.text()).toContain('Raw query is not supported');
  });
});
