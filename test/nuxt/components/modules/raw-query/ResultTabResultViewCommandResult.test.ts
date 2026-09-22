import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mysqlCommandResult } from '~/components/modules/driver/mysql/raw-query/services';
import { postgresCommandResult } from '~/components/modules/driver/postgres/raw-query/services';
import type { CommandResultHandlerResolver } from '~/components/modules/raw-query/contracts';
import { useSchemaStore } from '~/core/stores';

/** Resolves per engine type, so the wrong handler is visible in the output. */
const createResolver = () =>
  vi.fn<CommandResultHandlerResolver>(type =>
    type === 'mysql' ? mysqlCommandResult : postgresCommandResult
  );

const buildTab = (connection: { id: string; type: string } | undefined) => ({
  id: 'query-1',
  metadata: {
    queryTime: 1,
    statementQuery: 'OPTIMIZE TABLE posts',
    executedAt: new Date('2026-05-21T00:00:00.000Z'),
    executeErrors: undefined,
    connection: connection && { workspaceId: 'workspace', ...connection },
    command: 'OPTIMIZE',
    rowCount: 0,
  },
  result: [],
  seqIndex: 1,
  view: 'result',
});

describe('ResultTabResultView per-tab command result resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useSchemaStore().reservedSchemas['conn-1'] = [];
  });

  const mountView = async (
    connection: { id: string; type: string } | undefined,
    resolver: CommandResultHandlerResolver
  ) => {
    const { default: ResultTabResultView } = await import(
      '~/components/modules/raw-query/components/result-tab/ResultTabResultView.vue'
    );

    return mount(ResultTabResultView, {
      props: {
        activeTab: buildTab(connection),
        activeTabColumns: [],
        formattedData: [],
        executeLoading: false,
        isStreaming: false,
        resolveCommandResultHandler: resolver,
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          BaseEmpty: {
            props: ['desc'],
            template: '<div data-test="empty">{{ desc }}</div>',
          },
          BaseDataGrid: { template: '<div />' },
          PreviewRelationTable: { template: '<div />' },
          RawQueryContextMenu: { template: '<div><slot /></div>' },
          RawQueryUpdatePreviewDialog: { template: '<div />' },
          RawQueryResultControlBar: { template: '<div />' },
          LoadingOverlay: { template: '<div />' },
        },
      },
    });
  };

  it('resolves the handler from the tab connection type', async () => {
    const resolver = createResolver();
    const wrapper = await mountView({ id: 'conn-1', type: 'mysql' }, resolver);

    expect(resolver).toHaveBeenCalledWith('mysql');
    expect(wrapper.get('[data-test="empty"]').text()).toBe(
      'OPTIMIZE successful.'
    );
  });

  it('asks the resolver with undefined when the tab has no connection', async () => {
    const resolver = createResolver();
    await mountView(undefined, resolver);

    expect(resolver).toHaveBeenCalledWith(undefined);
  });
});
