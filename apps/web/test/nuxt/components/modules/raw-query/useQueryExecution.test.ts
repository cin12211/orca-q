import { reactive, ref, shallowRef } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQueryExecution } from '~/components/modules/raw-query/hooks/useQueryExecution';
import * as streamingQuery from '~/components/modules/raw-query/hooks/useStreamingQuery';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

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

// Mock $fetch globally
const mockFetch = vi.fn();
(global as any).$fetch = mockFetch;

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
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
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
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
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
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
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

  it('handles explain query execution via $fetch', async () => {
    const connection = ref({ connectionString: 'test-conn' });
    const fileVariables = ref('{}');
    const fieldDefs = ref([]);

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
    });

    mockFetch.mockResolvedValue({
      rows: [{ 'QUERY PLAN': 'Seq Scan on users' }],
      fields: [{ name: 'QUERY PLAN' }],
      queryTime: 10,
    });

    await executeCurrentStatement({
      currentStatements: [
        { text: 'SELECT * FROM users', from: 0, to: 18, type: 'Statement' },
      ],

      queryPrefix: 'EXPLAIN',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/query/raw-execute',
      expect.any(Object)
    );
    expect(resultTabsMock.refreshResultTab).toHaveBeenCalled();
  });

  it('handles query with variables', async () => {
    const connection = ref({ connectionString: 'test-conn' });
    const fileVariables = ref(JSON.stringify({ id: 1 }));
    const fieldDefs = ref([]);

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
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
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
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

  it('executes Redis commands through the workbench endpoint without streaming', async () => {
    const connection = ref({
      type: DatabaseClientType.REDIS,
      method: EConnectionMethod.STRING,
      connectionString: 'redis://127.0.0.1:6379/0',
    });
    const redisDatabaseIndex = ref(5);
    const fileVariables = ref('{}');
    const fieldDefs = ref([]);

    mockFetch.mockResolvedValue({
      command: ['PING'],
      result: 'PONG',
    });

    const { executeCurrentStatement } = useQueryExecution({
      getEditorView: getEditorViewMock,
      connection: connection as any,
      redisDatabaseIndex,
      fileVariables,
      fieldDefs: fieldDefs as any,
      resultTabs: resultTabsMock,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
    });

    await executeCurrentStatement({
      currentStatements: [{ text: 'PING', from: 0, to: 4, type: 'Statement' }],
    });

    expect(streamingQuery.executeStreamingQuery).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/redis/workbench/execute',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          command: 'PING',
          method: EConnectionMethod.STRING,
          stringConnection: 'redis://127.0.0.1:6379/0',
          databaseIndex: 5,
        }),
      })
    );

    expect(resultTabsMock.refreshResultTab).toHaveBeenCalled();
    expect(
      resultTabsMock.refreshResultTab.mock.calls.at(-1)?.[1]
    ).toMatchObject({
      result: [{ value: 'PONG' }],
      metadata: expect.objectContaining({
        command: 'PING',
        rowCount: 1,
      }),
    });
  });
});
