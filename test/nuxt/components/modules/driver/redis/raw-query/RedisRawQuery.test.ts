import { createPinia, setActivePinia } from 'pinia';
import type { Ref } from 'vue';
import { computed, defineComponent, h, ref, toValue } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExplainOptionsMenu } from '~/components/modules/driver/postgres/raw-query/components';
import RedisRawQuery from '~/components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue';
import type { RawQueryFileContent } from '~/components/modules/raw-query/hooks';
import { provideRawQueryFileContent } from '~/components/modules/raw-query/hooks';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const { executorMock, fileContentMock, workspaceMock } = vi.hoisted(() => ({
  executorMock: vi.fn(),
  fileContentMock: vi.fn(),
  workspaceMock: vi.fn(),
}));

vi.mock('~/components/modules/raw-query/hooks/useRawQueryFileContent', () => ({
  useRawQueryFileContent: fileContentMock,
}));

vi.mock(
  '~/components/modules/driver/redis/quick-query/hooks/useRedisWorkspace',
  () => ({
    useRedisWorkspace: workspaceMock,
  })
);

vi.mock('~/components/modules/driver/redis/raw-query/services', () => ({
  createRedisCommandExecutor: executorMock,
}));

const connections = [
  { id: 'redis-1', name: 'Redis One', type: DatabaseClientType.REDIS },
  { id: 'redis-2', name: 'Redis Two', type: DatabaseClientType.REDIS },
];

const createFileContent = () => {
  const selectedConnectionId = ref('redis-1');

  return {
    fieldDefs: ref([]),
    fileContents: ref(''),
    fileVariables: ref(''),
    currentFile: ref({
      id: 'file-1',
      title: 'commands.redis',
      icon: 'hugeicons:file-01',
    }),
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
    connectionsByWsId: ref(connections),
    updateFileCursorPos: vi.fn(),
    loadFileContent: vi.fn().mockResolvedValue(undefined),
    isFromCache: true,
  };
};

const databases = [
  { index: 0, label: 'db0', keyCount: 2, expires: 0, avgTtl: null },
  { index: 1, label: 'db1', keyCount: 5, expires: 0, avgTtl: null },
];

let databaseIndexRef: Ref<number>;

const globalOptions = {
  stubs: {
    BaseCodeEditor: { template: '<div data-test="code-editor" />' },
    BaseEmpty: { template: '<div data-test="empty" />' },
    Icon: true,
    LoadingOverlay: { template: '<div data-test="loading" />' },
    AddVariableModal: true,
    MissingVariablesDialog: true,
    PureConnectionSelector: true,
    RawQueryConfigModal: true,
    RawQueryConnectionConfirmDialog: true,
    RawQueryEditorContextMenu: { template: '<div><slot /></div>' },
    RedisDBSelector: {
      props: ['databases', 'databaseIndex', 'triggerId'],
      emits: ['update:databaseIndex'],
      template:
        '<button :id="triggerId" data-test="redis-db-selector" @click="$emit(\'update:databaseIndex\', 1)">{{ databases.length }} dbs / db {{ databaseIndex }}</button>',
    },
    Tooltip: { template: '<div><slot /></div>' },
    TooltipContent: { template: '<div><slot /></div>' },
    TooltipTrigger: { template: '<div><slot /></div>' },
    VariableEditor: { template: '<div data-test="variable-editor" />' },
  },
};

const mountEntry = () => mount(RedisRawQuery, { global: globalOptions });

describe('RedisRawQuery', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    setActivePinia(createPinia());

    databaseIndexRef = ref(0);
    fileContentMock.mockReset();
    fileContentMock.mockImplementation(createFileContent);
    workspaceMock.mockReset();
    workspaceMock.mockImplementation(() => ({
      databases: ref(databases),
      selectedDatabaseIndex: databaseIndexRef,
    }));
    executorMock.mockReset();
    executorMock.mockImplementation(() => ({
      execute: () => ({ abort: () => undefined }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the redis database picker in the header slot', () => {
    const wrapper = mountEntry();

    const selector = wrapper.find('[data-test="redis-db-selector"]');
    expect(selector.exists()).toBe(true);
    expect(selector.attributes('id')).toBe('raw-query-redis-db-index');
    expect(selector.text()).toContain('2 dbs / db 0');
  });

  it('does not render the postgres explain menu', () => {
    const wrapper = mountEntry();

    expect(wrapper.findComponent(ExplainOptionsMenu).exists()).toBe(false);
    expect(wrapper.text()).not.toContain('⌘E');
  });

  it('feeds the picked database index to the executor', async () => {
    const wrapper = mountEntry();

    const [passedIndex] = executorMock.mock.calls[0] as [Ref<number>];
    expect(toValue(passedIndex)).toBe(0);

    await wrapper.find('[data-test="redis-db-selector"]').trigger('click');

    expect(toValue(passedIndex)).toBe(1);
    expect(databaseIndexRef.value).toBe(1);
  });

  it('reads the connection from the shared file content context', async () => {
    let provided: RawQueryFileContent | undefined;

    const Parent = defineComponent({
      setup() {
        provided = provideRawQueryFileContent();
        return () => h(RedisRawQuery);
      },
    });

    mount(Parent, { global: globalOptions });

    expect(fileContentMock).toHaveBeenCalledTimes(1);

    const workspaceConnection = workspaceMock.mock.calls[0]?.[0]
      ?.connection as unknown;
    expect(toValue(workspaceConnection)).toMatchObject({ id: 'redis-1' });

    provided?.updateSelectedConnection('redis-2');

    expect(toValue(workspaceConnection)).toMatchObject({ id: 'redis-2' });
  });
});
