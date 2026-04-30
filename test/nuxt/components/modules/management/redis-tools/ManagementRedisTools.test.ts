import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManagementRedisTools from '~/components/modules/management/redis-tools/ManagementRedisTools.vue';

const openRedisTabMock = vi.fn();
const openInstanceInsightsTabMock = vi.fn();

const workspaceMock = {
  selectedDatabaseIndex: ref(3),
};

vi.mock('~/components/modules/redis-workspace/hooks/useRedisWorkspace', () => ({
  useRedisWorkspace: () => workspaceMock,
}));

vi.mock('~/core/persist/storage-adapter', () => ({
  initPlatformStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/core/persist/migration', () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/core/composables/useTabManagement', () => ({
  useTabManagement: () => ({
    openRedisTab: openRedisTabMock,
    openInstanceInsightsTab: openInstanceInsightsTabMock,
  }),
}));

vi.mock('~/core/composables/useWorkspaceConnectionRoute', () => ({
  useWorkspaceConnectionRoute: () => ({
    workspaceId: ref('ws-1'),
  }),
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
      selectedConnection: {
        id: 'redis-conn',
        name: 'Redis Fixture',
      },
    }),
    useWSStateStore: createAsyncNoopStore,
    useEnvironmentTagStore: () => ({
      loadTags: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

describe('ManagementRedisTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceMock.selectedDatabaseIndex.value = 3;
  });

  it('opens Redis instance insights with the active database index', async () => {
    const wrapper = mount(ManagementRedisTools, {
      global: {
        stubs: {
          Button: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          Icon: true,
          ManagementSidebarHeader: {
            template: '<div />',
          },
        },
      },
    });

    await (wrapper.vm as any).openInstanceInsights();

    expect(openInstanceInsightsTabMock).toHaveBeenCalledWith({
      databaseName: 'Redis Fixture',
      databaseIndex: 3,
    });
  });

  it('opens the Redis Pub/Sub tab with the active database index', async () => {
    const wrapper = mount(ManagementRedisTools, {
      global: {
        stubs: {
          Button: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          Icon: true,
          ManagementSidebarHeader: {
            template: '<div />',
          },
        },
      },
    });

    await (wrapper.vm as any).openPubSub();

    expect(openRedisTabMock).toHaveBeenCalledWith({
      id: 'redis-pubsub-redis-conn',
      name: 'Redis Pub/Sub',
      type: 'RedisPubSub',
      metadata: {
        type: 'RedisPubSub',
        databaseIndex: 3,
      },
    });
  });
});
