import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFunctionActions } from '~/components/modules/management/schemas/hooks/context-menu/actions/useFunctionActions';
import { useContextMenuState } from '~/components/modules/management/schemas/hooks/context-menu/useContextMenuState';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { makeConnection, makeSchema, makeSelectedItem } from './testUtils';

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

describe('useFunctionActions', () => {
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

  it('guards delete and rename when the selected item is not a function', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useFunctionActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(TabViewType.TableDetail);

    await actions.onDeleteFunction();
    actions.onRenameFunction();

    expect(helpers.executeWithSafeMode).not.toHaveBeenCalled();
    expect(state.renameDialogOpen.value).toBe(false);
  });

  it('opens the rename dialog with the current function name and parameters', () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useFunctionActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'archive_user',
      'fn-1',
      { parameters: 'IN user_id integer' }
    );

    actions.onRenameFunction();

    expect(state.renameDialogOpen.value).toBe(true);
    expect(state.renameDialogType.value).toBe(TabViewType.FunctionsDetail);
    expect(state.renameDialogValue.value).toBe('archive_user');
    expect(state.renameDialogParameters.value).toBe('IN user_id integer');
  });

  it('deletes a function through safe mode and refreshes the schema', async () => {
    const state = useContextMenuState();
    const options = makeOptions();
    const helpers = makeHelpers(state);
    const actions = useFunctionActions(options, state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'archive_user',
      'fn-1',
      { parameters: 'IN user_id integer' }
    );
    mockFetch.mockResolvedValue({});

    await actions.onDeleteFunction();

    expect(helpers.executeWithSafeMode).toHaveBeenCalledWith(
      'DROP FUNCTION IF EXISTS "public"."archive_user"(user_id);',
      'delete',
      expect.any(Function)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/functions/delete',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          connection: 'params',
          schemaName: 'public',
          functionName: 'archive_user',
        }),
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Function deleted successfully'
    );
    expect(options.onRefreshSchema).toHaveBeenCalledOnce();
  });

  it('renames a function through safe mode and refreshes the schema', async () => {
    const state = useContextMenuState();
    const options = makeOptions();
    const helpers = makeHelpers(state);
    const actions = useFunctionActions(options, state, helpers as any);

    state.renameDialogValue.value = 'archive_user';
    state.renameDialogParameters.value = 'IN user_id integer';
    mockFetch.mockResolvedValue({});

    await actions.performRenameFunction('archive_account');

    expect(helpers.executeWithSafeMode).toHaveBeenCalledWith(
      'ALTER FUNCTION "public"."archive_user"(user_id) RENAME TO "archive_account";',
      'save',
      expect.any(Function)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/functions/rename',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          schemaName: 'public',
          oldName: 'archive_user',
          newName: 'archive_account',
        }),
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Function renamed successfully'
    );
    expect(options.onRefreshSchema).toHaveBeenCalledOnce();
  });

  it('generates CALL SQL from the fetched signature using only input parameters', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useFunctionActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'archive_user',
      'fn-1'
    );
    mockFetch.mockResolvedValue({
      name: 'archive_user',
      schema: 'public',
      return_type: 'void',
      parameters: [
        {
          name: 'user_id',
          type: 'integer',
          mode: 'IN',
          has_default: false,
          default_value: null,
        },
        {
          name: 'options',
          type: 'jsonb',
          mode: 'INOUT',
          has_default: false,
          default_value: null,
        },
        {
          name: 'result',
          type: 'jsonb',
          mode: 'OUT',
          has_default: false,
          default_value: null,
        },
      ],
    });

    await actions.onGenFunctionCallSQL();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/functions/signature',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ functionId: 'fn-1' }),
      })
    );
    expect(state.sqlPreviewDialogTitle.value).toBe('CALL Statement');
    expect(state.sqlPreviewDialogSQL.value).toBe(
      '-- user_id::integer, options::jsonb\nCALL "public"."archive_user"(:user_id, :options);'
    );
  });

  it('generates SELECT SQL without arguments when no input parameters exist', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useFunctionActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'load_users',
      'fn-2'
    );
    mockFetch.mockResolvedValue({
      name: 'load_users',
      schema: 'public',
      return_type: 'setof users',
      parameters: [
        {
          name: 'result',
          type: 'record',
          mode: 'OUT',
          has_default: false,
          default_value: null,
        },
      ],
    });

    await actions.onGenFunctionSelectSQL();

    expect(state.sqlPreviewDialogTitle.value).toBe('SELECT Function');
    expect(state.sqlPreviewDialogSQL.value).toBe(
      'SELECT * FROM "public"."load_users"();'
    );
  });

  it('fetches and previews function DDL', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useFunctionActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'archive_user',
      'fn-1'
    );
    mockFetch.mockResolvedValue(
      'CREATE FUNCTION archive_user() RETURNS void LANGUAGE sql AS $$ $$;'
    );

    await actions.onGenFunctionDDL();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/functions/definition',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ functionId: 'fn-1' }),
      })
    );
    expect(helpers.showSqlPreview).toHaveBeenLastCalledWith(
      'CREATE FUNCTION archive_user() RETURNS void LANGUAGE sql AS $$ $$;',
      'Function DDL'
    );
  });
});
