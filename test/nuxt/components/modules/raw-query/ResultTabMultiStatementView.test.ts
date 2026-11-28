import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RawQueryResultTabs from '~/components/modules/raw-query/components/RawQueryResultTabs.vue';
import ResultTabMultiStatementView from '~/components/modules/raw-query/components/result-tab/ResultTabMultiStatementView.vue';
import { MULTI_STATEMENT_VIEW_ONLY_NOTE } from '~/components/modules/raw-query/constants';
import {
  StatementRunStatus,
  ViewMode,
  type ExecutedResultItem,
  type StatementResultItem,
} from '~/components/modules/raw-query/types';
import { useSchemaStore } from '~/core/stores';

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useElementVisibility: () => ref(true),
}));

const connection = { id: 'conn-1', workspaceId: 'workspace' } as any;

const statementResult = (
  index: number,
  patch: Partial<StatementResultItem>
): StatementResultItem => ({
  id: `statement-${index}`,
  index,
  from: index * 20,
  statementQuery: `SELECT ${index};`,
  status: StatementRunStatus.PENDING,
  queryTime: 0,
  result: [],
  connection,
  ...patch,
});

const createMultiTab = (): ExecutedResultItem => ({
  id: 'multi-1',
  metadata: {
    queryTime: 17,
    statementQuery: 'SELECT id FROM users;\nUPDATE users SET x = 1;\n…',
    executedAt: new Date('2026-11-28T00:00:00.000Z'),
    executeErrors: { message: 'duplicate key', data: {} },
    connection,
  },
  result: [],
  view: ViewMode.RESULT,
  seqIndex: 4,
  statements: [
    statementResult(0, {
      statementQuery: 'SELECT id FROM users;',
      status: StatementRunStatus.SUCCESS,
      queryTime: 12,
      command: 'SELECT',
      rowCount: 2,
      fieldDefs: [{ name: 'id' } as any],
      result: [{ id: 1 }, { id: 2 }],
    }),
    statementResult(1, {
      statementQuery: 'UPDATE users SET x = 1;',
      status: StatementRunStatus.SUCCESS,
      queryTime: 5,
      command: 'UPDATE',
      rowCount: 3,
      fieldDefs: [],
    }),
    statementResult(2, {
      statementQuery: 'INSERT INTO users VALUES (1);',
      status: StatementRunStatus.ERROR,
      executeErrors: { message: 'duplicate key', data: {} },
    }),
    statementResult(3, {
      statementQuery: 'DELETE FROM users;',
      status: StatementRunStatus.SKIPPED,
    }),
  ],
});

const stubs = {
  BaseEmpty: { template: '<div data-test="empty" />' },
  Button: {
    template: '<button v-bind="$attrs"><slot /></button>',
  },
  ContextMenu: { template: '<div><slot /></div>' },
  ContextMenuContent: { template: '<div><slot /></div>' },
  ContextMenuItem: { template: '<button><slot /></button>' },
  ContextMenuTrigger: { template: '<div><slot /></div>' },
  Icon: true,
  LoadingOverlay: { template: '<div data-test="loading" />' },
  ResultTabErrorView: true,
  ResultTabInfoView: true,
  ResultTabRawView: true,
  ResultTabResultView: {
    props: { activeTab: Object, formattedData: Array, readOnly: Boolean },
    template:
      '<pre data-test="statement-grid" :data-read-only="readOnly">{{ JSON.stringify(formattedData) }}</pre>',
  },
  Tooltip: { template: '<div><slot /></div>' },
  TooltipContent: { template: '<div><slot /></div>' },
  TooltipTrigger: { template: '<div><slot /></div>' },
};

describe('ResultTabMultiStatementView', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mountView = (activeTab = createMultiTab()) =>
    mount(ResultTabMultiStatementView, {
      props: { activeTab },
      global: { plugins: [pinia], stubs },
    });

  it('summarises the run and shows the view-only note', () => {
    const wrapper = mountView();

    expect(
      wrapper.get('[data-testid="raw-query-multi-statement-summary"]').text()
    ).toBe('4 statements · 2 succeeded · 1 failed · 1 skipped');
    expect(
      wrapper.get('[data-testid="raw-query-multi-statement-note"]').text()
    ).toBe(MULTI_STATEMENT_VIEW_ONLY_NOTE);
  });

  it('stacks one block per statement, in order, with its status', () => {
    const blocks = mountView().findAll(
      '[data-testid="raw-query-statement-block"]'
    );

    expect(blocks.map(block => block.attributes('data-status'))).toEqual([
      StatementRunStatus.SUCCESS,
      StatementRunStatus.SUCCESS,
      StatementRunStatus.ERROR,
      StatementRunStatus.SKIPPED,
    ]);
    expect(blocks[0].text()).toContain('SELECT id FROM users;');
    expect(blocks[0].text()).toContain('2 rows');
    expect(blocks[1].text()).toContain('3');
    expect(blocks[2].text()).toContain('duplicate key');
    expect(blocks[3].text()).toContain('Skipped');
  });

  it('opens blocks with data or errors and keeps the rest collapsed', async () => {
    const wrapper = mountView();
    const blocks = wrapper.findAll('[data-testid="raw-query-statement-block"]');

    const grids = wrapper.findAll('[data-test="statement-grid"]');
    expect(grids).toHaveLength(1);
    expect(grids[0].attributes('data-read-only')).toBe('true');
    expect(JSON.parse(grids[0].text())).toEqual([{ id: 1 }, { id: 2 }]);

    expect(blocks[2].find('pre').text()).toBe('duplicate key');
    expect(blocks[1].find('p').exists()).toBe(false);
    expect(blocks[3].find('p').exists()).toBe(false);

    await blocks[3].get('header').trigger('click');
    expect(blocks[3].get('p').text()).toBe(
      'Not run because a previous statement failed.'
    );

    await blocks[0].get('header').trigger('click');
    expect(wrapper.findAll('[data-test="statement-grid"]')).toHaveLength(0);
  });

  it('offers "open in its own tab" only for finished statements', async () => {
    const wrapper = mountView();
    const buttons = wrapper.findAll(
      '[data-testid="raw-query-statement-open-tab"]'
    );

    expect(buttons).toHaveLength(3);

    await buttons[0].trigger('click');
    expect(wrapper.emitted('open-statement')).toEqual([['statement-0']]);
  });

  it('shows progress while statements are still running', () => {
    const tab = createMultiTab();
    tab.statements = [
      statementResult(0, {
        status: StatementRunStatus.SUCCESS,
        queryTime: 3,
        fieldDefs: [],
      }),
      statementResult(1, { status: StatementRunStatus.RUNNING }),
      statementResult(2, {}),
    ];

    expect(
      mountView(tab)
        .get('[data-testid="raw-query-multi-statement-summary"]')
        .text()
    ).toBe('3 statements · running 2/3 · 1 succeeded');
  });
});

describe('RawQueryResultTabs with a multi-statement tab', () => {
  it('renders the stacked view, hides the view modes and forwards "open statement"', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const schemaStore = useSchemaStore();
    vi.spyOn(schemaStore, 'fetchSchemas').mockResolvedValue(undefined);
    vi.spyOn(schemaStore, 'fetchReservedSchemas').mockResolvedValue(undefined);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const tab = createMultiTab();
    const wrapper = mount(RawQueryResultTabs, {
      props: {
        executedResults: new Map([[tab.id, tab]]),
        activeTabId: tab.id,
        executeLoading: false,
        isStreaming: false,
      },
      global: { plugins: [pinia], stubs },
    });

    await nextTick();

    expect(
      wrapper.find('[data-testid="raw-query-multi-statement-view"]').exists()
    ).toBe(true);
    expect(wrapper.text()).toContain('Query 4 - 4 statements');
    expect(wrapper.text()).not.toContain('Chart');

    await wrapper
      .findAll('[data-testid="raw-query-statement-open-tab"]')[0]
      .trigger('click');
    expect(wrapper.emitted('open-statement')).toEqual([
      ['multi-1', 'statement-0'],
    ]);

    vi.unstubAllGlobals();
  });
});
