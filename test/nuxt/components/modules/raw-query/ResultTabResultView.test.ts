import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HASH_INDEX_WIDTH } from '~/components/base/data-grid/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores';

const rawQueryMutationControls = vi.hoisted(() => {
  let onSaved: (() => void) | undefined;

  return {
    requestSave: vi.fn(),
    requestDelete: vi.fn(),
    cancelPreview: vi.fn(),
    confirmAndExecute: vi.fn(),
    setOnSaved: (callback: () => void) => {
      onSaved = callback;
    },
    triggerSaved: () => {
      onSaved?.();
    },
    reset: () => {
      onSaved = undefined;
    },
  };
});

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

vi.mock('~/components/modules/raw-query/hooks', async () => {
  const actual = await vi.importActual<
    typeof import('~/components/modules/raw-query/hooks')
  >('~/components/modules/raw-query/hooks');

  return {
    ...actual,
    useRawQueryMutation: ({ onSaved }: { onSaved: () => void }) => {
      rawQueryMutationControls.setOnSaved(onSaved);

      return {
        isPreviewOpen: ref(false),
        isMutating: ref(false),
        pendingAction: ref('update'),
        previewGroups: ref([]),
        hasNoPkWarning: ref(false),
        totalUpdateCount: ref(0),
        requestSave: rawQueryMutationControls.requestSave,
        deleteGroups: ref([]),
        deleteHasNoPkWarning: ref(false),
        totalDeleteCount: ref(0),
        requestDelete: rawQueryMutationControls.requestDelete,
        cancelPreview: rawQueryMutationControls.cancelPreview,
        confirmAndExecute: rawQueryMutationControls.confirmAndExecute,
      };
    },
  };
});

const buildResultTabProps = () => ({
  activeTab: {
    id: 'query-1',
    metadata: {
      queryTime: 12,
      statementQuery: 'SELECT id, title FROM posts',
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
    result: [{ id: 1, title: 'alpha' }],
    seqIndex: 1,
    view: 'result',
  },
  activeTabColumns: [
    {
      originalName: 'id',
      aliasFieldName: 'id',
      queryFieldName: 'id',
      isPrimaryKey: true,
      isForeignKey: false,
      tableName: 'posts',
      schemaName: 'public',
      sourceColumnName: 'id',
      type: 'integer',
      short_type_name: 'int4',
    },
    {
      originalName: 'title',
      aliasFieldName: 'title',
      queryFieldName: 'title',
      isPrimaryKey: false,
      isForeignKey: false,
      tableName: 'posts',
      schemaName: 'public',
      sourceColumnName: 'title',
      type: 'text',
      short_type_name: 'text',
    },
  ],
  formattedData: [{ id: 1, title: 'alpha' }],
  executeLoading: false,
  isStreaming: false,
});

describe('ResultTabResultView', () => {
  let pinia: ReturnType<typeof createPinia>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    rawQueryMutationControls.reset();
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

  const mountView = async (overrideProps: Record<string, unknown> = {}) => {
    const { default: ResultTabResultView } = await import(
      '~/components/modules/raw-query/components/result-tab/ResultTabResultView.vue'
    );

    return mount(ResultTabResultView, {
      props: {
        ...buildResultTabProps(),
        ...overrideProps,
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseEmpty: { template: '<div />' },
          BaseDataGrid: {
            name: 'BaseDataGrid',
            props: [
              'columnDefs',
              'rowData',
              'selectedRows',
              'gridOptions',
              'allowEditing',
              'suppressScrollOnNewData',
              'emptyTitle',
              'emptyDescription',
            ],
            template: '<div data-test="base-data-grid" />',
          },
          PreviewRelationTable: { template: '<div />' },
          RawQueryContextMenu: { template: '<div><slot /></div>' },
          RawQueryUpdatePreviewDialog: { template: '<div />' },
          RawQueryResultControlBar: {
            name: 'RawQueryResultControlBar',
            props: [
              'pendingCount',
              'isMutating',
              'isEditingEnabled',
              'totalSelectedRows',
            ],
            template: '<div data-test="raw-query-result-control-bar" />',
          },
        },
      },
    });
  };

  const getBaseDataGrid = (wrapper: ReturnType<typeof mount>) =>
    wrapper.getComponent({ name: 'BaseDataGrid' });

  const getControlBar = (wrapper: ReturnType<typeof mount>) =>
    wrapper.getComponent({ name: 'RawQueryResultControlBar' });

  const getEditableColumnStyle = (wrapper: ReturnType<typeof mount>) => {
    const baseDataGrid = getBaseDataGrid(wrapper);
    const rowData = baseDataGrid.props('rowData') as Array<
      Record<string, unknown>
    >;
    const columnDefs = baseDataGrid.props('columnDefs') as Array<{
      field?: string;
      cellStyle?: (
        params: Record<string, unknown>
      ) => Record<string, unknown> | undefined;
    }>;
    const titleColumn = columnDefs.find(column => column.field === 'title');

    return titleColumn?.cellStyle?.({
      colDef: { field: 'title' },
      node: { rowIndex: 0, id: '0' },
      value: rowData[0]?.title,
    });
  };

  it('keeps estimated widths when relation columns switch raw query to override column defs', async () => {
    const wrapper = await mountView({
      activeTab: {
        ...buildResultTabProps().activeTab,
        metadata: {
          ...buildResultTabProps().activeTab.metadata,
          statementQuery: 'SELECT p.author_id AS author FROM posts p',
        },
        result: [{ author: 123456789 }],
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
          type: 'uuid',
          short_type_name: 'uuid',
          foreignKey: {
            column: 'author_id',
            referenced_column: 'id',
            referenced_table: 'users',
            referenced_table_schema: 'public',
          },
        },
      ],
      formattedData: [{ author: 123456789 }],
    });

    const baseDataGrid = getBaseDataGrid(wrapper);
    const columnDefs = baseDataGrid.props('columnDefs') as Array<{
      field?: string;
      width?: number;
    }>;
    const authorColumn = columnDefs.find(column => column.field === 'author');

    expect(authorColumn?.width).toBeTypeOf('number');
    expect(authorColumn?.width).toBeGreaterThan(DEFAULT_HASH_INDEX_WIDTH);
    expect(baseDataGrid.props('allowEditing')).toBe(false);
  });

  it('keeps the grid mounted for empty result sets so column headers remain available', async () => {
    const props = buildResultTabProps();
    const wrapper = await mountView({
      activeTab: {
        ...props.activeTab,
        metadata: {
          ...props.activeTab.metadata,
          rowCount: 0,
        },
        result: [],
      },
      formattedData: [],
    });

    const baseDataGrid = getBaseDataGrid(wrapper);
    const columnDefs = baseDataGrid.props('columnDefs') as Array<{
      field?: string;
    }>;

    expect(baseDataGrid.props('rowData')).toEqual([]);
    expect(columnDefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'id' }),
        expect.objectContaining({ field: 'title' }),
      ])
    );
    expect(baseDataGrid.props('emptyTitle')).toBe('No Results');
    expect(baseDataGrid.props('emptyDescription')).toBe(
      'The query returned no records.'
    );
    expect(baseDataGrid.props('allowEditing')).toBe(true);
  });

  it('renders null result cells with the same muted foreground used by quick query', async () => {
    const wrapper = await mountView({
      activeTab: {
        ...buildResultTabProps().activeTab,
        result: [{ id: 1, title: null }],
      },
      formattedData: [{ id: 1, title: null }],
    });

    expect(getEditableColumnStyle(wrapper)).toEqual({
      backgroundColor: 'unset',
      color: 'var(--muted-foreground)',
    });
  });

  it('reverts discarded edits back to the latest saved baseline while keeping accepted cells highlighted', async () => {
    const wrapper = await mountView();
    const baseDataGrid = getBaseDataGrid(wrapper);
    const controlBar = getControlBar(wrapper);
    const rowData = baseDataGrid.props('rowData') as Array<
      Record<string, unknown>
    >;

    rowData[0].title = 'beta';
    baseDataGrid.vm.$emit('cell-value-changed', {
      colDef: { field: 'title' },
      newValue: 'beta',
      node: { rowIndex: 0, id: '0' },
    });
    await nextTick();

    expect(controlBar.props('pendingCount')).toBe(1);
    expect(getEditableColumnStyle(wrapper)).toEqual({
      backgroundColor: 'var(--color-orange-200)',
    });

    rawQueryMutationControls.triggerSaved();
    await nextTick();

    expect(controlBar.props('pendingCount')).toBe(0);
    expect(getEditableColumnStyle(wrapper)).toEqual({
      backgroundColor: 'var(--color-orange-200)',
    });

    const updatedRowData = getBaseDataGrid(wrapper).props('rowData') as Array<
      Record<string, unknown>
    >;
    updatedRowData[0].title = 'gamma';
    baseDataGrid.vm.$emit('cell-value-changed', {
      colDef: { field: 'title' },
      newValue: 'gamma',
      node: { rowIndex: 0, id: '0' },
    });
    await nextTick();

    expect(controlBar.props('pendingCount')).toBe(1);

    controlBar.vm.$emit('discard');
    await nextTick();

    const discardedRowData = getBaseDataGrid(wrapper).props('rowData') as Array<
      Record<string, unknown>
    >;

    expect(controlBar.props('pendingCount')).toBe(0);
    expect(discardedRowData[0].title).toBe('beta');
    expect(getEditableColumnStyle(wrapper)).toEqual({
      backgroundColor: 'var(--color-orange-200)',
    });
  });
});
