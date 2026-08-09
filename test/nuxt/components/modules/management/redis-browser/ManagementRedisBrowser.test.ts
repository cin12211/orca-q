import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManagementRedisBrowser from '~/components/modules/management/redis-browser/ManagementRedisBrowser.vue';
import { TabViewType } from '~/core/stores/useTabViewsStore';

const openRedisTabMock = vi.fn();
const openKeyMock = vi.fn();
const deleteKeyMock = vi.fn().mockResolvedValue(undefined);
const deleteKeysMock = vi.fn().mockResolvedValue(undefined);
const previewGroupKeysMock = vi
  .fn()
  .mockResolvedValue(['orders:1', 'orders:2']);

const workspaceMock = {
  selectedDatabaseIndex: ref(2),
  keyPattern: ref('orders:*'),
  databases: ref([
    { index: 2, label: 'DB 2', keyCount: 4, expires: 0, avgTtl: null },
  ]),
  loadingKeys: ref(false),
  keys: ref([{ key: 'orders:1', type: 'string', ttl: -1 }]),
  session: ref({ selectedKey: null, viewMode: 'tree' }),
  refreshKeys: vi.fn(),
  openKey: openKeyMock,
  focusKey: vi.fn(),
  deleteKey: deleteKeyMock,
  deleteKeys: deleteKeysMock,
  previewGroupKeys: previewGroupKeysMock,
  isDeletingKey: ref(false),
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
      },
    }),
    useWSStateStore: createAsyncNoopStore,
    useEnvironmentTagStore: () => ({
      loadTags: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

describe('ManagementRedisBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceMock.selectedDatabaseIndex.value = 2;
    workspaceMock.keyPattern.value = 'orders:*';
    workspaceMock.session.value = { selectedKey: null, viewMode: 'tree' };
  });

  const mountComponent = () =>
    mount(ManagementRedisBrowser, {
      global: {
        stubs: {
          Button: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          Icon: true,
          Tooltip: {
            template: '<div><slot /></div>',
          },
          TooltipTrigger: {
            template: '<div><slot /></div>',
          },
          TooltipContent: {
            template: '<div><slot /></div>',
          },
          ManagementSidebarHeader: {
            template: '<div><slot name="actions" /></div>',
          },
          RedisDBSelector: {
            template: '<div />',
          },
          RedisKeyTree: {
            template:
              '<div><button data-test="select-key" @click="$emit(\'select\', \'orders:1\')">select</button><button data-test="delete-key-immediate" @click="$emit(\'delete-key\', \'orders:1\', { immediate: true })">delete-key-immediate</button><button data-test="delete-key-confirm" @click="$emit(\'delete-key\', \'orders:1\', { immediate: false })">delete-key-confirm</button><button data-test="delete-group" @click="$emit(\'delete-group\', \'orders\')">delete-group</button></div>',
          },
          RedisDeleteKeyDialog: {
            props: ['open', 'mode', 'targetKey', 'targetKeys', 'loading'],
            emits: ['update:open', 'confirm'],
            template:
              '<div v-if="open" data-test="delete-dialog" :data-mode="mode"><button data-test="confirm-delete" @click="$emit(\'confirm\')">confirm</button></div>',
          },
        },
      },
    });

  it('updates the selected database and refreshes the key list', async () => {
    const wrapper = mountComponent();

    workspaceMock.session.value = { selectedKey: 'orders:1' };

    await (wrapper.vm as any).updateDatabaseIndex(5);

    expect(workspaceMock.selectedDatabaseIndex.value).toBe(5);
    expect(workspaceMock.session.value?.selectedKey).toBeNull();
    expect(workspaceMock.refreshKeys).toHaveBeenCalledTimes(1);
  });

  it('opens the selected Redis key in a browser tab', async () => {
    const wrapper = mountComponent();

    await (wrapper.vm as any).openSelectedKey('orders:1');

    expect(openKeyMock).toHaveBeenCalledWith('orders:1');
    expect(openRedisTabMock).toHaveBeenCalledWith({
      id: 'redis-browser-redis-conn',
      name: 'Redis Browser',
      type: TabViewType.RedisBrowser,
      metadata: {
        type: TabViewType.RedisBrowser,
        databaseIndex: 2,
        keyPattern: 'orders:*',
        selectedKey: 'orders:1',
      },
    });
  });

  it('switches the browser session between tree and list modes', async () => {
    const wrapper = mountComponent();
    const treeButton = wrapper.find('button[aria-label="Tree view"]');
    const listButton = wrapper.find('button[aria-label="List view"]');

    await listButton.trigger('click');
    expect(workspaceMock.session.value?.viewMode).toBe('list');

    await treeButton.trigger('click');
    expect(workspaceMock.session.value?.viewMode).toBe('tree');
  });

  it('deletes a key immediately when the tree reports an immediate delete request', async () => {
    const wrapper = mountComponent();

    await wrapper.find('[data-test="delete-key-immediate"]').trigger('click');

    expect(deleteKeyMock).toHaveBeenCalledWith('orders:1');
    expect(wrapper.find('[data-test="delete-dialog"]').exists()).toBe(false);
  });

  it('opens a confirm dialog for a non-immediate single-key delete request', async () => {
    const wrapper = mountComponent();

    await wrapper.find('[data-test="delete-key-confirm"]').trigger('click');

    const dialog = wrapper.find('[data-test="delete-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes('data-mode')).toBe('key');
    expect(deleteKeyMock).not.toHaveBeenCalled();

    await dialog.find('[data-test="confirm-delete"]').trigger('click');
    expect(deleteKeyMock).toHaveBeenCalledWith('orders:1');
  });

  it('previews the full group key list and opens a group confirm dialog on delete-group', async () => {
    const wrapper = mountComponent();

    await wrapper.find('[data-test="delete-group"]').trigger('click');
    await flushPromises();

    expect(previewGroupKeysMock).toHaveBeenCalledWith('orders');

    const dialog = wrapper.find('[data-test="delete-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes('data-mode')).toBe('group');

    await dialog.find('[data-test="confirm-delete"]').trigger('click');
    expect(deleteKeysMock).toHaveBeenCalledWith(['orders:1', 'orders:2']);
  });
});
