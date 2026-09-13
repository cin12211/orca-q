import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ResultTabInfoView from '~/components/modules/raw-query/components/result-tab/ResultTabInfoView.vue';
import MongoConsoleTabRenderer from '~/components/modules/raw-query/components/result-tab/adapters/MongoConsoleTabRenderer.vue';
import MongoResultTabRenderer from '~/components/modules/raw-query/components/result-tab/adapters/MongoResultTabRenderer.vue';
import ResultTabChartRenderer from '~/components/modules/raw-query/components/result-tab/adapters/ResultTabChartRenderer.vue';
import ResultTabExplainRenderer from '~/components/modules/raw-query/components/result-tab/adapters/ResultTabExplainRenderer.vue';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import type { RawQueryResultViewContext } from '~/components/modules/raw-query/registry/rawQueryResult.types';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const createContext = (
  overrides: Partial<RawQueryResultViewContext> = {}
): RawQueryResultViewContext => {
  const activeTab = {
    id: 'query-1',
    metadata: {
      queryTime: 15,
      statementQuery: 'SELECT id, name FROM users',
      executedAt: new Date('2026-05-21T00:00:00.000Z'),
      executeErrors: undefined,
      connection: {
        id: 'conn-1',
        name: 'Postgres DB',
        workspaceId: 'workspace-1',
        type: DatabaseClientType.POSTGRES,
      },
      command: 'SELECT',
      rowCount: 1,
    },
    result: [{ id: 1, name: 'Ada' }],
    seqIndex: 1,
    view: ViewMode.RESULT,
  };

  const activeTabColumns = [
    {
      originalName: 'id',
      aliasFieldName: 'id',
      queryFieldName: 'id',
      isPrimaryKey: true,
      isForeignKey: false,
      tableName: 'users',
      schemaName: 'public',
      sourceColumnName: 'id',
      type: 'integer',
      short_type_name: 'int4',
    },
    {
      originalName: 'name',
      aliasFieldName: 'name',
      queryFieldName: 'name',
      isPrimaryKey: false,
      isForeignKey: false,
      tableName: 'users',
      schemaName: 'public',
      sourceColumnName: 'name',
      type: 'text',
      short_type_name: 'text',
    },
  ];

  return {
    activeTab,
    databaseType: DatabaseClientType.POSTGRES,
    activeTabColumns,
    formattedData: [{ id: 1, name: 'Ada' }],
    executeLoading: false,
    isStreaming: false,
    changeView: vi.fn(),
    ...overrides,
  };
};

describe('RawQueryResultRenderers & Adapters', () => {
  it('passes tabular context to Chart Builder', () => {
    const context = createContext();
    const wrapper = mount(ResultTabChartRenderer, {
      props: { context },
      global: {
        stubs: {
          ChartBuilder: {
            name: 'ChartBuilder',
            props: ['activeTab', 'activeTabColumns', 'formattedData'],
            template: '<div />',
          },
          ChartBuilderContainer: {
            name: 'ChartBuilder',
            props: ['activeTab', 'activeTabColumns', 'formattedData'],
            template: '<div />',
          },
        },
      },
    });

    const chart = wrapper.getComponent({ name: 'ChartBuilder' });
    expect(chart.props('activeTab')).toEqual(context.activeTab);
    expect(chart.props('activeTabColumns')).toEqual(context.activeTabColumns);
    expect(chart.props('formattedData')).toEqual(context.formattedData);
  });

  it('passes activeTab to ExplainQuery', () => {
    const context = createContext();
    const wrapper = mount(ResultTabExplainRenderer, {
      props: { context },
      global: {
        stubs: {
          ExplainQuery: {
            name: 'ExplainQuery',
            props: ['activeTab'],
            template: '<div />',
          },
          ExplainQueryContainer: {
            name: 'ExplainQuery',
            props: ['activeTab'],
            template: '<div />',
          },
        },
      },
    });

    const explain = wrapper.getComponent({ name: 'ExplainQuery' });
    expect(explain.props('activeTab')).toEqual(context.activeTab);
  });

  it('passes formattedData to MongoRawQueryResultView as documents', () => {
    const mongoContext = createContext({
      databaseType: DatabaseClientType.MONGODB,
      formattedData: [{ _id: 'abc', title: 'Doc 1' }],
    });

    const wrapper = mount(MongoResultTabRenderer, {
      props: { context: mongoContext },
      global: {
        stubs: {
          MongoRawQueryResultView: {
            name: 'MongoRawQueryResultView',
            props: ['documents'],
            template: '<div />',
          },
        },
      },
    });

    const mongoResult = wrapper.getComponent({
      name: 'MongoRawQueryResultView',
    });
    expect(mongoResult.props('documents')).toEqual(mongoContext.formattedData);
  });

  it('passes Mongo logs to the focused console component', () => {
    const mongoLogs = [
      {
        level: 'info' as const,
        args: ['hello mongo'],
        timestamp: 123456789,
      },
    ];

    const mongoContext = createContext({
      databaseType: DatabaseClientType.MONGODB,
      activeTab: {
        ...createContext().activeTab,
        metadata: {
          ...createContext().activeTab.metadata,
          logs: mongoLogs,
        },
      },
    });

    const wrapper = mount(MongoConsoleTabRenderer, {
      props: { context: mongoContext },
      global: {
        stubs: {
          MongoRawQueryConsole: {
            name: 'MongoRawQueryConsole',
            props: ['logs'],
            template: '<div />',
          },
        },
      },
    });

    expect(
      wrapper.getComponent({ name: 'MongoRawQueryConsole' }).props('logs')
    ).toEqual(mongoLogs);
  });

  it('does not contain MongoDB Raw Query when ResultTabInfoView is mounted with Postgres context', () => {
    const context = createContext();
    const wrapper = mount(ResultTabInfoView, {
      props: { context },
      global: {
        stubs: {
          Icon: { template: '<span />' },
          CodeHighlightPreview: { template: '<pre />' },
        },
      },
    });

    expect(wrapper.text()).not.toContain('MongoDB Raw Query');
    expect(wrapper.text()).toContain('Query Time:');
    expect(wrapper.text()).toContain('Postgres DB');
  });
});
