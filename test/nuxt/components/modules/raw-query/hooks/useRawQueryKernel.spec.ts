/**
 * @vitest-environment happy-dom
 */
import { ref } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it, vi } from 'vitest';
import { useRawQueryKernel } from '~/components/modules/raw-query/hooks/useRawQueryKernel';
import { defineRawQueryPlugin } from '~/components/modules/raw-query/registry/rawQueryPlugin.types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';

describe('useRawQueryKernel', () => {
  const createMockEditorView = (initialDoc = 'SELECT 1;') => {
    const state = EditorState.create({ doc: initialDoc });
    return new EditorView({ state });
  };

  it('initializes kernel state and manages result tabs', () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      name: 'Test Conn',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
    });

    expect(kernel.codeEditorRef).toBeDefined();
    expect(kernel.codeEditorRef.value).toBeNull();
    expect(kernel.getEditorView()).toBeNull();
    expect(kernel.resultTabs).toBeDefined();
    expect(kernel.cursorInfo.value).toEqual({ line: 1, column: 1 });
    expect(kernel.executeLoading.value).toBe(false);
    expect(kernel.isStreaming.value).toBe(false);
    expect(kernel.extensions).toHaveLength(1);
    expect(kernel.dialectCompartment).toBeDefined();
    expect(typeof kernel.reloadLanguageCompartment).toBe('function');
    expect(typeof kernel.resolveStatement).toBe('function');
    expect(typeof kernel.formatCode).toBe('function');
    expect(typeof kernel.onExecuteCurrent).toBe('function');

    // Verify resultTabs integration
    expect(kernel.resultTabs.executedResults.value.size).toBe(0);
    kernel.resultTabs.addResultTab({
      id: 'tab-1',
      title: 'Query 1',
      view: 'TABLE' as any,
    });
    expect(kernel.resultTabs.executedResults.value.size).toBe(1);
    expect(kernel.resultTabs.activeResultTabId.value).toBe('tab-1');
  });

  it('resolves activePlugin from options.plugin or falls back to database profile', () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      name: 'PG',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const customPlugin = defineRawQueryPlugin({
      name: 'custom-plugin',
      execute: vi.fn(),
    });

    // Case 1: Custom plugin provided in options
    const kernelWithCustom = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(customPlugin),
    });
    expect(kernelWithCustom.activePlugin.value?.name).toBe('custom-plugin');

    // Case 2: Fallback to profile plugin based on connection type
    const kernelDefault = useRawQueryKernel({
      fileVariables,
      connection,
    });
    expect(kernelDefault.activePlugin.value?.name).toBe('postgres-plugin');

    // Case 3: Reactive change in connection type
    connection.value = {
      id: 'conn-2',
      name: 'Mongo',
      type: DatabaseClientType.MONGODB,
    } as any;
    expect(kernelDefault.activePlugin.value?.name).toBe('mongo-plugin');
  });

  it('resolves dialectState from reactive Ref or plain object', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      type: DatabaseClientType.POSTGRES,
    } as any);

    let capturedStateFromRef: any;
    let capturedStateFromObj: any;

    const mockPluginRef = defineRawQueryPlugin({
      name: 'mock-ref-plugin',
      execute: vi.fn().mockImplementation(ctx => {
        capturedStateFromRef = ctx.dialectState;
        return Promise.resolve({ success: true });
      }),
    });

    const mockPluginObj = defineRawQueryPlugin({
      name: 'mock-obj-plugin',
      execute: vi.fn().mockImplementation(ctx => {
        capturedStateFromObj = ctx.dialectState;
        return Promise.resolve({ success: true });
      }),
    });

    // Test with Ref dialectState
    const stateRef = ref({ customKey: 'from-ref' });
    const kernelRef = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPluginRef),
      dialectState: stateRef,
    });
    await kernelRef.onExecuteCurrent();
    expect(capturedStateFromRef).toEqual({ customKey: 'from-ref' });

    // Test with plain object dialectState
    const stateObj = { customKey: 'from-obj' };
    const kernelObj = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPluginObj),
      dialectState: stateObj,
    });
    await kernelObj.onExecuteCurrent();
    expect(capturedStateFromObj).toEqual({ customKey: 'from-obj' });
  });

  it('triggers plugin.preloadSchema and reconfigures compartment when connection changes', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection | undefined>(undefined);
    const mockPreload = vi.fn().mockResolvedValue(undefined);

    const mockPlugin = defineRawQueryPlugin({
      name: 'test-preload',
      preloadSchema: mockPreload,
      execute: vi.fn(),
    });

    const mockView = createMockEditorView();
    const dispatchSpy = vi.spyOn(mockView, 'dispatch');

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
      dialectState: { schemaLoaded: false },
    });

    kernel.codeEditorRef.value = {
      editorView: mockView,
    } as any;

    connection.value = {
      id: 'conn-preload-1',
      type: DatabaseClientType.MONGODB,
    } as any;

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(dispatchSpy).toHaveBeenCalled();
    expect(mockPreload).toHaveBeenCalledTimes(1);
    expect(mockPreload).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ id: 'conn-preload-1' }),
        dialectState: { schemaLoaded: false },
      })
    );
  });

  it('resolveStatement delegates to activePlugin and handles null editorView', () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const mockResolveStatement = vi.fn().mockReturnValue({
      text: 'SELECT 42;',
      from: 0,
      to: 10,
    });

    const mockPlugin = defineRawQueryPlugin({
      name: 'test-stmt',
      resolveStatement: mockResolveStatement,
      execute: vi.fn(),
    });

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
    });

    // When no editor view is available
    expect(kernel.resolveStatement()).toBeNull();
    expect(mockResolveStatement).not.toHaveBeenCalled();

    // When editor view is available
    const mockView = createMockEditorView('SELECT 42;');
    kernel.codeEditorRef.value = {
      editorView: mockView,
    } as any;

    const stmt = kernel.resolveStatement();
    expect(stmt).toEqual({ text: 'SELECT 42;', from: 0, to: 10 });
    expect(mockResolveStatement).toHaveBeenCalledTimes(1);
    expect(mockResolveStatement.mock.calls[0][0].state.doc.toString()).toBe(
      mockView.state.doc.toString()
    );
    expect(mockResolveStatement.mock.calls[0][1]).toEqual(
      expect.objectContaining({ connection: connection.value })
    );
  });

  it('formatCode formats and updates EditorView document when formatted text differs', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const mockFormatCode = vi
      .fn()
      .mockImplementation(code => Promise.resolve(code.toLowerCase()));

    const mockPlugin = defineRawQueryPlugin({
      name: 'test-format',
      formatCode: mockFormatCode,
      execute: vi.fn(),
    });

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
    });

    // 1. Without editor view
    await kernel.formatCode();
    expect(mockFormatCode).not.toHaveBeenCalled();

    // 2. With editor view - formatted differs
    const mockView = createMockEditorView('SELECT * FROM USERS;');
    kernel.codeEditorRef.value = {
      editorView: mockView,
    } as any;

    await kernel.formatCode();
    expect(mockFormatCode).toHaveBeenCalledWith(
      'SELECT * FROM USERS;',
      expect.any(Object)
    );
    expect(mockView.state.doc.toString()).toBe('select * from users;');

    // 3. Formatted equals current - no dispatch
    const dispatchSpy = vi.spyOn(mockView, 'dispatch');
    await kernel.formatCode();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('orchestrates onExecuteCurrent through complete lifecycle (options.beforeExecute -> plugin.beforeExecute -> execute -> afterExecute)', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const lifecycleOrder: string[] = [];

    const optionsBeforeExecute = vi.fn().mockImplementation(async () => {
      lifecycleOrder.push('options.beforeExecute');
      return true;
    });

    const pluginBeforeExecute = vi.fn().mockImplementation(async () => {
      lifecycleOrder.push('plugin.beforeExecute');
      return true;
    });

    const pluginExecute = vi.fn().mockImplementation(async () => {
      lifecycleOrder.push('plugin.execute');
      return { success: true, resultId: 'res-123' };
    });

    const pluginAfterExecute = vi.fn().mockImplementation(async () => {
      lifecycleOrder.push('plugin.afterExecute');
    });

    const mockPlugin = defineRawQueryPlugin({
      name: 'lifecycle-plugin',
      beforeExecute: pluginBeforeExecute,
      execute: pluginExecute,
      afterExecute: pluginAfterExecute,
    });

    const documentText = ref('SELECT 999;');

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
      beforeExecute: optionsBeforeExecute,
      documentText,
    });

    await kernel.onExecuteCurrent();

    expect(lifecycleOrder).toEqual([
      'options.beforeExecute',
      'plugin.beforeExecute',
      'plugin.execute',
      'plugin.afterExecute',
    ]);
    expect(kernel.executeLoading.value).toBe(false);

    // Verify execCtx passed to execute
    expect(pluginExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: connection.value,
        sourceText: 'SELECT 999;',
      })
    );
    expect(pluginAfterExecute).toHaveBeenCalledWith(
      { success: true, resultId: 'res-123' },
      expect.objectContaining({ sourceText: 'SELECT 999;' })
    );
  });

  it('aborts onExecuteCurrent early if options.beforeExecute returns false', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const pluginExecute = vi.fn();
    const mockPlugin = defineRawQueryPlugin({
      name: 'abort-test',
      execute: pluginExecute,
    });

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
      beforeExecute: vi.fn().mockResolvedValue(false),
    });

    await kernel.onExecuteCurrent();

    expect(pluginExecute).not.toHaveBeenCalled();
    expect(kernel.executeLoading.value).toBe(false);
  });

  it('aborts onExecuteCurrent early if plugin.beforeExecute returns false', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const pluginExecute = vi.fn();
    const mockPlugin = defineRawQueryPlugin({
      name: 'plugin-abort-test',
      beforeExecute: vi.fn().mockResolvedValue(false),
      execute: pluginExecute,
    });

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
    });

    await kernel.onExecuteCurrent();

    expect(pluginExecute).not.toHaveBeenCalled();
    expect(kernel.executeLoading.value).toBe(false);
  });

  it('resets executeLoading to false even when plugin.execute throws an error', async () => {
    const fileVariables = ref('');
    const connection = ref<Connection>({
      id: 'conn-1',
      type: DatabaseClientType.POSTGRES,
    } as any);

    const mockPlugin = defineRawQueryPlugin({
      name: 'error-plugin',
      execute: vi.fn().mockRejectedValue(new Error('Query failed')),
    });

    const kernel = useRawQueryKernel({
      fileVariables,
      connection,
      plugin: ref(mockPlugin),
    });

    await expect(kernel.onExecuteCurrent()).rejects.toThrow('Query failed');
    expect(kernel.executeLoading.value).toBe(false);
  });
});
