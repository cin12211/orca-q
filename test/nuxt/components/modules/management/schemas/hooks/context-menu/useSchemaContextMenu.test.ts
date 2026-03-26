/**
 * Tests for useSchemaContextMenu and related helpers/actions.
 *
 * Architecture note: useSchemaContextMenu composes:
 *   useContextMenuState  → reactive state refs
 *   useContextMenuHelpers → side-effect helpers (right-click, safeMode, SQL preview)
 *   useFunctionActions   → function-specific CRUD actions
 *   useTableActions      → table-specific CRUD actions
 *   useViewActions       → view-specific CRUD actions
 */
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { useSchemaContextMenu } from '~/components/modules/management/schemas/hooks/useSchemaContextMenu';
import type { Schema } from '~/core/stores/useSchemaStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

vi.mock('vue-sonner', () => ({
  toast: {
    loading: vi.fn(() => 'tid'),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock('~/core/stores/appConfigStore', () => ({
  useAppConfigStore: () => ({ quickQuerySafeModeEnabled: false }),
}));
vi.mock('~/core/stores', () => ({
  useManagementConnectionStore: () => ({
    selectedConnection: {
      id: 'conn-1',
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'secret',
      database: 'testdb',
    },
  }),
}));
vi.mock('@/core/helpers/connection-helper', () => ({
  getConnectionParams: (conn: any) => ({
    host: conn?.host,
    port: conn?.port,
    user: conn?.user,
    password: conn?.password,
    database: conn?.database,
  }),
}));

// Mock $fetch globally
const mockFetch = vi.fn().mockResolvedValue({});
vi.stubGlobal('$fetch', mockFetch);

// ---------------------------------------------------------------------------
// Test fixture helpers
// ---------------------------------------------------------------------------

const makeSchema = (overrides: Partial<Schema> = {}): Schema => ({
  id: 'schema-1',
  name: 'public',
  connectionId: 'conn-1',
  workspaceId: 'ws-1',
  tables: [],
  views: [],
  functions: [],
  tableDetails: {},
  viewDetails: {},
  ...overrides,
});

const makeSelectedItem = (
  tabViewType: TabViewType,
  name = 'test_table',
  id = 'item-1',
  extra: Record<string, any> = {}
): FlattenedTreeFileSystemItem['value'] => ({
  id,
  name,
  title: name,
  path: `/${name}`,
  isFolder: false,
  tabViewType,
  icon: '',
  iconClass: '',
  ...extra,
});

const getTitle = (item: ContextMenuItem) =>
  'title' in item ? item.title : undefined;

const getSelect = (item: ContextMenuItem) =>
  item.type === ContextMenuItemType.ACTION ? item.select : undefined;

const makeOptions = (schemaOverride?: Partial<Schema>) => {
  const schemaName = ref('public');
  const activeSchema = ref<Schema | undefined>(makeSchema(schemaOverride));
  const onRefreshSchema = vi.fn().mockResolvedValue(undefined);

  return { schemaName, activeSchema, onRefreshSchema };
};

// ---------------------------------------------------------------------------
// 1. useSchemaContextMenu – initial state
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – initial state', () => {
  it('returns all expected keys', () => {
    const opts = makeOptions();
    const ctx = useSchemaContextMenu(opts);

    expect(ctx.selectedItem).toBeDefined();
    expect(ctx.contextMenuItems).toBeDefined();
    expect(ctx.safeModeDialogOpen).toBeDefined();
    expect(ctx.safeModeDialogSQL).toBeDefined();
    expect(ctx.safeModeDialogType).toBeDefined();
    expect(ctx.onSafeModeConfirm).toBeTypeOf('function');
    expect(ctx.onSafeModeCancel).toBeTypeOf('function');
    expect(ctx.renameDialogOpen).toBeDefined();
    expect(ctx.renameDialogType).toBeDefined();
    expect(ctx.renameDialogValue).toBeDefined();
    expect(ctx.onConfirmRename).toBeTypeOf('function');
    expect(ctx.sqlPreviewDialogOpen).toBeDefined();
    expect(ctx.sqlPreviewDialogSQL).toBeDefined();
    expect(ctx.sqlPreviewDialogTitle).toBeDefined();
    expect(ctx.onRightClickItem).toBeTypeOf('function');
    expect(ctx.isFetching).toBeDefined();
    expect(ctx.safeModeLoading).toBeDefined();
  });

  it('selectedItem starts as null', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    expect(ctx.selectedItem.value).toBeNull();
  });

  it('dialogs start closed', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    expect(ctx.safeModeDialogOpen.value).toBe(false);
    expect(ctx.renameDialogOpen.value).toBe(false);
    expect(ctx.sqlPreviewDialogOpen.value).toBe(false);
  });

  it('isFetching starts as false', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    expect(ctx.isFetching.value).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. contextMenuItems computed – menu routing
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – contextMenuItems routing', () => {
  it('returns [refreshSchemaOption] when no item is selected', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    ctx.selectedItem.value = null;

    expect(ctx.contextMenuItems.value).toHaveLength(1);
    expect(getTitle(ctx.contextMenuItems.value[0])).toBe('Refresh Schema');
  });

  it('returns function menu when item tabViewType is FunctionsDetail', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'get_user',
      'fn-1'
    );

    const titles = ctx.contextMenuItems.value.map(getTitle);
    expect(titles).toContain('Rename...');
    expect(titles).toContain('Delete');
    expect(titles).toContain('Generate SQL');
  });

  it('returns table menu when item tabViewType is TableDetail', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users',
      'tbl-1'
    );

    const titles = ctx.contextMenuItems.value.map(getTitle);
    expect(titles).toContain('Export Data');
    expect(titles).toContain('Generate SQL');
  });

  it('returns view menu when item tabViewType is ViewDetail', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'user_view',
      'view-1'
    );

    const titles = ctx.contextMenuItems.value.map(getTitle);
    expect(titles).toContain('Generate SQL');
  });

  it('returns [refreshSchemaOption] for unknown tabViewType (fallthrough)', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    // TabViewType.CodeQuery is not handled → default branch
    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.CodeQuery,
      'none',
      'x-1'
    );

    expect(ctx.contextMenuItems.value).toHaveLength(1);
    expect(getTitle(ctx.contextMenuItems.value[0])).toBe('Refresh Schema');
  });
});

// ---------------------------------------------------------------------------
// 3. onRightClickItem
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – onRightClickItem', () => {
  it('sets selectedItem from the tree item value', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    const itemValue = makeSelectedItem(TabViewType.TableDetail);
    const fakeEvent = {} as MouseEvent;

    ctx.onRightClickItem(fakeEvent, { value: itemValue } as any);

    expect(ctx.selectedItem.value).toMatchObject({
      tabViewType: TabViewType.TableDetail,
    });
  });

  it('overwrites previous selectedItem on successive right-clicks', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    const fakeEvent = {} as MouseEvent;

    ctx.onRightClickItem(fakeEvent, {
      value: makeSelectedItem(TabViewType.TableDetail, 'users'),
    } as any);
    ctx.onRightClickItem(fakeEvent, {
      value: makeSelectedItem(TabViewType.FunctionsDetail, 'my_fn'),
    } as any);

    expect(ctx.selectedItem.value?.tabViewType).toBe(
      TabViewType.FunctionsDetail
    );
    expect(ctx.selectedItem.value?.name).toBe('my_fn');
  });
});

// ---------------------------------------------------------------------------
// 4. Safe mode dialog flow
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – safe mode (disabled)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({});
  });

  it('onSafeModeCancel closes dialog and clears pendingAction', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    ctx.safeModeDialogOpen.value = true;

    ctx.onSafeModeCancel();

    expect(ctx.safeModeDialogOpen.value).toBe(false);
  });

  it('onSafeModeConfirm with no pending action just closes dialog', async () => {
    const ctx = useSchemaContextMenu(makeOptions());
    ctx.safeModeDialogOpen.value = true;

    await ctx.onSafeModeConfirm();

    expect(ctx.safeModeDialogOpen.value).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Rename dispatch – onConfirmRename
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – onConfirmRename dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({});
  });

  it('dispatches to function rename when renameDialogType is FunctionsDetail', async () => {
    const opts = makeOptions();
    const ctx = useSchemaContextMenu(opts);

    // Simulate having clicked rename on a function
    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'old_fn',
      'fn-1'
    );
    ctx.renameDialogType.value = TabViewType.FunctionsDetail;
    ctx.renameDialogValue.value = 'old_fn';

    await ctx.onConfirmRename('new_fn');

    // $fetch should be called with /api/functions/rename
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/functions/rename',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ newName: 'new_fn' }),
      })
    );
  });

  it('dispatches to table rename when renameDialogType is TableDetail', async () => {
    const opts = makeOptions();
    const ctx = useSchemaContextMenu(opts);

    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'old_table',
      'tbl-1'
    );
    ctx.renameDialogType.value = TabViewType.TableDetail;
    ctx.renameDialogValue.value = 'old_table';

    await ctx.onConfirmRename('new_table');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/query/execute',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('dispatches to view rename when renameDialogType is ViewDetail', async () => {
    const opts = makeOptions({
      views: [
        {
          oid: 'view-1',
          name: 'old_view',
          type: 'VIEW' as any,
        },
      ],
    });
    const ctx = useSchemaContextMenu(opts);

    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.ViewDetail,
      'old_view',
      'view-1'
    );
    ctx.renameDialogType.value = TabViewType.ViewDetail;
    ctx.renameDialogValue.value = 'old_view';

    await ctx.onConfirmRename('new_view');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/query/execute',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('closes renameDialog before performing rename', async () => {
    const opts = makeOptions();
    const ctx = useSchemaContextMenu(opts);

    ctx.renameDialogOpen.value = true;
    ctx.renameDialogType.value = TabViewType.FunctionsDetail;
    ctx.renameDialogValue.value = 'old_fn';
    ctx.selectedItem.value = makeSelectedItem(
      TabViewType.FunctionsDetail,
      'old_fn'
    );

    mockFetch.mockImplementationOnce(async () => {
      // Dialog should already be closed at this point
      expect(ctx.renameDialogOpen.value).toBe(false);
      return {};
    });

    await ctx.onConfirmRename('new_fn');

    expect(ctx.renameDialogOpen.value).toBe(false);
  });

  it('does nothing when renameDialogType is unrecognised', async () => {
    const ctx = useSchemaContextMenu(makeOptions());
    ctx.renameDialogType.value = null;

    await ctx.onConfirmRename('anything');

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Refresh schema wrapper
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – refresh schema menu action', () => {
  beforeEach(() => vi.clearAllMocks());

  it('contextMenuItems[0] calls onRefreshSchema via the wrapper', async () => {
    const opts = makeOptions();
    const ctx = useSchemaContextMenu(opts);

    // Select nothing so we get the fallback [refreshSchemaOption]
    ctx.selectedItem.value = null;

    const item = ctx.contextMenuItems.value[0];
    expect(getTitle(item)).toBe('Refresh Schema');
    expect(item.type).toBe(ContextMenuItemType.ACTION);

    await getSelect(item)?.();

    expect(opts.onRefreshSchema).toHaveBeenCalledOnce();
  });

  it('shows toast.loading then toast.success on refresh', async () => {
    const { toast } = await import('vue-sonner');
    const opts = makeOptions();
    const ctx = useSchemaContextMenu(opts);
    ctx.selectedItem.value = null;

    await getSelect(ctx.contextMenuItems.value[0])?.();

    expect(toast.loading).toHaveBeenCalledWith('Refreshing schema...');
    expect(toast.success).toHaveBeenCalledWith(
      'Schema refreshed',
      expect.any(Object)
    );
  });

  it('shows toast.error when refresh throws', async () => {
    const { toast } = await import('vue-sonner');
    const opts = makeOptions();
    opts.onRefreshSchema.mockRejectedValueOnce(new Error('Network error'));
    const ctx = useSchemaContextMenu(opts);
    ctx.selectedItem.value = null;

    await getSelect(ctx.contextMenuItems.value[0])?.();

    expect(toast.error).toHaveBeenCalledWith(
      'Network error',
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// 7. SQL preview dialog
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – SQL preview dialog', () => {
  it('sqlPreviewDialogTitle defaults to "Generated SQL"', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    expect(ctx.sqlPreviewDialogTitle.value).toBe('Generated SQL');
  });

  it('sqlPreviewDialogOpen starts false', () => {
    const ctx = useSchemaContextMenu(makeOptions());
    expect(ctx.sqlPreviewDialogOpen.value).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. Edge cases & defensive guards
// ---------------------------------------------------------------------------

describe('useSchemaContextMenu – edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({});
  });

  it('does not throw when activeSchema is undefined', () => {
    const opts = {
      schemaName: ref('public'),
      activeSchema: ref<Schema | undefined>(undefined),
      onRefreshSchema: vi.fn().mockResolvedValue(undefined),
    };

    expect(() => useSchemaContextMenu(opts)).not.toThrow();
  });

  it('contextMenuItems reactively update when selectedItem changes', () => {
    const ctx = useSchemaContextMenu(makeOptions());

    ctx.selectedItem.value = null;
    expect(getTitle(ctx.contextMenuItems.value[0])).toBe('Refresh Schema');

    ctx.selectedItem.value = makeSelectedItem(TabViewType.FunctionsDetail);
    expect(
      ctx.contextMenuItems.value.some(i => getTitle(i) === 'Rename...')
    ).toBe(true);

    ctx.selectedItem.value = null;
    expect(getTitle(ctx.contextMenuItems.value[0])).toBe('Refresh Schema');
  });
});
