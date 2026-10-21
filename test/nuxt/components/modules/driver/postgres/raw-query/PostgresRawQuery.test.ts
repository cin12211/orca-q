import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExplainOptionsMenu } from '~/components/modules/driver/postgres/raw-query/components';
import PostgresRawQuery from '~/components/modules/driver/postgres/raw-query/containers/PostgresRawQuery.vue';
import type { ExecutedResultItem } from '~/components/modules/raw-query/interfaces';
import { ViewMode } from '~/components/modules/raw-query/interfaces';

const { fileContentMock, resultTabsMock } = vi.hoisted(() => ({
  fileContentMock: vi.fn(),
  resultTabsMock: vi.fn(),
}));

vi.mock('~/components/modules/raw-query/hooks/useRawQueryFileContent', () => ({
  useRawQueryFileContent: fileContentMock,
}));

vi.mock('~/components/modules/raw-query/hooks/useResultTabs', () => ({
  useResultTabs: resultTabsMock,
}));

const createFileContent = () => ({
  fieldDefs: ref([]),
  fileContents: ref(''),
  fileVariables: ref(''),
  currentFile: ref({
    id: 'file-1',
    title: 'query.sql',
    icon: 'hugeicons:file-01',
  }),
  selectedConnectionId: ref(''),
  updateSelectedConnection: vi.fn(),
  updateFileContent: vi.fn(),
  updateFileVariables: vi.fn(),
  connection: ref(undefined),
  currentOpenedConnection: ref(undefined),
  connectionsByWsId: ref([]),
  updateFileCursorPos: vi.fn(),
  loadFileContent: vi.fn().mockResolvedValue(undefined),
  isFromCache: true,
});

const createTab = (view: ViewMode): ExecutedResultItem =>
  ({
    id: 'query-1',
    metadata: {
      queryTime: 12,
      statementQuery: 'SELECT 1',
      executedAt: new Date('2026-05-21T00:00:00.000Z'),
      executeErrors: undefined,
      fieldDefs: [],
      connection: { id: 'conn-1', workspaceId: 'workspace' },
    },
    result: [{ value: 1 }],
    seqIndex: 1,
    view,
  }) as unknown as ExecutedResultItem;

const createResultTabs = (view: ViewMode) => () => ({
  executedResults: shallowRef(new Map([['query-1', createTab(view)]])),
  activeResultTabId: ref('query-1'),
  addResultTab: vi.fn(),
  refreshResultTab: vi.fn(),
  setActiveResultTab: vi.fn(),
  closeResultTab: vi.fn(),
  updateResultTabView: vi.fn(),
  closeOtherResultTabs: vi.fn(),
  closeResultTabsToRight: vi.fn(),
  updateResultTabResult: vi.fn(),
});

const mountEntry = () =>
  mount(PostgresRawQuery, {
    global: {
      stubs: {
        BaseCodeEditor: { template: '<div data-test="code-editor" />' },
        BaseEmpty: { template: '<div data-test="empty" />' },
        ContextMenu: { template: '<div><slot /></div>' },
        ContextMenuContent: { template: '<div><slot /></div>' },
        ContextMenuItem: { template: '<button><slot /></button>' },
        ContextMenuTrigger: { template: '<div><slot /></div>' },
        Icon: true,
        LoadingOverlay: { template: '<div data-test="loading" />' },
        AddVariableModal: true,
        MissingVariablesDialog: true,
        PureConnectionSelector: true,
        RawQueryConfigModal: true,
        RawQueryConnectionConfirmDialog: true,
        RawQueryEditorContextMenu: { template: '<div><slot /></div>' },
        ExplainQueryContainer: {
          template: '<div data-test="explain-view" />',
        },
        ResultTabErrorView: true,
        ResultTabInfoView: true,
        ResultTabRawView: true,
        ResultTabResultView: {
          template: '<div data-test="default-result-view" />',
        },
        Tooltip: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        VariableEditor: { template: '<div data-test="variable-editor" />' },
      },
    },
  });

describe('PostgresRawQuery', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    setActivePinia(createPinia());
    fileContentMock.mockImplementation(createFileContent);
    resultTabsMock.mockImplementation(createResultTabs(ViewMode.RESULT));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the explain options menu in the footer slot', () => {
    const wrapper = mountEntry();

    // The result tabs also show an 'Explain' view-mode label, so match the component.
    expect(wrapper.findComponent(ExplainOptionsMenu).exists()).toBe(true);
  });

  it('renders the built-in result body for a RESULT view tab', async () => {
    const wrapper = mountEntry();

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      true
    );
    expect(wrapper.find('[data-test="explain-view"]').exists()).toBe(false);
  });

  it('renders the PostgreSQL explain view for an EXPLAIN view tab', async () => {
    resultTabsMock.mockImplementation(createResultTabs(ViewMode.EXPLAIN));

    const wrapper = mountEntry();

    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="explain-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="default-result-view"]').exists()).toBe(
      false
    );
  });
});
