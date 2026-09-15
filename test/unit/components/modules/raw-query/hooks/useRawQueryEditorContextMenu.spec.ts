import { ref } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ContextMenuItemType } from '~/components/base/context-menu/menuContext.type';
import { useRawQueryEditorContextMenu } from '~/components/modules/raw-query/hooks/useRawQueryEditorContextMenu';
import {
  RawQueryContextMenuSection,
  type RawQueryDialectPlugin,
} from '~/components/modules/raw-query/registry/rawQueryPlugin.types';

describe('useRawQueryEditorContextMenu', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createMockView = (
    content = 'SELECT 1;',
    selection = { from: 0, to: 0, head: 0, empty: true }
  ) => {
    return {
      state: {
        doc: {
          toString: () => content,
          length: content.length,
          lineAt: (_pos: number) => ({
            text: content,
            from: 0,
            to: content.length,
          }),
          sliceString: (from: number, to: number) => content.slice(from, to),
        },
        selection: {
          main: selection,
        },
        sliceDoc: (from: number, to: number) => content.slice(from, to),
      },
      dispatch: vi.fn(),
      focus: vi.fn(),
    } as any;
  };

  it('1. returns context menu items with default actions (copy, delete, execute) when called with basic actions', () => {
    const mockView = createMockView('SELECT 1;');
    const onExecuteCurrent = vi.fn();
    const onExplainAnalyzeCurrent = vi.fn();
    const onHandleFormatCurrentStatement = vi.fn();
    const onHandleFormatCode = vi.fn();

    const menu = useRawQueryEditorContextMenu({
      getEditorView: () => mockView,
      onExecuteCurrent,
      onExplainAnalyzeCurrent,
      onHandleFormatCurrentStatement,
      onHandleFormatCode,
      isFormatSupported: ref(true),
      isExplainSupported: ref(true),
    });

    const items = menu.contextMenuItems.value;
    expect(items.length).toBeGreaterThan(0);
    // Backward-compatible alias
    expect(menu.menuItems.value).toEqual(items);

    const titles = items.map((i: any) => i.title || i.label).filter(Boolean);
    expect(titles).toContain('Run Current Query');
    expect(titles).toContain('Explain Query');
    expect(titles).toContain('Format Statement');
    expect(titles).toContain('Format All');
    expect(titles).toContain('Copy Statement');
    expect(titles).toContain('Copy All');
    expect(titles).toContain('Delete Statement');

    // Test execute callback
    const executeItem = items.find(
      (i: any) => (i.title || i.label) === 'Run Current Query'
    ) as any;
    expect(executeItem).toBeDefined();
    expect(executeItem.disabled).toBe(false);
    executeItem.select();
    expect(onExecuteCurrent).toHaveBeenCalledOnce();

    // Test explain callback
    const explainItem = items.find(
      (i: any) => (i.title || i.label) === 'Explain Query'
    ) as any;
    expect(explainItem).toBeDefined();
    explainItem.select();
    expect(onExplainAnalyzeCurrent).toHaveBeenCalledOnce();

    // Test format callbacks
    const formatStmtItem = items.find(
      (i: any) => (i.title || i.label) === 'Format Statement'
    ) as any;
    expect(formatStmtItem).toBeDefined();
    formatStmtItem.select();
    expect(onHandleFormatCurrentStatement).toHaveBeenCalledOnce();

    const formatAllItem = items.find(
      (i: any) => (i.title || i.label) === 'Format All'
    ) as any;
    expect(formatAllItem).toBeDefined();
    formatAllItem.select();
    expect(onHandleFormatCode).toHaveBeenCalledOnce();

    // Test deleteStatement execution
    const deleteItem = items.find(
      (i: any) => (i.title || i.label) === 'Delete Statement'
    ) as any;
    expect(deleteItem).toBeDefined();
    deleteItem.select();
    expect(mockView.dispatch).toHaveBeenCalledOnce();
  });

  it('2. works seamlessly with a custom dialect plugin passed via plugin', () => {
    const mockView = createMockView('db.users.find()');
    const customToolAction = vi.fn();
    const customResolve = vi.fn((_view: any) => ({
      text: 'db.users.find()',
      from: 0,
      to: 16,
    }));

    const customPlugin: RawQueryDialectPlugin = {
      name: 'custom-mongo-dialect',
      resolveStatement: customResolve,
      execute: vi.fn(),
      contextMenu: {
        getItems: ctx => [
          {
            section: RawQueryContextMenuSection.TOOLS,
            type: ContextMenuItemType.ACTION,
            title: 'Custom Mongo Tool',
            label: 'Custom Mongo Tool',
            select: customToolAction,
            action: customToolAction,
          },
        ],
      },
    };

    const menu = useRawQueryEditorContextMenu({
      getEditorView: () => mockView,
      plugin: customPlugin,
    });

    const items = menu.contextMenuItems.value;
    const titles = items.map((i: any) => i.title || i.label).filter(Boolean);

    expect(titles).toContain('Custom Mongo Tool');
    expect(titles).toContain('Copy Statement');
    expect(titles).toContain('Copy All');
    expect(titles).toContain('Delete Statement');

    const toolItem = items.find(
      (i: any) => (i.title || i.label) === 'Custom Mongo Tool'
    ) as any;
    toolItem.select();
    expect(customToolAction).toHaveBeenCalledOnce();

    // Verify resolveStatement is called on the plugin
    menu.copyStatement();
    expect(customResolve).toHaveBeenCalled();
  });

  it('works with buildMenu override in custom dialect plugin', () => {
    const mockView = createMockView('SET foo bar');
    const customPlugin: RawQueryDialectPlugin = {
      name: 'redis-override',
      execute: vi.fn(),
      contextMenu: {
        buildMenu: _ctx => [
          {
            type: ContextMenuItemType.ACTION,
            title: 'Custom Redis Action',
            label: 'Custom Redis Action',
          },
        ],
      },
    };

    const menu = useRawQueryEditorContextMenu({
      getEditorView: () => mockView,
      plugin: customPlugin,
    });

    const items = menu.contextMenuItems.value;
    expect(items).toHaveLength(1);
    expect((items[0] as any).title).toBe('Custom Redis Action');
  });

  it('3. onContextMenuOpen updates internal statement/content state based on editorView', () => {
    let currentView: any = null;

    const menu = useRawQueryEditorContextMenu({
      getEditorView: () => currentView,
      onExecuteCurrent: vi.fn(),
      onExplainAnalyzeCurrent: vi.fn(),
      onHandleFormatCurrentStatement: vi.fn(),
      onHandleFormatCode: vi.fn(),
    });

    // Initially with null view
    menu.onContextMenuOpen(true);
    expect(menu.hasContent.value).toBe(false);
    expect(menu.hasStatement.value).toBe(false);

    // Empty document view
    currentView = createMockView('', { from: 0, to: 0, head: 0, empty: true });
    // Override lineAt for empty doc
    currentView.state.doc.lineAt = () => ({ text: '', from: 0, to: 0 });

    menu.onContextMenuOpen(true);
    expect(menu.hasContent.value).toBe(false);
    expect(menu.hasStatement.value).toBe(false);

    // Non-empty document view with statement
    currentView = createMockView('SELECT 1;');
    menu.onContextMenuOpen(true);
    expect(menu.hasContent.value).toBe(true);
    expect(menu.hasStatement.value).toBe(true);

    // Calling with open = false should not update state
    currentView = null;
    menu.onContextMenuOpen(false);
    expect(menu.hasContent.value).toBe(true);
    expect(menu.hasStatement.value).toBe(true);

    // onOpenMenu alias works identically
    menu.onOpenMenu(true);
    expect(menu.hasContent.value).toBe(false);
    expect(menu.hasStatement.value).toBe(false);
  });
});
