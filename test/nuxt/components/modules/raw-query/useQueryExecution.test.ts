import { reactive, ref, shallowRef } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applySqlErrorDiagnostics } from '~/components/base/code-editor/utils';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { useQueryExecution } from '~/components/modules/raw-query/hooks/useQueryExecution';
import * as streamingQuery from '~/components/modules/raw-query/hooks/useStreamingQuery';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';

// Mock dependencies
vi.mock('~/components/modules/raw-query/hooks/useStreamingQuery', () => ({
  executeStreamingQuery: vi.fn(),
}));

vi.mock('~/components/base/code-editor/utils', () => ({
  applySqlErrorDiagnostics: vi.fn(),
  clearSqlErrorDiagnostics: vi.fn(),
  getCurrentStatement: vi.fn(),
  getTreeNodes: vi.fn(),
}));

const sqlCapabilities = ref<RawQueryCapabilities | undefined>({
  language: 'sql',
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
});

describe('useQueryExecution', () => {
  let resultTabsMock: any;
  let getEditorViewMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resultTabsMock = {
      addResultTab: vi.fn(),
      refreshResultTab: vi.fn(),
    };
    getEditorViewMock = vi.fn(() => ({
      dispatch: vi.fn(),
      state: {},
    }));
  });

  it('handles normal query execution via streaming', async () => {
    const connection = ref({ connectionString: 'test-conn' });
    const fileVariables = ref('{}');
    const fieldDefs = ref([]);

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      capabilities: sqlCapabilities,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      executor: ref(sqlStreamingExecutor),
    });

    const abortMock = vi.fn();
    (streamingQuery.executeStreamingQuery as any).mockReturnValue({
      abort: abortMock,
    });

    await executeCurrentStatement({
      currentStatements: [
        { text: 'SELECT * FROM users', from: 0, to: 18, type: 'Statement' },
      ],
    });

    expect(streamingQuery.executeStreamingQuery).toHaveBeenCalled();
    const callArgs = (streamingQuery.executeStreamingQuery as any).mock
      .calls[0][0];

    // Simulate streaming events
    callArgs.onMeta([{ name: 'id' }], 'SELECT');
    callArgs.onRows([{ id: 1 }], 1);
    callArgs.onDone(1, 100);

    expect(resultTabsMock.addResultTab).toHaveBeenCalled();
    expect(resultTabsMock.refreshResultTab).toHaveBeenCalled();
  });

  it('handles error query execution', async () => {
    const connection = ref({ connectionString: 'test-conn' });
    const fileVariables = ref('{}');
    const fieldDefs = ref([]);

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      capabilities: sqlCapabilities,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      executor: ref(sqlStreamingExecutor),
    });

    (streamingQuery.executeStreamingQuery as any).mockReturnValue({
      abort: vi.fn(),
    });

    await executeCurrentStatement({
      currentStatements: [
        {
          text: 'SELECT * FROM invalid_table',
          from: 0,
          to: 27,
          type: 'Statement',
        },
      ],
    });

    const callArgs = (streamingQuery.executeStreamingQuery as any).mock
      .calls[0][0];
    callArgs.onError('Table not found', {
      message: 'relation "invalid_table" does not exist',
    });

    expect(resultTabsMock.refreshResultTab).toHaveBeenCalled();
  });

  it('handles empty result query', async () => {
    const connection = ref({ connectionString: 'test-conn' });
    const fileVariables = ref('{}');
    const fieldDefs = ref([]);

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      capabilities: sqlCapabilities,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      executor: ref(sqlStreamingExecutor),
    });

    (streamingQuery.executeStreamingQuery as any).mockReturnValue({
      abort: vi.fn(),
    });

    await executeCurrentStatement({
      currentStatements: [
        {
          text: 'DELETE FROM users WHERE id = 999',
          from: 0,
          to: 32,
          type: 'Statement',
        },
      ],
    });

    const callArgs = (streamingQuery.executeStreamingQuery as any).mock
      .calls[0][0];
    callArgs.onMeta([], 'DELETE');
    callArgs.onDone(0, 50);

    expect(resultTabsMock.refreshResultTab).toHaveBeenCalled();
  });

  it('handles query with variables', async () => {
    const connection = ref({ connectionString: 'test-conn' });
    const fileVariables = ref(JSON.stringify({ id: 1 }));
    const fieldDefs = ref([]);

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      capabilities: sqlCapabilities,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      executor: ref(sqlStreamingExecutor),
    });

    (streamingQuery.executeStreamingQuery as any).mockReturnValue({
      abort: vi.fn(),
    });

    await executeCurrentStatement({
      currentStatements: [
        {
          text: 'SELECT * FROM users WHERE id = :id',
          from: 0,
          to: 33,
          type: 'Statement',
        },
      ],
    });

    const callArgs = (streamingQuery.executeStreamingQuery as any).mock
      .calls[0][0];
    expect(callArgs.params).toEqual({ id: 1 });
  });

  it('handles query with inline variables (comments)', async () => {
    const connection = ref({ connectionString: 'test-conn' });
    const fileVariables = ref('{}');
    const fieldDefs = ref([]);

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      capabilities: sqlCapabilities,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      executor: ref(sqlStreamingExecutor),
    });

    (streamingQuery.executeStreamingQuery as any).mockReturnValue({
      abort: vi.fn(),
    });

    await executeCurrentStatement({
      currentStatements: [
        {
          text: 'SELECT * FROM users WHERE id = :id',
          from: 15,
          to: 48,
          type: 'Statement',
        },
      ],
    });

    // Note: useQueryExecution.ts has logic to look for LineComment before the statement
    // and use convertParameters helper.
    const callArgs = (streamingQuery.executeStreamingQuery as any).mock
      .calls[0][0];
    // In actual implementation, it might depend on convertParameters helper mock or real one.
    expect(streamingQuery.executeStreamingQuery).toHaveBeenCalled();
  });

  it('uses the executor passed to executeCurrentStatement over the default', async () => {
    const overrideExecute = vi.fn(() => ({ abort: vi.fn() }));
    const connection = ref({ connectionString: 'test-conn' });

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      capabilities: sqlCapabilities,
      fileVariables: ref('{}'),
      fieldDefs: ref([]) as any,
      resultTabs: resultTabsMock,
      executor: ref(sqlStreamingExecutor),
    });

    await executeCurrentStatement({
      currentStatements: [
        { text: 'SELECT 1', from: 0, to: 8, type: 'Statement' },
      ],
      queryPrefix: 'EXPLAIN (ANALYZE)',
      executor: { execute: overrideExecute },
      resultView: ViewMode.EXPLAIN,
    });

    expect(overrideExecute).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'EXPLAIN (ANALYZE) SELECT 1' }),
      expect.anything()
    );
    expect(streamingQuery.executeStreamingQuery).not.toHaveBeenCalled();
  });

  describe('error diagnostics per language', () => {
    const runWithError = async (caps: RawQueryCapabilities) => {
      const executedItems: any[] = [];
      resultTabsMock.addResultTab = vi.fn((item: any) =>
        executedItems.push(item)
      );
      const { executeCurrentStatement, queryProcessState } = useQueryExecution({
        getEditorView: getEditorViewMock,
        connection: ref({ connectionString: 'test-conn' }) as any,
        capabilities: ref(caps),
        fileVariables: ref('{}'),
        fieldDefs: ref([]) as any,
        resultTabs: resultTabsMock,
        executor: ref({
          execute: (_req, handlers) => {
            handlers.onError({
              message: 'boom',
              detail: { message: 'boom' } as any,
            });
            return { abort: vi.fn() };
          },
        }),
      });
      await executeCurrentStatement({
        currentStatements: [{ text: 'X', from: 0, to: 1, type: 'Statement' }],
      });
      return { item: executedItems[0], queryProcessState };
    };

    it('skips SQL diagnostics for Redis but still shows the error view', async () => {
      const { item, queryProcessState } = await runWithError({
        language: 'redis',
        supportsVariables: false,
        supportsFormat: false,
        parameterStyle: 'colon',
      });
      expect(applySqlErrorDiagnostics).not.toHaveBeenCalled();
      expect(item.view).toBe(ViewMode.ERROR);
      expect(queryProcessState.executeErrors).toEqual({
        message: 'boom',
        data: { message: 'boom' },
      });
    });

    it('applies SQL diagnostics for SQL capabilities', async () => {
      await runWithError(sqlCapabilities.value);
      expect(applySqlErrorDiagnostics).toHaveBeenCalledTimes(1);
    });
  });

  describe('in-flight state and abort ownership', () => {
    const build = (executor: any) =>
      useQueryExecution({
        getEditorView: getEditorViewMock,
        connection: ref({ connectionString: 'test-conn' }) as any,
        capabilities: sqlCapabilities,
        fileVariables: ref('{}'),
        fieldDefs: ref([]) as any,
        resultTabs: resultTabsMock,
        executor: ref(executor),
      });
    const stmt = [{ text: 'X', from: 0, to: 1, type: 'Statement' }] as any;

    it('marks isStreaming only for streaming executors', async () => {
      const streaming = build({
        streaming: true,
        execute: () => ({ abort: vi.fn() }),
      });
      await streaming.executeCurrentStatement({ currentStatements: stmt });
      expect(streaming.queryProcessState.isStreaming).toBe(true);
      expect(streaming.queryProcessState.executeLoading).toBe(false);

      const plain = build({ execute: () => ({ abort: vi.fn() }) });
      await plain.executeCurrentStatement({ currentStatements: stmt });
      expect(plain.queryProcessState.isStreaming).toBe(false);
      expect(plain.queryProcessState.executeLoading).toBe(true);
    });

    it('a late completion of an older executor keeps the newer abort handle', async () => {
      let lateHandlers: any;
      const newerAbort = vi.fn();
      const hook = build({
        execute: (_r: any, h: any) => {
          lateHandlers = h;
          return { abort: vi.fn() };
        },
      });
      await hook.executeCurrentStatement({ currentStatements: stmt });
      await hook.executeCurrentStatement({
        currentStatements: stmt,
        executor: { execute: () => ({ abort: newerAbort }) },
      });

      lateHandlers.onComplete({ rowCount: 0, queryTime: 1 });
      hook.cancelStreamingQuery();
      expect(newerAbort).toHaveBeenCalled();
    });
  });
});
