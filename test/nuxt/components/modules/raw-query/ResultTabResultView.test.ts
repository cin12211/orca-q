import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HASH_INDEX_WIDTH } from '~/components/base/dynamic-table/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores';

vi.mock('~/components/modules/quick-query/hooks', () => ({
  useQuickQueryPreviewRelations: () => ({
    previewRelationBreadcrumbs: ref([]),
    onOpenBackReferencedTableModal: vi.fn(),
    onOpenForwardReferencedTableModal: vi.fn(),
    onUpdateSelectedTabInBreadcrumb: vi.fn(),
    onClearBreadcrumbs: vi.fn(),
    onBackPreviousBreadcrumb: vi.fn(),
    onBackPreviousBreadcrumbByIndex: vi.fn(),
  }),
}));

describe('ResultTabResultView', () => {
  let pinia: ReturnType<typeof createPinia>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);

    const schemaStore = useSchemaStore();
    schemaStore.reservedSchemas['conn-1'] = [];

    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({
        font: '',
        measureText: (text: string | number) => ({
          width: String(text).length * 8,
        }),
      } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    getContextSpy.mockRestore();
  });

  it('keeps estimated widths when relation columns switch raw query to override column defs', async () => {
    const { default: ResultTabResultView } = await import(
      '~/components/modules/raw-query/components/result-tab/ResultTabResultView.vue'
    );

    const wrapper = mount(ResultTabResultView, {
      props: {
        activeTab: {
          id: 'query-1',
          metadata: {
            queryTime: 12,
            statementQuery: 'SELECT p.author_id AS author FROM posts p',
            executedAt: new Date('2026-05-21T00:00:00.000Z'),
            executeErrors: undefined,
            connection: {
              id: 'conn-1',
              workspaceId: 'workspace',
              type: DatabaseClientType.POSTGRES,
            },
            command: 'SELECT',
            rowCount: 1,
          },
          result: [{ author: 123456789 }],
          seqIndex: 1,
          view: 'result',
        },
        activeTabColumns: [
          {
            originalName: 'author',
            aliasFieldName: 'author',
            queryFieldName: 'author',
            isPrimaryKey: false,
            isForeignKey: true,
            tableName: 'posts',
            schemaName: 'public',
            sourceColumnName: 'author_id',
            foreignKey: {
              column: 'author_id',
              referenced_column: 'id',
              referenced_table: 'users',
              referenced_table_schema: 'public',
            },
          },
        ],
        formattedData: [{ author: 123456789 }],
        executeLoading: false,
        isStreaming: false,
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseEmpty: { template: '<div />' },
          DynamicTable: {
            name: 'DynamicTable',
            props: ['overrideColumnDefs'],
            template: '<div data-test="dynamic-table" />',
          },
          PreviewRelationTable: { template: '<div />' },
          RawQueryContextMenu: { template: '<div><slot /></div>' },
        },
      },
    });

    const dynamicTable = wrapper.getComponent({ name: 'DynamicTable' });
    const overrideColumnDefs = dynamicTable.props('overrideColumnDefs') as Array<{
      field?: string;
      width?: number;
    }>;
    const authorColumn = overrideColumnDefs.find(
      column => column.field === 'author'
    );

    expect(authorColumn?.width).toBeTypeOf('number');
    expect(authorColumn?.width).toBeGreaterThan(DEFAULT_HASH_INDEX_WIDTH);
  });
});
