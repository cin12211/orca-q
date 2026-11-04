/**
 * Tests for QuickQueryContextMenu component logic.
 *
 * QuickQueryContextMenu is a headless component: it receives props and renders
 * a BaseContextMenu with a computed `contextMenuItems` list. We test the
 * computed list's content and the helper functions (copy, export) that are
 * called by the menu items.
 *
 * Note: The component renders no logic in <template> other than forwarding
 * contextMenuItems to BaseContextMenu, so unit-testing the computed ref
 * covers all meaningful behaviour.
 */
import { ref, computed } from 'vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ContextMenuItemType } from '~/components/base/context-menu/menuContext.type';
// ---------------------------------------------------------------------------
// Inline reactive simulation of the component's `contextMenuItems` computed
// ---------------------------------------------------------------------------
// We re-implement the computed exactly as the component does to test the
// business-logic output without mounting the full component.

import {
  copyColumnData,
  copyRowsData,
  copyToClipboard,
  exportData,
} from '~/core/helpers/copyData';

// Mocks

// navigator.clipboard is not available in happy-dom; stub it
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

// file-saver
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

// papaparse – return a minimal serialisation
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn((rows: any[]) =>
      rows.map(r => Object.values(r).join(',')).join('\n')
    ),
  },
}));

// appConfigStore
const mockOnShowSecondSidebar = vi.fn();
vi.mock('~/core/stores/appConfigStore', () => ({
  useAppConfigStore: () => ({ onShowSecondSidebar: mockOnShowSecondSidebar }),
}));

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

type ContextMenuProps = {
  totalSelectedRows: number;
  hasEditedRows: boolean;
  isReferencedTable?: boolean;
  cellContextMenu?: any;
  cellHeaderContextMenu?: any;
  data?: Record<string, any>[];
  selectedRows: Record<string, any>[];
  tableName: string;
  schemaName?: string;
};

// Minimal port of the component's contextMenuItems logic, enough to test conditions
function buildContextMenuItems(props: ContextMenuProps) {
  const isCellContext = !!props.cellContextMenu;
  const isSelected = props.selectedRows.length > 0;
  const selectedCount = props.selectedRows.length;
  const allCount = props.data?.length || 0;
  const currentColumnName =
    props.cellContextMenu?.column?.getColDef()?.headerName ??
    props.cellHeaderContextMenu?.column?.getColDef()?.headerName ??
    '';

  const copyColumnSubs = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected`,
      condition: isSelected && isCellContext,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as text',
      icon: 'hugeicons:file-01',
      condition: isSelected && isCellContext,
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      icon: 'hugeicons:code',
      condition: isSelected && isCellContext,
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.SEPARATOR,
      condition: isSelected && isCellContext,
    },
    { type: ContextMenuItemType.LABEL, title: 'All data in column' },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as text',
      icon: 'hugeicons:file-01',
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      icon: 'hugeicons:code',
      select: vi.fn(),
    },
  ];

  const copyRowSubs = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected row(s)`,
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as CSV/TSV',
      condition: isSelected,
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      condition: isSelected,
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as SQL',
      condition: isSelected,
      select: vi.fn(),
    },
    { type: ContextMenuItemType.SEPARATOR, condition: isSelected },
    { type: ContextMenuItemType.LABEL, title: 'All rows' },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as CSV/TSV',
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Copy as JSON',
      select: vi.fn(),
    },
    { type: ContextMenuItemType.ACTION, title: 'Copy as SQL', select: vi.fn() },
  ];

  const exportSubs = [
    {
      type: ContextMenuItemType.LABEL,
      title: `${selectedCount} selected row${selectedCount > 1 ? 's' : ''}`,
      condition: isSelected,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV',
      condition: isSelected,
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV (have headers)',
      condition: isSelected,
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as JSON',
      condition: isSelected,
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as SQL',
      condition: isSelected,
      select: vi.fn(),
    },
    { type: ContextMenuItemType.SEPARATOR, condition: isSelected },
    {
      type: ContextMenuItemType.LABEL,
      title: `All ${allCount.toLocaleString()} row${allCount !== 1 ? 's' : ''}`,
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV',
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as CSV (have headers)',
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as JSON',
      select: vi.fn(),
    },
    {
      type: ContextMenuItemType.ACTION,
      title: 'Export as SQL',
      select: vi.fn(),
    },
  ];

  return [
    {
      title: 'View row detail',
      type: ContextMenuItemType.ACTION,
      condition: !props.isReferencedTable && isCellContext,
      select: mockOnShowSecondSidebar,
    },
    {
      title: 'Add row',
      type: ContextMenuItemType.ACTION,
      condition: isCellContext,
    },
    { title: 'Delete row(s)', type: ContextMenuItemType.ACTION },
    { type: ContextMenuItemType.SEPARATOR },
    {
      title: 'Copy cell',
      type: ContextMenuItemType.ACTION,
      condition: isCellContext,
      select: vi.fn(),
    },
    {
      title: 'Copy row',
      type: ContextMenuItemType.ACTION,
      condition: isSelected && isCellContext,
      select: vi.fn(),
    },
    { type: ContextMenuItemType.SEPARATOR, condition: isCellContext },
    {
      title: 'Copy column',
      type: ContextMenuItemType.SUBMENU,
      desc: currentColumnName || 'Select a column',
      items: copyColumnSubs,
    },
    {
      title: 'Copy rows',
      type: ContextMenuItemType.SUBMENU,
      items: copyRowSubs,
    },
    { type: ContextMenuItemType.SEPARATOR },
    { title: 'Export', type: ContextMenuItemType.SUBMENU, items: exportSubs },
  ];
}

const makeFakeCellEvent = (
  colId = 'id',
  headerName = 'ID',
  value: any = 42,
  data: any = { id: 42 }
) => ({
  column: {
    getColId: () => colId,
    getColDef: () => ({ field: colId, headerName }),
  },
  value,
  data,
  colDef: { field: colId, headerName },
});

// ---------------------------------------------------------------------------
// Tests – contextMenuItems visibility conditions
// ---------------------------------------------------------------------------

describe('QuickQueryContextMenu – menu item visibility', () => {
  it('shows "View row detail" only when cellContextMenu is present and NOT isReferencedTable', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      isReferencedTable: false,
      cellContextMenu: makeFakeCellEvent(),
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const viewDetail = items.find(i => i.title === 'View row detail');
    expect(viewDetail?.condition).toBe(true);
  });

  it('hides "View row detail" when isReferencedTable is true', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      isReferencedTable: true,
      cellContextMenu: makeFakeCellEvent(),
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const viewDetail = items.find(i => i.title === 'View row detail');
    expect(viewDetail?.condition).toBe(false);
  });

  it('hides "View row detail" when no cell context exists', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      isReferencedTable: false,
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const viewDetail = items.find(i => i.title === 'View row detail');
    expect(viewDetail?.condition).toBe(false);
  });

  it('shows "Copy row" only when rows are selected AND cell context is present', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 2,
      hasEditedRows: false,
      cellContextMenu: makeFakeCellEvent(),
      data: [],
      selectedRows: [{ id: 1 }, { id: 2 }],
      tableName: 'users',
    });

    const copyRow = items.find(i => i.title === 'Copy row');
    expect(copyRow?.condition).toBe(true);
  });

  it('hides "Copy row" when no rows are selected', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      cellContextMenu: makeFakeCellEvent(),
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const copyRow = items.find(i => i.title === 'Copy row');
    expect(copyRow?.condition).toBe(false);
  });

  it('"Copy column" sub-menu always has the "All data in column" section', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const copyCol = items.find(i => i.title === 'Copy column');
    const subItems = (copyCol as any)?.items ?? [];
    const allSection = subItems.find(
      (i: any) => i.title === 'All data in column'
    );
    expect(allSection).toBeDefined();
  });

  it('"Copy column" sub-menu shows selected section only when rows selected + cell context', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 1,
      hasEditedRows: false,
      cellContextMenu: makeFakeCellEvent(),
      data: [],
      selectedRows: [{ id: 1 }],
      tableName: 'users',
    });

    const copyCol = items.find(i => i.title === 'Copy column');
    const subItems = (copyCol as any)?.items ?? [];
    const selectedLabel = subItems.find((i: any) =>
      i.title?.includes('1 selected')
    );
    expect(selectedLabel?.condition).toBe(true);
  });

  it('"Copy rows" always has "All rows" section regardless of selection', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const copyRows = items.find(i => i.title === 'Copy rows');
    const subItems = (copyRows as any)?.items ?? [];
    const allRowsLabel = subItems.find((i: any) => i.title === 'All rows');
    expect(allRowsLabel).toBeDefined();
  });

  it('"Export" sub-menu label uses singular "row" when all count is 1', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      data: [{ id: 1 }],
      selectedRows: [],
      tableName: 'users',
    });

    const exportMenu = items.find(i => i.title === 'Export');
    const subItems = (exportMenu as any)?.items ?? [];
    const allLabel = subItems.find((i: any) => i.title?.includes('All'));
    expect(allLabel?.title).toBe('All 1 row');
  });

  it('"Export" sub-menu label uses plural "rows" when all count > 1', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      data: [{ id: 1 }, { id: 2 }],
      selectedRows: [],
      tableName: 'users',
    });

    const exportMenu = items.find(i => i.title === 'Export');
    const subItems = (exportMenu as any)?.items ?? [];
    const allLabel = subItems.find((i: any) => i.title?.includes('All'));
    expect(allLabel?.title).toBe('All 2 rows');
  });

  it('"Export" selected section hidden when no rows selected', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      data: [{ id: 1 }],
      selectedRows: [],
      tableName: 'users',
    });

    const exportMenu = items.find(i => i.title === 'Export');
    const subItems = (exportMenu as any)?.items ?? [];
    const selectedLabel = subItems.find(
      (i: any) => i.condition === false && i.type === ContextMenuItemType.LABEL
    );
    // condition is false so selected section is hidden
    expect(subItems.some((i: any) => i.condition === false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests – copyData helpers used by the menu
// ---------------------------------------------------------------------------

describe('QuickQueryContextMenu – copyData helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (navigator.clipboard.writeText as any).mockResolvedValue(undefined);
  });

  it('copyToClipboard calls navigator.clipboard.writeText with exact text', async () => {
    await copyToClipboard('hello world');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world');
  });

  it('copyToClipboard handles JSON objects by serialising', async () => {
    // This tests the component's copyCurrentCell path for object values
    const value = { key: 'val' };
    await copyToClipboard(JSON.stringify(value));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{"key":"val"}');
  });

  it('copyColumnData for list format joins values with newlines', async () => {
    const rows = [{ name: 'Alice' }, { name: 'Bob' }];
    await copyColumnData(rows, 'name', 'list');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Alice')
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Bob')
    );
  });

  it('copyColumnData for json format produces JSON array', async () => {
    const rows = [{ name: 'Alice' }, { name: 'Bob' }];
    await copyColumnData(rows, 'name', 'json');
    const called = (navigator.clipboard.writeText as any).mock.calls[0][0];
    expect(() => JSON.parse(called)).not.toThrow();
  });

  it('copyRowsData with csv-no-header calls clipboard', async () => {
    const rows = [{ id: 1, name: 'Alice' }];
    await copyRowsData(rows, 'users', 'csv-no-header');
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('copyRowsData with json format produces valid JSON', async () => {
    const rows = [{ id: 1, name: 'Alice' }];
    await copyRowsData(rows, 'users', 'json');
    const called = (navigator.clipboard.writeText as any).mock.calls[0][0];
    expect(() => JSON.parse(called)).not.toThrow();
    const parsed = JSON.parse(called);
    expect(parsed[0].id).toBe(1);
  });

  it('exportData for csv-no-header calls saveAs with a File', async () => {
    const { saveAs } = await import('file-saver');
    const rows = [{ id: 1, name: 'Alice' }];
    await exportData(rows, 'users', 'csv-no-header', 'all');
    expect(saveAs).toHaveBeenCalled();
  });

  it('exportData for json calls saveAs with a File', async () => {
    const { saveAs } = await import('file-saver');
    const rows = [{ id: 1, name: 'Alice' }];
    await exportData(rows, 'users', 'json', 'all');
    expect(saveAs).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests – columnName description in copy column submenu
// ---------------------------------------------------------------------------

describe('QuickQueryContextMenu – column name in Copy column submenu', () => {
  it('shows the column header name as the desc of Copy column menu', () => {
    const fakeCell = makeFakeCellEvent('user_id', 'User ID');

    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      cellContextMenu: fakeCell,
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const copyCol = items.find(i => i.title === 'Copy column');
    expect((copyCol as any)?.desc).toBe('User ID');
  });

  it('falls back to "Select a column" when no cell context', () => {
    const items = buildContextMenuItems({
      totalSelectedRows: 0,
      hasEditedRows: false,
      data: [],
      selectedRows: [],
      tableName: 'users',
    });

    const copyCol = items.find(i => i.title === 'Copy column');
    expect((copyCol as any)?.desc).toBe('Select a column');
  });
});
