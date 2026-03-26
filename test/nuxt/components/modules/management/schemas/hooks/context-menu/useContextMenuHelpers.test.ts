import { reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContextMenuHelpers } from '~/components/modules/management/schemas/hooks/context-menu/useContextMenuHelpers';
import { useContextMenuState } from '~/components/modules/management/schemas/hooks/context-menu/useContextMenuState';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import {
  makeColumn,
  makeConnection,
  makeSchema,
  makeSelectedItem,
} from './testUtils';

const { mockToast, mockAppConfigStore } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  },
  mockAppConfigStore: {
    quickQuerySafeModeEnabled: false,
  },
}));

vi.mock('vue-sonner', () => ({
  toast: mockToast,
}));

vi.mock('~/core/stores/appConfigStore', () => ({
  useAppConfigStore: () => mockAppConfigStore,
}));

describe('useContextMenuHelpers', () => {
  const makeOptions = (schema = makeSchema()) => ({
    schemaName: ref(schema.name),
    activeSchema: ref(schema),
    onRefreshSchema: vi.fn().mockResolvedValue(undefined),
    connection: ref(makeConnection()),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppConfigStore.quickQuerySafeModeEnabled = false;
  });

  it('reads schema and table metadata from the active schema', () => {
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(
      makeOptions(
        makeSchema({
          name: 'analytics',
          tableDetails: {
            users: {
              table_id: 'tbl-1',
              columns: [
                makeColumn({ name: 'created_at', ordinal_position: 3 }),
                makeColumn({ name: 'id', ordinal_position: 1 }),
                makeColumn({ name: 'email', ordinal_position: 2 }),
              ],
              foreign_keys: [],
              primary_keys: [{ column: 'id' }],
            },
          },
        })
      ),
      state
    );

    expect(helpers.getSchemaName()).toBe('analytics');
    expect(helpers.getTableMetadata('users')?.table_id).toBe('tbl-1');
    expect(
      helpers.getTableColumnsMetadata('users').map(column => column.name)
    ).toEqual(['id', 'email', 'created_at']);
    expect(helpers.getTableColumns('users')).toEqual([
      'id',
      'email',
      'created_at',
    ]);
    expect(helpers.getPrimaryKeyColumns('users')).toEqual(['id']);
    expect(helpers.getTableMetadata('missing')).toBeNull();
  });

  it('falls back to public when there is no active schema', () => {
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(
      {
        schemaName: ref('public'),
        activeSchema: ref(undefined),
        onRefreshSchema: vi.fn().mockResolvedValue(undefined),
        connection: ref(makeConnection()),
      },
      state
    );

    expect(helpers.getSchemaName()).toBe('public');
    expect(helpers.getTableColumns('users')).toEqual([]);
    expect(helpers.getPrimaryKeyColumns('users')).toEqual([]);
  });

  it('builds placeholders from column metadata', () => {
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(makeOptions(), state);

    expect(
      helpers.getColumnPlaceholder(
        makeColumn({ default_value: 'CURRENT_TIMESTAMP' })
      )
    ).toBe('CURRENT_TIMESTAMP');
    expect(
      helpers.getColumnPlaceholder(makeColumn({ is_nullable: true }))
    ).toBe('NULL');
    expect(helpers.getColumnPlaceholder(makeColumn({ name: 'email' }))).toBe(
      ':email'
    );
  });

  it('stores the raw selected item on right click and opens SQL preview', () => {
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(makeOptions(), state);
    const rawItem = makeSelectedItem(TabViewType.TableDetail);
    const proxiedItem = reactive(rawItem) as typeof rawItem;

    helpers.onRightClickItem({} as MouseEvent, { value: proxiedItem } as any);
    helpers.showSqlPreview('SELECT 1;', 'Preview');

    expect(state.selectedItem.value).toStrictEqual(rawItem);
    expect(state.sqlPreviewDialogSQL.value).toBe('SELECT 1;');
    expect(state.sqlPreviewDialogTitle.value).toBe('Preview');
    expect(state.sqlPreviewDialogOpen.value).toBe(true);
  });

  it('opens the safe mode dialog instead of executing immediately when safe mode is enabled', async () => {
    mockAppConfigStore.quickQuerySafeModeEnabled = true;
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(makeOptions(), state);
    const action = vi.fn().mockResolvedValue(undefined);

    await helpers.executeWithSafeMode('DELETE FROM users;', 'delete', action);

    expect(action).not.toHaveBeenCalled();
    expect(state.safeModeDialogOpen.value).toBe(true);
    expect(state.safeModeDialogSQL.value).toBe('DELETE FROM users;');
    expect(state.safeModeDialogType.value).toBe('delete');
    expect(state.pendingAction.value).toBe(action);
  });

  it('executes immediately when safe mode is disabled', async () => {
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(makeOptions(), state);
    const action = vi.fn().mockResolvedValue(undefined);

    await helpers.executeWithSafeMode(
      'UPDATE users SET active = true;',
      'save',
      action
    );

    expect(action).toHaveBeenCalledOnce();
    expect(state.safeModeDialogOpen.value).toBe(false);
  });

  it('confirms and cancels safe mode actions', async () => {
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(makeOptions(), state);

    let resolveAction: (() => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveAction = resolve;
        })
    );

    state.pendingAction.value = action;
    state.safeModeDialogOpen.value = true;

    const promise = helpers.onSafeModeConfirm();

    expect(helpers.safeModeLoading.value).toBe(true);
    expect(action).toHaveBeenCalledOnce();

    resolveAction?.();
    await promise;

    expect(helpers.safeModeLoading.value).toBe(false);
    expect(state.pendingAction.value).toBeNull();
    expect(state.safeModeDialogOpen.value).toBe(false);

    state.pendingAction.value = vi.fn().mockResolvedValue(undefined);
    state.safeModeDialogOpen.value = true;
    helpers.onSafeModeCancel();

    expect(state.pendingAction.value).toBeNull();
    expect(state.safeModeDialogOpen.value).toBe(false);
  });

  it('wraps async work with loading and error handling', async () => {
    const state = useContextMenuState();
    const helpers = useContextMenuHelpers(makeOptions(), state);
    const loadingRef = ref(false);

    await helpers.executeWithLoading(async () => {
      expect(loadingRef.value).toBe(true);
    }, loadingRef);

    expect(loadingRef.value).toBe(false);

    state.sqlPreviewDialogOpen.value = true;
    await helpers.executeWithLoading(async () => {
      throw new Error('Boom');
    });

    expect(mockToast.error).toHaveBeenCalledWith('Boom');
    expect(state.sqlPreviewDialogOpen.value).toBe(false);
    expect(state.isFetching.value).toBe(false);
  });
});
