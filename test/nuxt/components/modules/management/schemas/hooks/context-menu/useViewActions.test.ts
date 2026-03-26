import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewActions } from '~/components/modules/management/schemas/hooks/context-menu/actions/useViewActions';
import { useContextMenuState } from '~/components/modules/management/schemas/hooks/context-menu/useContextMenuState';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { ViewSchemaEnum } from '~/core/types';
import {
  makeConnection,
  makeSchema,
  makeSelectedItem,
  makeView,
} from './testUtils';

const { mockToast, mockGetConnectionParams } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  },
  mockGetConnectionParams: vi.fn(() => ({ connection: 'params' })),
}));
const mockFetch = vi.fn(async () => ({}));

vi.mock('vue-sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/core/helpers/connection-helper', () => ({
  getConnectionParams: mockGetConnectionParams,
}));

vi.stubGlobal('$fetch', mockFetch);

describe('useViewActions', () => {
  const makeOptions = (schema = makeSchema()) => ({
    schemaName: ref(schema.name),
    activeSchema: ref(schema),
    onRefreshSchema: vi.fn().mockResolvedValue(undefined),
    connection: ref(makeConnection()),
  });

  const makeHelpers = (state: ReturnType<typeof useContextMenuState>) => ({
    getSchemaName: vi.fn(() => 'public'),
    executeWithSafeMode: vi.fn(async (_sql, _type, action) => {
      await action();
    }),
    showSqlPreview: vi.fn((sql: string, title: string) => {
      state.sqlPreviewDialogSQL.value = sql;
      state.sqlPreviewDialogTitle.value = title;
      state.sqlPreviewDialogOpen.value = true;
    }),
    executeWithLoading: vi.fn(async (action, loadingRef = state.isFetching) => {
      loadingRef.value = true;
      try {
        await action();
      } finally {
        loadingRef.value = false;
      }
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnectionParams.mockReturnValue({ connection: 'params' });
  });

  it('reads view metadata and columns from the active schema', () => {
    const state = useContextMenuState();
    const actions = useViewActions(
      makeOptions(
        makeSchema({
          views: [makeView({ name: 'user_view', oid: 'view-1' })],
          viewDetails: {
            user_view: {
              view_id: 'view-1',
              type: ViewSchemaEnum.View,
              columns: [{ name: 'id' }, { name: 'email' }] as any,
            },
          },
        })
      ),
      state,
      makeHelpers(state) as any
    );

    expect(actions.getViewInfo('view-1')?.name).toBe('user_view');
    expect(actions.getViewColumns('user_view')).toEqual(['id', 'email']);
    expect(actions.getViewColumns('missing')).toEqual([]);
  });

  it('generates SELECT SQL for the selected view', () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useViewActions(
      makeOptions(
        makeSchema({
          views: [makeView({ name: 'user_view', oid: 'view-1' })],
          viewDetails: {
            user_view: {
              view_id: 'view-1',
              type: ViewSchemaEnum.View,
              columns: [{ name: 'id' }, { name: 'email' }] as any,
            },
          },
        })
      ),
      state,
      helpers as any
    );

    state.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'user_view',
      'view-1'
    );

    actions.onGenViewSelectSQL();

    expect(helpers.showSqlPreview).toHaveBeenCalledWith(
      `SELECT "id", "email"
FROM "public"."user_view"
WHERE 1=1
-- Add your conditions here
LIMIT 100;`,
      'SELECT Statement'
    );
  });

  it('fetches and previews view DDL', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useViewActions(
      makeOptions(
        makeSchema({
          views: [
            makeView({
              name: 'user_mv',
              oid: 'view-1',
              type: ViewSchemaEnum.MaterializedView,
            }),
          ],
        })
      ),
      state,
      helpers as any
    );

    state.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'user_mv',
      'view-1'
    );
    mockFetch.mockResolvedValue({
      definition: 'CREATE MATERIALIZED VIEW user_mv AS SELECT 1;',
    });

    await actions.onGenViewDDL();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/views/definition',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          connection: 'params',
          viewId: 'view-1',
          schemaName: 'public',
          viewName: 'user_mv',
        }),
      })
    );
    expect(helpers.showSqlPreview).toHaveBeenLastCalledWith(
      'CREATE MATERIALIZED VIEW user_mv AS SELECT 1;',
      'MATERIALIZED VIEW DDL'
    );
  });

  it('opens the rename dialog from the selected view metadata', () => {
    const state = useContextMenuState();
    const actions = useViewActions(
      makeOptions(
        makeSchema({
          views: [makeView({ name: 'user_view', oid: 'view-1' })],
        })
      ),
      state,
      makeHelpers(state) as any
    );

    state.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'ignored-title',
      'view-1',
      { title: 'Fallback title' }
    );

    actions.onRenameView();

    expect(state.renameDialogOpen.value).toBe(true);
    expect(state.renameDialogType.value).toBe(TabViewType.ViewDetail);
    expect(state.renameDialogValue.value).toBe('user_view');
  });

  it('renames and deletes views using generated SQL and refreshes the schema', async () => {
    const state = useContextMenuState();
    const options = makeOptions(
      makeSchema({
        views: [
          makeView({
            name: 'user_mv',
            oid: 'view-1',
            type: ViewSchemaEnum.MaterializedView,
          }),
        ],
      })
    );
    const helpers = makeHelpers(state);
    const actions = useViewActions(options, state, helpers as any);

    state.renameDialogValue.value = 'user_mv';
    state.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'user_mv',
      'view-1'
    );
    mockFetch.mockResolvedValue({});

    await actions.performRenameView('account_mv');
    await actions.onDeleteView();

    expect(helpers.executeWithSafeMode).toHaveBeenNthCalledWith(
      1,
      'ALTER MATERIALIZED VIEW "public"."user_mv" RENAME TO "account_mv";',
      'save',
      expect.any(Function)
    );
    expect(helpers.executeWithSafeMode).toHaveBeenNthCalledWith(
      2,
      'DROP MATERIALIZED VIEW IF EXISTS "public"."user_mv";',
      'delete',
      expect.any(Function)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/query/execute',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockToast.success).toHaveBeenCalledWith('View renamed successfully');
    expect(mockToast.success).toHaveBeenCalledWith('View deleted successfully');
    expect(options.onRefreshSchema).toHaveBeenCalledTimes(2);
  });

  it('refreshes materialized views and rejects normal views', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const materializedActions = useViewActions(
      makeOptions(
        makeSchema({
          views: [
            makeView({
              name: 'user_mv',
              oid: 'view-1',
              type: ViewSchemaEnum.MaterializedView,
            }),
          ],
        })
      ),
      state,
      helpers as any
    );

    state.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'user_mv',
      'view-1'
    );
    mockFetch.mockResolvedValue({});

    await materializedActions.onRefreshMaterializedView();

    expect(helpers.executeWithSafeMode).toHaveBeenCalledWith(
      'REFRESH MATERIALIZED VIEW "public"."user_mv";',
      'save',
      expect.any(Function)
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Materialized view refreshed successfully'
    );

    const normalState = useContextMenuState();
    const normalActions = useViewActions(
      makeOptions(
        makeSchema({
          views: [
            makeView({
              name: 'user_view',
              oid: 'view-2',
              type: ViewSchemaEnum.View,
            }),
          ],
        })
      ),
      normalState,
      makeHelpers(normalState) as any
    );

    normalState.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'user_view',
      'view-2'
    );

    await normalActions.onRefreshMaterializedView();

    expect(mockToast.error).toHaveBeenCalledWith(
      'Only materialized views can be refreshed'
    );
  });
});
