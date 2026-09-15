/**
 * @vitest-environment happy-dom
 */
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it, vi } from 'vitest';
import { sqlParserConfigField } from '~/components/base/code-editor/states/sqlParserConfig';
import {
  postgresPlugin,
  mongoPlugin,
  redisPlugin,
  sqlitePlugin,
} from '~/components/modules/raw-query/registry/plugins';
import {
  RawQueryContextMenuSection,
  type RawQueryContext,
  type RawQueryContextMenuContext,
  type RawQueryExecutionContext,
} from '~/components/modules/raw-query/registry/rawQueryPlugin.types';

const createMockContext = (
  overrides?: Partial<RawQueryContext>
): RawQueryContext =>
  ({
    workspaceId: 'ws-1',
    selectedConnectionId: 'conn-1',
    connections: [],
    disableConnectionSwitch: false,
    fileContents: '',
    fileVariables: '',
    codeEditorLayout: 'horizontal' as any,
    isFormatSupported: false,
    isVariableSupported: false,
    isExplainSupported: false,
    cursorInfo: { line: 1, column: 1 },
    executeLoading: false,
    isStreaming: false,
    onExecuteCurrent: vi.fn(),
    onExplainAnalyzeCurrent: vi.fn(),
    onFormatCurrentStatement: vi.fn(),
    onFormatAll: vi.fn(),
    ...overrides,
  }) as unknown as RawQueryContext;

describe('Dialect Plugins Implementation', () => {
  describe('Postgres Plugin', () => {
    it('has correct name and properties', () => {
      expect(postgresPlugin.name).toBe('postgres-plugin');
      expect(typeof postgresPlugin.resolveStatement).toBe('function');
      expect(typeof postgresPlugin.execute).toBe('function');
      expect(typeof postgresPlugin.contextMenu?.getItems).toBe('function');
    });

    it('delegates execution to onExecuteCurrent', async () => {
      const mockContext = createMockContext();
      const execCtx: RawQueryExecutionContext = {
        context: mockContext,
        sourceText: 'SELECT 1;',
      };

      const result = await postgresPlugin.execute(execCtx);

      expect(mockContext.onExecuteCurrent).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('resolves statement correctly', () => {
      const state = EditorState.create({
        doc: 'SELECT 1;\nSELECT 2;',
        extensions: [sqlParserConfigField],
      });
      const view = new EditorView({ state });
      const context = createMockContext();

      const stmt = postgresPlugin.resolveStatement!(view, context);
      expect(stmt).toBeDefined();
    });

    it('returns null when statement resolution finds no statements', () => {
      const state = EditorState.create({
        doc: '',
        extensions: [sqlParserConfigField],
      });
      const view = new EditorView({ state });
      const context = createMockContext();

      const stmt = postgresPlugin.resolveStatement!(view, context);
      expect(stmt).toBeNull();
    });

    it('provides context menu items with EXECUTION, ANALYSIS, and FORMAT sections', () => {
      const state = EditorState.create({ doc: 'SELECT 1;' });
      const view = new EditorView({ state });
      const context = createMockContext({
        isExplainSupported: true,
        isFormatSupported: true,
      });

      const menuCtx: RawQueryContextMenuContext = {
        editorView: view,
        statement: { text: 'SELECT 1;', from: 0, to: 9 },
        hasSelection: false,
        selectionText: '',
        context,
      };

      const items = (postgresPlugin.contextMenu?.getItems!(menuCtx) ??
        []) as any[];

      const runItem = items.find(i => i.title === 'Run Current Query');
      expect(runItem).toBeDefined();
      expect(runItem.shortcut).toBe('⌘⏎');
      expect(runItem.icon).toBe('hugeicons:play');
      expect(runItem.disabled).toBe(false);
      expect(runItem.section).toBe(RawQueryContextMenuSection.EXECUTION);
      runItem.select();
      expect(context.onExecuteCurrent).toHaveBeenCalled();

      const explainItem = items.find(i => i.title === 'Explain Query');
      expect(explainItem).toBeDefined();
      expect(explainItem.icon).toBe('hugeicons:dashboard-speed-01');
      expect(explainItem.section).toBe(RawQueryContextMenuSection.ANALYSIS);
      explainItem.select();
      expect(context.onExplainAnalyzeCurrent).toHaveBeenCalled();

      const formatStmtItem = items.find(i => i.title === 'Format Statement');
      expect(formatStmtItem).toBeDefined();
      expect(formatStmtItem.icon).toBe('hugeicons:text-align-left');
      expect(formatStmtItem.section).toBe(RawQueryContextMenuSection.FORMAT);
      formatStmtItem.select();
      expect(context.onFormatCurrentStatement).toHaveBeenCalled();

      const formatAllItem = items.find(i => i.title === 'Format All');
      expect(formatAllItem).toBeDefined();
      expect(formatAllItem.icon).toBe('hugeicons:align-left');
      expect(formatAllItem.section).toBe(RawQueryContextMenuSection.FORMAT);
      formatAllItem.select();
      expect(context.onFormatAll).toHaveBeenCalled();
    });

    it('disables context menu actions when statement is null', () => {
      const state = EditorState.create({ doc: '' });
      const view = new EditorView({ state });
      const context = createMockContext({
        isExplainSupported: true,
        isFormatSupported: true,
      });

      const menuCtx: RawQueryContextMenuContext = {
        editorView: view,
        statement: null,
        hasSelection: false,
        selectionText: '',
        context,
      };

      const items = (postgresPlugin.contextMenu?.getItems!(menuCtx) ??
        []) as any[];
      const runItem = items.find(i => i.title === 'Run Current Query');
      expect(runItem.disabled).toBe(true);

      const explainItem = items.find(i => i.title === 'Explain Query');
      expect(explainItem.disabled).toBe(true);

      const formatStmtItem = items.find(i => i.title === 'Format Statement');
      expect(formatStmtItem.disabled).toBe(true);
    });
  });

  describe('Mongo Plugin', () => {
    it('has correct name and properties', () => {
      expect(mongoPlugin.name).toBe('mongo-plugin');
      expect(typeof mongoPlugin.createDialectState).toBe('function');
      expect(typeof mongoPlugin.resolveStatement).toBe('function');
      expect(typeof mongoPlugin.formatCode).toBe('function');
      expect(typeof mongoPlugin.execute).toBe('function');
      expect(typeof mongoPlugin.contextMenu?.getItems).toBe('function');
    });

    it('initializes and manages Mongo dialect state', () => {
      const state = mongoPlugin.createDialectState!();
      expect(state.badgeText.value).toBe('MongoDB Beta');
      expect(state.clickCount.value).toBe(0);

      state.incrementCount();
      expect(state.clickCount.value).toBe(1);

      state.resetCount();
      expect(state.clickCount.value).toBe(0);
      expect(state.pendingApproval).toBeDefined();
    });

    it('resolves entire Mongo script source', () => {
      const doc = 'db.users.find({ status: "active" })';
      const state = EditorState.create({ doc });
      const view = new EditorView({ state });
      const context = createMockContext();

      const stmt = mongoPlugin.resolveStatement!(view, context);
      expect(stmt).toEqual({
        text: doc,
        from: 0,
        to: doc.length,
      });
    });

    it('formats Mongo code via formatCode', async () => {
      const unformatted =
        'const users=db.collection("users");return users.find();';
      const formatted = await mongoPlugin.formatCode!(
        unformatted,
        createMockContext()
      );
      expect(formatted).toContain("const users = db.collection('users');");
    });

    it('delegates execution to onExecuteCurrent', async () => {
      const mockContext = createMockContext();
      const execCtx: RawQueryExecutionContext<any> = {
        context: mockContext,
        sourceText: 'db.users.find()',
      };

      const result = await mongoPlugin.execute(execCtx);
      expect(mockContext.onExecuteCurrent).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('provides context menu items including wrap with toArray() when text is selected', () => {
      const doc = 'db.users.find()';
      const state = EditorState.create({
        doc,
        selection: { anchor: 0, head: doc.length },
      });
      const view = new EditorView({ state });
      const context = createMockContext();

      const menuCtx: RawQueryContextMenuContext<any> = {
        editorView: view,
        statement: { text: doc, from: 0, to: doc.length },
        hasSelection: true,
        selectionText: doc,
        context,
      };

      const items = (mongoPlugin.contextMenu?.getItems!(menuCtx) ??
        []) as any[];

      const execItem = items.find(i => i.title === 'Execute Script');
      expect(execItem).toBeDefined();
      expect(execItem.shortcut).toBe('⌘⏎');
      expect(execItem.icon).toBe('hugeicons:play');
      execItem.select();
      expect(context.onExecuteCurrent).toHaveBeenCalled();

      const formatItem = items.find(i => i.title === 'Format Script');
      expect(formatItem).toBeDefined();
      expect(formatItem.icon).toBe('hugeicons:align-left');
      formatItem.select();
      expect(context.onFormatAll).toHaveBeenCalled();

      const wrapItem = items.find(i => i.title === 'Wrap with toArray()');
      expect(wrapItem).toBeDefined();
      expect(wrapItem.icon).toBe('hugeicons:code');
      expect(wrapItem.section).toBe(RawQueryContextMenuSection.TOOLS);

      wrapItem.select();
      expect(view.state.doc.toString()).toBe('db.users.find().toArray()');
    });

    it('does not include wrap with toArray() when no selection is present', () => {
      const state = EditorState.create({ doc: 'db.users.find()' });
      const view = new EditorView({ state });
      const context = createMockContext();

      const menuCtx: RawQueryContextMenuContext<any> = {
        editorView: view,
        statement: { text: 'db.users.find()', from: 0, to: 15 },
        hasSelection: false,
        selectionText: '',
        context,
      };

      const items = (mongoPlugin.contextMenu?.getItems!(menuCtx) ??
        []) as any[];
      const wrapItem = items.find(i => i.title === 'Wrap with toArray()');
      expect(wrapItem).toBeUndefined();
    });
  });

  describe('Redis Plugin', () => {
    it('has correct name and properties', () => {
      expect(redisPlugin.name).toBe('redis-plugin');
      expect(typeof redisPlugin.resolveStatement).toBe('function');
      expect(typeof redisPlugin.execute).toBe('function');
      expect(typeof redisPlugin.contextMenu?.getItems).toBe('function');
    });

    it('delegates execution to onExecuteCurrent', async () => {
      const mockContext = createMockContext();
      const execCtx: RawQueryExecutionContext = {
        context: mockContext,
        sourceText: 'GET mykey',
      };

      const result = await redisPlugin.execute(execCtx);
      expect(mockContext.onExecuteCurrent).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('resolves single line under cursor', () => {
      const text = 'SET foo bar\nGET foo\nDEL foo';
      const state = EditorState.create({
        doc: text,
        selection: { anchor: 14, head: 14 }, // cursor on second line "GET foo"
      });
      const view = new EditorView({ state });
      const context = createMockContext();

      const stmt = redisPlugin.resolveStatement!(view, context);
      expect(stmt).toEqual({
        text: 'GET foo',
        from: 12,
        to: 19,
      });
    });

    it('returns null for empty or whitespace line', () => {
      const text = 'SET foo bar\n   \nDEL foo';
      const state = EditorState.create({
        doc: text,
        selection: { anchor: 13, head: 13 }, // cursor on whitespace line
      });
      const view = new EditorView({ state });
      const context = createMockContext();

      const stmt = redisPlugin.resolveStatement!(view, context);
      expect(stmt).toBeNull();
    });

    it('provides context menu with Execute Command at Cursor', () => {
      const state = EditorState.create({ doc: 'GET foo' });
      const view = new EditorView({ state });
      const context = createMockContext();

      const menuCtx: RawQueryContextMenuContext = {
        editorView: view,
        statement: { text: 'GET foo', from: 0, to: 7 },
        hasSelection: false,
        selectionText: '',
        context,
      };

      const items = (redisPlugin.contextMenu?.getItems!(menuCtx) ??
        []) as any[];
      const execItem = items.find(i => i.title === 'Execute Command at Cursor');
      expect(execItem).toBeDefined();
      expect(execItem.shortcut).toBe('⌘⏎');
      expect(execItem.icon).toBe('hugeicons:play');
      expect(execItem.disabled).toBe(false);
      expect(execItem.section).toBe(RawQueryContextMenuSection.EXECUTION);

      execItem.select();
      expect(context.onExecuteCurrent).toHaveBeenCalled();
    });
  });

  describe('SQLite Plugin', () => {
    it('has correct name and properties', () => {
      expect(sqlitePlugin.name).toBe('sqlite-plugin');
      expect(typeof sqlitePlugin.resolveStatement).toBe('function');
      expect(typeof sqlitePlugin.execute).toBe('function');
      expect(typeof sqlitePlugin.contextMenu?.getItems).toBe('function');
    });

    it('delegates execution to onExecuteCurrent', async () => {
      const mockContext = createMockContext();
      const execCtx: RawQueryExecutionContext = {
        context: mockContext,
        sourceText: 'SELECT 1;',
      };

      const result = await sqlitePlugin.execute(execCtx);
      expect(mockContext.onExecuteCurrent).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('resolves statement correctly', () => {
      const state = EditorState.create({
        doc: 'SELECT * FROM users;',
        extensions: [sqlParserConfigField],
      });
      const view = new EditorView({ state });
      const context = createMockContext();

      const stmt = sqlitePlugin.resolveStatement!(view, context);
      expect(stmt).toBeDefined();
    });

    it('provides context menu items with EXECUTION and FORMAT sections', () => {
      const state = EditorState.create({ doc: 'SELECT * FROM users;' });
      const view = new EditorView({ state });
      const context = createMockContext({ isFormatSupported: true });

      const menuCtx: RawQueryContextMenuContext = {
        editorView: view,
        statement: { text: 'SELECT * FROM users;', from: 0, to: 20 },
        hasSelection: false,
        selectionText: '',
        context,
      };

      const items = (sqlitePlugin.contextMenu?.getItems!(menuCtx) ??
        []) as any[];

      const runItem = items.find(i => i.title === 'Run Current Query');
      expect(runItem).toBeDefined();
      expect(runItem.shortcut).toBe('⌘⏎');
      expect(runItem.icon).toBe('hugeicons:play');
      expect(runItem.disabled).toBe(false);

      const formatStmtItem = items.find(i => i.title === 'Format Statement');
      expect(formatStmtItem).toBeDefined();
      expect(formatStmtItem.icon).toBe('hugeicons:text-align-left');
      expect(formatStmtItem.disabled).toBe(false);
    });
  });
});
