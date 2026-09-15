/**
 * @vitest-environment happy-dom
 */
import { createPinia, setActivePinia } from 'pinia';
import * as vue from 'vue';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRawQueryEditor } from '~/components/modules/raw-query/hooks/useRawQueryEditor';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';

Object.assign(globalThis, {
  ref: vue.ref,
  computed: vue.computed,
  reactive: vue.reactive,
  shallowRef: vue.shallowRef,
  watch: vue.watch,
  watchEffect: vue.watchEffect,
  toValue: vue.toValue,
  unref: vue.unref,
});

vi.mock('~/components/modules/raw-query/utils/buildRawQueryColumnDefs', () => ({
  buildRawQueryColumnDefs: vi.fn(),
}));
vi.mock('~/components/modules/raw-query/utils/buildRelationColumnDefs', () => ({
  buildRelationColumnDefs: vi.fn(),
}));
vi.mock('~/core/composables/useWorkspaceConnectionRoute', () => ({
  useWorkspaceConnectionRoute: () => ({
    workspaceId: ref('ws-1'),
    connectionId: ref('conn-1'),
  }),
}));

describe('useRawQueryEditor', () => {
  const mockFetch = vi.fn().mockResolvedValue({ databases: [] });
  vi.stubGlobal('$fetch', mockFetch);

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  const createTestConnection = (
    type: DatabaseClientType = DatabaseClientType.POSTGRES
  ) =>
    ref<Connection>({
      id: 'conn-1',
      name: 'Test Database',
      type,
    } as any);

  it('1. initializes facade and returns all expected properties including kernel', () => {
    const fileVariables = ref('');
    const connection = createTestConnection(DatabaseClientType.POSTGRES);

    const editor = useRawQueryEditor({
      fileVariables,
      connection,
    });

    // 1. Verify kernel is defined and wired
    expect(editor.kernel).toBeDefined();
    expect(editor.kernel.resultTabs).toBeDefined();
    expect(editor.kernel.codeEditorRef).toBeDefined();
    expect(editor.kernel.cursorInfo).toBeDefined();

    // 2. Verify shared wiring with kernel
    expect(editor.codeEditorRef).toBe(editor.kernel.codeEditorRef);
    expect(editor.cursorInfo).toBe(editor.kernel.cursorInfo);
    expect(editor.executedResults).toBe(
      editor.kernel.resultTabs.executedResults
    );
    expect(editor.activeResultTabId).toBe(
      editor.kernel.resultTabs.activeResultTabId
    );

    // 3. Verify all expected properties exist
    expect(editor.currentRawQueryResult).toBeDefined();
    expect(editor.rawResponse).toBeDefined();
    expect(editor.queryProcessState).toBeDefined();
    expect(typeof editor.onExecuteCurrent).toBe('function');
    expect(Array.isArray(editor.extensions)).toBe(true);
    expect(editor.extensions.length).toBeGreaterThan(0);
    expect(editor.sqlCompartment).toBeDefined();
    expect(typeof editor.onHandleFormatCode).toBe('function');
    expect(typeof editor.onHandleFormatCurrentStatement).toBe('function');
    expect(typeof editor.onExplainAnalyzeCurrent).toBe('function');
    expect(editor.explainAnalyzeOptionItems).toBeDefined();
    expect(editor.serializeMode).toBeDefined();
    expect(typeof editor.toggleExplainOption).toBe('function');
    expect(typeof editor.setSerializeMode).toBe('function');
    expect(typeof editor.reloadSqlCompartment).toBe('function');
    expect(typeof editor.reloadLanguageCompartment).toBe('function');
    expect(typeof editor.cancelStreamingQuery).toBe('function');
    expect(editor.fieldDefs).toBeDefined();

    // 4. Verify result tab methods are functions
    expect(typeof editor.setActiveResultTab).toBe('function');
    expect(typeof editor.closeResultTab).toBe('function');
    expect(typeof editor.closeOtherResultTabs).toBe('function');
    expect(typeof editor.closeResultTabsToRight).toBe('function');
    expect(typeof editor.updateResultTabView).toBe('function');
  });

  it('2. wires result tab methods to the kernel resultTabs instance', () => {
    const fileVariables = ref('');
    const connection = createTestConnection(DatabaseClientType.POSTGRES);

    const editor = useRawQueryEditor({
      fileVariables,
      connection,
    });

    expect(editor.executedResults.value.size).toBe(0);

    // Add tab via kernel.resultTabs
    editor.kernel.resultTabs.addResultTab({
      id: 'tab-1',
      title: 'Query 1',
      view: 'TABLE' as any,
    });

    expect(editor.executedResults.value.size).toBe(1);
    expect(editor.activeResultTabId.value).toBe('tab-1');

    // Add a second tab
    editor.kernel.resultTabs.addResultTab({
      id: 'tab-2',
      title: 'Query 2',
      view: 'TABLE' as any,
    });

    expect(editor.executedResults.value.size).toBe(2);

    // Switch active tab via facade
    editor.setActiveResultTab('tab-1');
    expect(editor.activeResultTabId.value).toBe('tab-1');
    expect(editor.kernel.resultTabs.activeResultTabId.value).toBe('tab-1');

    // Close a tab via facade
    editor.closeResultTab('tab-2');
    expect(editor.executedResults.value.size).toBe(1);
    expect(editor.executedResults.value.has('tab-2')).toBe(false);
  });

  it('3. synchronizes cursorInfo reactively with kernel.cursorInfo', () => {
    const fileVariables = ref('');
    const connection = createTestConnection(DatabaseClientType.POSTGRES);

    const editor = useRawQueryEditor({
      fileVariables,
      connection,
    });

    expect(editor.cursorInfo.value).toEqual({ line: 1, column: 1 });
    expect(editor.kernel.cursorInfo.value).toEqual({ line: 1, column: 1 });

    editor.cursorInfo.value = { line: 10, column: 25 };
    expect(editor.kernel.cursorInfo.value).toEqual({ line: 10, column: 25 });
  });

  it('4. exposes onExecuteCurrent and cancellation for both SQL and MongoDB connections', async () => {
    const fileVariables = ref('');
    const pgConnection = createTestConnection(DatabaseClientType.POSTGRES);

    const pgEditor = useRawQueryEditor({
      fileVariables,
      connection: pgConnection,
    });

    // Execute current on SQL without editor view should gracefully no-op
    await expect(pgEditor.onExecuteCurrent()).resolves.toBeUndefined();
    expect(() => pgEditor.cancelStreamingQuery()).not.toThrow();

    // MongoDB connection
    const mongoConnection = createTestConnection(DatabaseClientType.MONGODB);
    const mongoEditor = useRawQueryEditor({
      fileVariables,
      connection: mongoConnection,
    });

    await expect(mongoEditor.onExecuteCurrent()).resolves.toBeUndefined();
    expect(() => mongoEditor.cancelStreamingQuery()).not.toThrow();
  });
});
