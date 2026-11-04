import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { buildFunctionMenuItems } from '~/components/modules/management/schemas/hooks/context-menu/menuItems/functionMenuItems';
import { buildTableMenuItems } from '~/components/modules/management/schemas/hooks/context-menu/menuItems/tableMenuItems';
import { buildViewMenuItems } from '~/components/modules/management/schemas/hooks/context-menu/menuItems/viewMenuItems';
import { ExportDataFormatType } from '~/components/modules/management/schemas/hooks/context-menu/types';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { ViewSchemaEnum } from '~/core/types';
import { makeSelectedItem } from './testUtils';

const getTitle = (item: ContextMenuItem) =>
  'title' in item ? item.title : undefined;

describe('context menu item builders', () => {
  it('builds the function menu with the expected actions', () => {
    const actions = {
      onRenameFunction: vi.fn(),
      onDeleteFunction: vi.fn(),
      onGenFunctionCallSQL: vi.fn(),
      onGenFunctionSelectSQL: vi.fn(),
      onGenFunctionDDL: vi.fn(),
    } as any;

    const items = buildFunctionMenuItems(actions).value;
    const generateSqlItem = items[3] as any;

    expect(items.map(item => item.type)).toEqual([
      ContextMenuItemType.ACTION,
      ContextMenuItemType.ACTION,
      ContextMenuItemType.SEPARATOR,
      ContextMenuItemType.SUBMENU,
    ]);
    expect(generateSqlItem.items.map((item: any) => item.title)).toEqual([
      'CALL',
      'SELECT',
      undefined,
      'DDL',
    ]);

    generateSqlItem.items[0].select();
    expect(actions.onGenFunctionCallSQL).toHaveBeenCalledOnce();
  });

  it('builds the table menu and wires export formats plus refresh', () => {
    const actions = {
      onExportTableData: vi.fn(),
      onGenSelectSQL: vi.fn(),
      onGenInsertSQL: vi.fn(),
      onGenUpdateSQL: vi.fn(),
      onGenDeleteSQL: vi.fn(),
      onGenMergeSQL: vi.fn(),
      onGenInsertOnConflictSQL: vi.fn(),
      onGenUpdateFromSQL: vi.fn(),
      onGenDeleteUsingSQL: vi.fn(),
      onGenTableDDL: vi.fn(),
      onRenameTable: vi.fn(),
      onDeleteTable: vi.fn(),
    } as any;
    const refreshSchemaOption = {
      title: 'Refresh Schema',
      icon: 'hugeicons:refresh',
      type: ContextMenuItemType.ACTION,
      select: vi.fn(),
    } as const;

    const items = buildTableMenuItems(
      actions,
      refreshSchemaOption as any
    ).value;
    const exportItem = items[0] as any;
    const importItem = items[1] as any;

    exportItem.items[0].select();
    exportItem.items[1].select();
    exportItem.items[2].select();

    expect(actions.onExportTableData).toHaveBeenNthCalledWith(
      1,
      ExportDataFormatType.SQL
    );
    expect(actions.onExportTableData).toHaveBeenNthCalledWith(
      2,
      ExportDataFormatType.JSON
    );
    expect(actions.onExportTableData).toHaveBeenNthCalledWith(
      3,
      ExportDataFormatType.CSV
    );
    expect(importItem.disabled).toBe(true);
    expect(items.at(-1)).toBe(refreshSchemaOption);
  });

  it('includes refresh only for materialized views', () => {
    const actions = {
      getViewInfo: vi
        .fn()
        .mockReturnValue({ type: ViewSchemaEnum.MaterializedView }),
      onGenViewSelectSQL: vi.fn(),
      onGenViewDDL: vi.fn(),
      onRefreshMaterializedView: vi.fn(),
      onRenameView: vi.fn(),
      onDeleteView: vi.fn(),
    } as any;
    const state = {
      selectedItem: ref(
        makeSelectedItem(TabViewType.ViewDetail, 'user_mv', 'view-1')
      ),
    } as any;
    const refreshSchemaOption = {
      title: 'Refresh Schema',
      icon: 'hugeicons:refresh',
      type: ContextMenuItemType.ACTION,
      select: vi.fn(),
    } as any;

    const items = buildViewMenuItems(actions, state, refreshSchemaOption).value;
    expect(
      items.some(item => getTitle(item) === 'Refresh Materialized View')
    ).toBe(true);

    const normalViewActions = {
      ...actions,
      getViewInfo: vi.fn().mockReturnValue({ type: ViewSchemaEnum.View }),
    } as any;

    const normalItems = buildViewMenuItems(
      normalViewActions,
      state,
      refreshSchemaOption
    ).value;
    expect(
      normalItems.some(item => getTitle(item) === 'Refresh Materialized View')
    ).toBe(false);
  });
});
