import { describe, expect, it, vi } from 'vitest';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import {
  RawQueryContextMenuSection,
  type RawQueryContextMenuContext,
  type RawQueryDialectPlugin,
} from '~/components/modules/raw-query/registry/rawQueryPlugin.types';
import {
  SECTION_ORDER,
  buildContextMenuItems,
  type DefaultEditActions,
} from '~/components/modules/raw-query/utils/rawQueryContextMenu';

describe('buildContextMenuItems', () => {
  const createDummyContext = (
    statement: { text: string; from: number; to: number } | null = {
      text: 'SELECT 1;',
      from: 0,
      to: 9,
    }
  ): RawQueryContextMenuContext => ({
    editorView: {} as any,
    statement,
    hasSelection: false,
    selectionText: '',
    context: {} as any,
  });

  const createDefaultEditActions = (): DefaultEditActions => ({
    copyStatement: vi.fn(),
    copyAll: vi.fn(),
    deleteStatement: vi.fn(),
  });

  it('builds standard edit actions when plugin has no context menu config', () => {
    const dummyContext = createDummyContext();
    const editActions = createDefaultEditActions();

    const items = buildContextMenuItems(dummyContext, undefined, editActions);
    const titles = items.map(i => (i as any).title ?? (i as any).label);

    expect(titles).toContain('Copy Statement');
    expect(titles).toContain('Copy All');
    expect(titles).toContain('Delete Statement');

    const copyStatementItem = items.find(
      i => (i as any).title === 'Copy Statement'
    ) as any;
    const copyAllItem = items.find(i => (i as any).title === 'Copy All') as any;
    const deleteStatementItem = items.find(
      i => (i as any).title === 'Delete Statement'
    ) as any;

    expect(copyStatementItem.disabled).toBe(false);
    expect(deleteStatementItem.disabled).toBe(false);

    copyStatementItem.select();
    expect(editActions.copyStatement).toHaveBeenCalledOnce();

    copyAllItem.select();
    expect(editActions.copyAll).toHaveBeenCalledOnce();

    deleteStatementItem.select();
    expect(editActions.deleteStatement).toHaveBeenCalledOnce();
  });

  it('disables statement edit actions when statement is null', () => {
    const dummyContext = createDummyContext(null);
    const editActions = createDefaultEditActions();

    const items = buildContextMenuItems(dummyContext, undefined, editActions);

    const copyStatementItem = items.find(
      i => (i as any).title === 'Copy Statement'
    ) as any;
    const copyAllItem = items.find(i => (i as any).title === 'Copy All') as any;
    const deleteStatementItem = items.find(
      i => (i as any).title === 'Delete Statement'
    ) as any;

    expect(copyStatementItem.disabled).toBe(true);
    expect(deleteStatementItem.disabled).toBe(true);
    expect(copyAllItem.disabled).toBeFalsy();
  });

  it('merges dialect plugin items and separates sections', () => {
    const dummyContext = createDummyContext();
    const editActions = createDefaultEditActions();

    const mockPlugin: RawQueryDialectPlugin = {
      name: 'test-plugin',
      execute: vi.fn(),
      contextMenu: {
        getItems: () => [
          {
            type: ContextMenuItemType.ACTION,
            title: 'Execute Current Query',
            icon: 'hugeicons:play',
            section: RawQueryContextMenuSection.EXECUTION,
          } as ContextMenuItem,
        ],
      },
    };

    const items = buildContextMenuItems(dummyContext, mockPlugin, editActions);

    expect((items[0] as any).title).toBe('Execute Current Query');
    expect(items[1].type).toBe(ContextMenuItemType.SEPARATOR);

    const editTitles = items.slice(2).map(i => (i as any).title);
    expect(editTitles).toEqual([
      'Copy Statement',
      'Copy All',
      'Delete Statement',
    ]);
  });

  it('defaults dialect item section to TOOLS when not specified', () => {
    const dummyContext = createDummyContext();
    const editActions = createDefaultEditActions();

    const mockPlugin: RawQueryDialectPlugin = {
      name: 'test-plugin',
      execute: vi.fn(),
      contextMenu: {
        getItems: () => [
          {
            type: ContextMenuItemType.ACTION,
            title: 'Tool Without Section',
            icon: 'hugeicons:wrench-01',
          } as ContextMenuItem,
          {
            type: ContextMenuItemType.ACTION,
            title: 'Execute Query',
            icon: 'hugeicons:play',
            section: RawQueryContextMenuSection.EXECUTION,
          } as ContextMenuItem,
        ],
      },
    };

    const items = buildContextMenuItems(dummyContext, mockPlugin, editActions);

    // EXECUTION section comes before TOOLS section, which comes before EDIT section
    expect((items[0] as any).title).toBe('Execute Query');
    expect(items[1].type).toBe(ContextMenuItemType.SEPARATOR);
    expect((items[2] as any).title).toBe('Tool Without Section');
    expect(items[3].type).toBe(ContextMenuItemType.SEPARATOR);
    expect((items[4] as any).title).toBe('Copy Statement');
  });

  it('respects SECTION_ORDER and only inserts separators between non-empty sections', () => {
    const dummyContext = createDummyContext();

    const mockPlugin: RawQueryDialectPlugin = {
      name: 'test-plugin',
      execute: vi.fn(),
      contextMenu: {
        getItems: () => [
          {
            type: ContextMenuItemType.ACTION,
            title: 'Analyze Query',
            icon: 'hugeicons:analytics-01',
            section: RawQueryContextMenuSection.ANALYSIS,
          } as ContextMenuItem,
          {
            type: ContextMenuItemType.ACTION,
            title: 'Format SQL',
            icon: 'hugeicons:magic-wand-01',
            section: RawQueryContextMenuSection.FORMAT,
          } as ContextMenuItem,
        ],
      },
    };

    const items = buildContextMenuItems(dummyContext, mockPlugin, undefined);

    expect(items).toHaveLength(3);
    expect((items[0] as any).title).toBe('Analyze Query');
    expect(items[1].type).toBe(ContextMenuItemType.SEPARATOR);
    expect((items[2] as any).title).toBe('Format SQL');
  });

  it('respects buildMenu override if provided by plugin', () => {
    const dummyContext = createDummyContext();
    const editActions = createDefaultEditActions();
    const customItems: ContextMenuItem[] = [
      {
        type: ContextMenuItemType.ACTION,
        title: 'Custom Only',
        icon: 'hugeicons:play',
      },
    ];

    const buildMenuSpy = vi.fn().mockReturnValue(customItems);
    const mockPlugin: RawQueryDialectPlugin = {
      name: 'test-plugin',
      execute: vi.fn(),
      contextMenu: {
        buildMenu: buildMenuSpy,
      },
    };

    const items = buildContextMenuItems(dummyContext, mockPlugin, editActions);

    expect(buildMenuSpy).toHaveBeenCalledWith(dummyContext);
    expect(items).toEqual(customItems);
  });

  it('returns empty array when no items and no editActions are provided', () => {
    const dummyContext = createDummyContext();
    const items = buildContextMenuItems(dummyContext, undefined, undefined);
    expect(items).toEqual([]);
  });

  it('exports SECTION_ORDER with correct ordering', () => {
    expect(SECTION_ORDER).toEqual([
      RawQueryContextMenuSection.EXECUTION,
      RawQueryContextMenuSection.ANALYSIS,
      RawQueryContextMenuSection.FORMAT,
      RawQueryContextMenuSection.TOOLS,
      RawQueryContextMenuSection.EDIT,
    ]);
  });
});
