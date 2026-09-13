import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RawQueryResultTabs from '~/components/modules/raw-query/components/RawQueryResultTabs.vue';
import {
  ViewMode,
  type ExecutedResultItem,
} from '~/components/modules/raw-query/interfaces';
import type { RawQueryResultViewContext } from '~/components/modules/raw-query/registry/rawQueryResult.types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores';
import type { Schema } from '~/core/types';

const schema: Schema = {
  id: 'workspace-connection-public',
  workspaceId: 'workspace',
  connectionId: 'conn-1',
  name: 'public',
  tables: ['users', 'posts'],
  views: [],
  functions: [],
  tableDetails: {
    users: {
      table_id: '10',
      columns: [
        {
          name: 'id',
          ordinal_position: 1,
          type: 'integer',
          short_type_name: 'int4',
          is_nullable: false,
          default_value: null,
        },
      ],
      primary_keys: [{ column: 'id' }],
      foreign_keys: [],
    },
    posts: {
      table_id: '20',
      columns: [
        {
          name: 'author_id',
          ordinal_position: 1,
          type: 'integer',
          short_type_name: 'int4',
          is_nullable: false,
          default_value: null,
        },
      ],
      primary_keys: [],
      foreign_keys: [
        {
          column: 'author_id',
          referenced_column: 'id',
          referenced_table: 'users',
          referenced_table_schema: 'public',
        },
      ],
    },
  },
};

function createExecutedResults() {
  return new Map([
    [
      'query-1',
      {
        id: 'query-1',
        metadata: {
          queryTime: 12,
          statementQuery: 'SELECT p.author_id AS author FROM posts p',
          executedAt: new Date('2026-05-21T00:00:00.000Z'),
          executeErrors: undefined,
          fieldDefs: [
            {
              name: 'author',
              tableID: 0,
              columnID: 0,
              dataTypeID: 3,
              dataTypeSize: 11,
              dataTypeModifier: 0,
              format: 'text',
            },
          ],
          connection: {
            id: 'conn-1',
            workspaceId: 'workspace',
            type: DatabaseClientType.POSTGRES,
          },
        },
        result: [{ author: 1 }],
        seqIndex: 1,
        view: ViewMode.RESULT,
      },
    ],
  ]);
}

interface MountOptions {
  databaseType?: DatabaseClientType | undefined;
  hasConnection?: boolean;
  view?: ViewMode;
  executeErrors?: any;
  statementQuery?: string;
  activeTabId?: string | null;
  executeLoading?: boolean;
  isStreaming?: boolean;
  stubs?: Record<string, any>;
  pinia?: any;
}

function createExecutedResultTab(
  options: {
    id?: string;
    databaseType?: DatabaseClientType | undefined;
    hasConnection?: boolean;
    view?: ViewMode;
    executeErrors?: any;
    statementQuery?: string;
  } = {}
): ExecutedResultItem {
  const id = options.id ?? 'query-1';
  const hasConnection = options.hasConnection !== false;
  const databaseType =
    'databaseType' in options
      ? options.databaseType
      : DatabaseClientType.POSTGRES;

  return {
    id,
    metadata: {
      queryTime: 12,
      statementQuery:
        options.statementQuery ?? 'SELECT p.author_id AS author FROM posts p',
      executedAt: new Date('2026-05-21T00:00:00.000Z'),
      executeErrors: options.executeErrors,
      fieldDefs: [
        {
          name: 'author',
          tableID: 0,
          columnID: 0,
          dataTypeID: 3,
          dataTypeSize: 11,
          dataTypeModifier: 0,
          format: 'text',
        },
      ],
      connection: hasConnection
        ? {
            id: 'conn-1',
            workspaceId: 'workspace',
            type: databaseType as DatabaseClientType,
          }
        : undefined,
    },
    result: [{ author: 1 }],
    seqIndex: 1,
    view: options.view ?? ViewMode.RESULT,
  };
}

function mountResultTabs(options: MountOptions = {}) {
  const pinia = options.pinia ?? createPinia();
  setActivePinia(pinia);

  const tabId =
    options.activeTabId === undefined ? 'query-1' : options.activeTabId;
  const executedResults = new Map<string, ExecutedResultItem>();

  if (tabId) {
    const tab = createExecutedResultTab({
      id: tabId,
      databaseType: options.databaseType,
      hasConnection: options.hasConnection,
      view: options.view,
      executeErrors: options.executeErrors,
      statementQuery: options.statementQuery,
    });
    executedResults.set(tabId, tab);
  }

  return mount(RawQueryResultTabs, {
    props: {
      executedResults,
      activeTabId: tabId,
      executeLoading: options.executeLoading ?? false,
      isStreaming: options.isStreaming ?? false,
    },
    global: {
      plugins: [pinia],
      stubs: {
        BaseEmpty: {
          props: ['title', 'desc'],
          template:
            '<div data-test="empty" :data-title="title" :data-desc="desc">{{ title }} - {{ desc }}</div>',
        },
        ContextMenu: { template: '<div><slot /></div>' },
        ContextMenuContent: { template: '<div><slot /></div>' },
        ContextMenuItem: { template: '<button><slot /></button>' },
        ContextMenuTrigger: { template: '<div><slot /></div>' },
        Icon: true,
        LoadingOverlay: { template: '<div data-test="loading" />' },
        Tooltip: { template: '<div><slot /></div>' },
        TooltipContent: {
          template: '<div data-test="tooltip-content"><slot /></div>',
        },
        TooltipTrigger: { template: '<div><slot /></div>' },
        ResultTabResultView: true,
        ResultTabErrorView: true,
        ResultTabExplainView: true,
        ResultTabInfoView: true,
        ResultTabRawView: true,
        ...options.stubs,
      },
    },
  });
}

const viewModes = (wrapper: VueWrapper<any>) =>
  wrapper
    .findAll('[data-view-mode]')
    .map(item => item.attributes('data-view-mode'));

describe('RawQueryResultTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes inferred relation metadata to the result view for synthetic field definitions', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const schemaStore = useSchemaStore();
    schemaStore.schemas['conn-1'] = [schema];

    const fetchSchemasSpy = vi
      .spyOn(schemaStore, 'fetchSchemas')
      .mockResolvedValue(undefined);
    const fetchReservedSchemasSpy = vi
      .spyOn(schemaStore, 'fetchReservedSchemas')
      .mockResolvedValue(undefined);

    const wrapper = mount(RawQueryResultTabs, {
      props: {
        executedResults: createExecutedResults(),
        activeTabId: 'query-1',
        executeLoading: false,
        isStreaming: false,
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseEmpty: { template: '<div data-test="empty" />' },
          ContextMenu: { template: '<div><slot /></div>' },
          ContextMenuContent: { template: '<div><slot /></div>' },
          ContextMenuItem: { template: '<button><slot /></button>' },
          ContextMenuTrigger: { template: '<div><slot /></div>' },
          Icon: true,
          LoadingOverlay: { template: '<div data-test="loading" />' },
          ResultTabErrorView: true,
          ResultTabExplainView: true,
          ResultTabInfoView: true,
          ResultTabRawView: true,
          ResultTabResultView: {
            props: ['context', 'activeTabColumns'],
            template:
              '<pre data-test="result-columns">{{ JSON.stringify(context?.activeTabColumns ?? activeTabColumns) }}</pre>',
          },
          Tooltip: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
        },
      },
    });

    await nextTick();
    await nextTick();

    const renderedColumns = JSON.parse(
      wrapper.get('[data-test="result-columns"]').text()
    );

    expect(renderedColumns).toMatchObject([
      {
        tableName: 'posts',
        schemaName: 'public',
        sourceColumnName: 'author_id',
        isForeignKey: true,
        foreignKey: {
          referenced_table: 'users',
          referenced_column: 'id',
        },
      },
    ]);
    expect(fetchSchemasSpy).not.toHaveBeenCalled();
    expect(fetchReservedSchemasSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
      })
    );
  });

  it('renders expected view modes for PostgreSQL, Redis, and MongoDB profiles', async () => {
    const postgresWrapper = mountResultTabs({
      databaseType: DatabaseClientType.POSTGRES,
    });
    const redisWrapper = mountResultTabs({
      databaseType: DatabaseClientType.REDIS,
    });
    const mongoWrapper = mountResultTabs({
      databaseType: DatabaseClientType.MONGODB,
    });

    expect(viewModes(postgresWrapper)).toEqual([
      ViewMode.RESULT,
      ViewMode.EXPLAIN,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.CHART,
      ViewMode.ERROR,
    ]);

    expect(viewModes(redisWrapper)).toEqual([
      ViewMode.RESULT,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.ERROR,
    ]);

    expect(viewModes(mongoWrapper)).toEqual([
      ViewMode.RESULT,
      ViewMode.RAW,
      ViewMode.INFO,
      ViewMode.CONSOLE,
      ViewMode.ERROR,
    ]);
  });

  it('does not emit view changes from a disabled registry view', async () => {
    const wrapper = mountResultTabs({
      databaseType: DatabaseClientType.POSTGRES,
      view: ViewMode.ERROR,
      executeErrors: { message: 'boom', data: { message: 'boom' } },
    });

    await wrapper.get('[data-view-mode="result"]').trigger('click');
    expect(wrapper.emitted('update:view')).toBeUndefined();
    expect(
      wrapper.get('[data-view-mode="result"]').attributes('disabled')
    ).toBeDefined();
    expect(wrapper.get('[data-view-mode="result"]').attributes('title')).toBe(
      'The query execution contains an error'
    );
  });

  it('emits a view change from an enabled registry view', async () => {
    const wrapper = mountResultTabs({
      databaseType: DatabaseClientType.POSTGRES,
      view: ViewMode.RESULT,
    });

    await wrapper.get('[data-view-mode="info"]').trigger('click');
    expect(wrapper.emitted('update:view')).toContainEqual([
      'query-1',
      ViewMode.INFO,
    ]);
  });

  it('passes complete view context to the active renderer', async () => {
    const StubRenderer = {
      name: 'StubResultView',
      props: ['context'],
      template: '<div data-test="stub-renderer" />',
    };

    const wrapper = mountResultTabs({
      databaseType: DatabaseClientType.POSTGRES,
      view: ViewMode.RESULT,
      stubs: {
        ResultTabResultView: StubRenderer,
      },
    });

    await nextTick();

    const renderer = wrapper.findComponent(StubRenderer);
    expect(renderer.exists()).toBe(true);

    const context = renderer.props('context') as RawQueryResultViewContext;
    expect(context).toBeDefined();
    expect(context.activeTab.id).toBe('query-1');
    expect(context.databaseType).toBe(DatabaseClientType.POSTGRES);
    expect(Array.isArray(context.formattedData)).toBe(true);
    expect(Array.isArray(context.activeTabColumns)).toBe(true);
    expect(context.executeLoading).toBe(false);
    expect(context.isStreaming).toBe(false);
    expect(typeof context.changeView).toBe('function');

    context.changeView(ViewMode.INFO);
    expect(wrapper.emitted('update:view')).toContainEqual([
      'query-1',
      ViewMode.INFO,
    ]);
  });

  it('auto-reconciles to Error view and emits update:view on failed execution', async () => {
    const StubErrorRenderer = {
      name: 'StubErrorView',
      props: ['context'],
      template: '<div data-test="stub-error" />',
    };

    const wrapper = mountResultTabs({
      databaseType: DatabaseClientType.POSTGRES,
      view: ViewMode.RESULT,
      executeErrors: {
        message: 'Syntax error',
        data: { message: 'Syntax error' },
      },
      stubs: {
        ResultTabErrorView: StubErrorRenderer,
      },
    });

    await nextTick();

    expect(wrapper.findComponent(StubErrorRenderer).exists()).toBe(true);
    expect(wrapper.emitted('update:view')).toContainEqual([
      'query-1',
      ViewMode.ERROR,
    ]);
  });

  it('renders explicit unsupported state and hides view navigation when database type is missing', async () => {
    const wrapper = mountResultTabs({
      hasConnection: false,
      view: ViewMode.RESULT,
    });

    await nextTick();

    expect(wrapper.findAll('[data-view-mode]')).toHaveLength(0);
    expect(wrapper.find('[data-test="unsupported-database"]').exists()).toBe(
      true
    );
  });
});
