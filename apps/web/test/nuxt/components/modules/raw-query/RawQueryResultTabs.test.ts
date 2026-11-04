import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RawQueryResultTabs from '~/components/modules/raw-query/components/RawQueryResultTabs.vue';
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
          },
        },
        result: [{ author: 1 }],
        seqIndex: 1,
        view: 'result',
      },
    ],
  ]);
}

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
            props: ['activeTabColumns'],
            template:
              '<pre data-test="result-columns">{{ JSON.stringify(activeTabColumns) }}</pre>',
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
});
