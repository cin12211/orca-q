import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as codeEditorUtils from '~/components/base/code-editor/utils';
import { useQueryExecution } from '~/components/modules/raw-query/hooks/useQueryExecution';
import * as streamingQuery from '~/components/modules/raw-query/hooks/useStreamingQuery';
import {
  StatementRunStatus,
  type ExecutedResultItem,
} from '~/components/modules/raw-query/types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

vi.mock('~/components/modules/raw-query/hooks/useStreamingQuery', () => ({
  executeStreamingQuery: vi.fn(),
}));

vi.mock('~/components/base/code-editor/utils', () => ({
  applySqlErrorDiagnostics: vi.fn(),
  clearSqlErrorDiagnostics: vi.fn(),
  getCurrentStatement: vi.fn(),
  getTreeNodes: vi.fn(),
}));

const mockFetch = vi.fn();
(global as any).$fetch = mockFetch;

type StreamArgs = Parameters<typeof streamingQuery.executeStreamingQuery>[0];
type StreamScript = (args: StreamArgs) => void;

const statement = (text: string, from: number) => ({
  text,
  from,
  to: from + text.length,
  type: 'Statement',
});

/**
 * Makes executeStreamingQuery answer each query with the script registered
 * for it, asynchronously like the real stream.
 */
const scriptStreams = (scripts: Record<string, StreamScript>) => {
  const aborts: Record<string, ReturnType<typeof vi.fn>> = {};

  vi.mocked(streamingQuery.executeStreamingQuery).mockImplementation(args => {
    const abort = vi.fn();
    aborts[args.query] = abort;
    const script = scripts[args.query];
    if (script) {
      queueMicrotask(() => script(args));
    }
    return { abort };
  });

  return aborts;
};

const selectRows: StreamScript = ({ onMeta, onRows, onDone }) => {
  onMeta?.([{ name: 'id' } as any], 'SELECT');
  onRows?.([{ id: 1 }, { id: 2 }], 2);
  onDone?.(2, 12);
};

const updateRows: StreamScript = ({ onMeta, onDone }) => {
  onMeta?.([], 'UPDATE');
  onDone?.(3, 5);
};

const failWith =
  (message: string): StreamScript =>
  ({ onError }) =>
    onError?.(message, { message } as any);

describe('useQueryExecution — multiple statements', () => {
  let resultTabsMock: {
    addResultTab: ReturnType<typeof vi.fn>;
    refreshResultTab: ReturnType<typeof vi.fn>;
    executedResults: ReturnType<typeof ref<Map<string, ExecutedResultItem>>>;
  };

  const lastTab = (): ExecutedResultItem =>
    resultTabsMock.refreshResultTab.mock.calls.at(-1)?.[1];

  const setup = (
    overrides: Partial<Parameters<typeof useQueryExecution>[0]> = {}
  ) =>
    useQueryExecution({
      getEditorView: () => ({ dispatch: vi.fn(), state: {} }) as any,
      connection: ref({ connectionString: 'test-conn' }) as any,
      fileVariables: ref('{}'),
      fieldDefs: ref([]) as any,
      resultTabs: resultTabsMock as any,
      buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    resultTabsMock = {
      addResultTab: vi.fn(),
      refreshResultTab: vi.fn(),
      executedResults: ref(new Map()),
    };
  });

  it('runs every statement in order into a single result tab', async () => {
    scriptStreams({
      'SELECT id FROM a;': selectRows,
      'UPDATE b SET x = 1;': updateRows,
    });
    const { executeCurrentStatement, queryProcessState } = setup();

    await executeCurrentStatement({
      currentStatements: [
        statement('SELECT id FROM a;', 0),
        statement('UPDATE b SET x = 1;', 18),
      ],
    });

    expect(resultTabsMock.addResultTab).toHaveBeenCalledTimes(1);
    const queries = vi
      .mocked(streamingQuery.executeStreamingQuery)
      .mock.calls.map(([args]) => args.query);
    expect(queries).toEqual(['SELECT id FROM a;', 'UPDATE b SET x = 1;']);

    const tab = lastTab();
    expect(tab.statements).toHaveLength(2);
    expect(tab.statements?.[0]).toMatchObject({
      status: StatementRunStatus.SUCCESS,
      command: 'SELECT',
      rowCount: 2,
      queryTime: 12,
      result: [{ id: 1 }, { id: 2 }],
    });
    expect(tab.statements?.[1]).toMatchObject({
      status: StatementRunStatus.SUCCESS,
      command: 'UPDATE',
      rowCount: 3,
      result: [],
    });
    expect(tab.metadata.queryTime).toBe(17);
    expect(tab.metadata.executeErrors).toBeUndefined();
    expect(queryProcessState.isStreaming).toBe(false);
  });

  it('stops at the first error, skips the rest and marks the error in the editor', async () => {
    scriptStreams({
      'SELECT id FROM a;': selectRows,
      'INSERT INTO b VALUES (1);': failWith('duplicate key'),
      'DELETE FROM c;': updateRows,
    });
    const { executeCurrentStatement, queryProcessState } = setup();

    await executeCurrentStatement({
      currentStatements: [
        statement('SELECT id FROM a;', 0),
        statement('INSERT INTO b VALUES (1);', 18),
        statement('DELETE FROM c;', 44),
      ],
    });

    expect(streamingQuery.executeStreamingQuery).toHaveBeenCalledTimes(2);

    const tab = lastTab();
    expect(tab.statements?.map(item => item.status)).toEqual([
      StatementRunStatus.SUCCESS,
      StatementRunStatus.ERROR,
      StatementRunStatus.SKIPPED,
    ]);
    expect(tab.statements?.[1].executeErrors?.message).toBe('duplicate key');
    expect(tab.metadata.executeErrors?.message).toBe('duplicate key');
    expect(queryProcessState.executeErrors?.message).toBe('duplicate key');
    expect(codeEditorUtils.applySqlErrorDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        originalSql: 'INSERT INTO b VALUES (1);',
        statementFrom: 18,
      })
    );
  });

  it('cancels the running statement and the rest on Stop', async () => {
    const aborts = scriptStreams({
      'SELECT id FROM a;': selectRows,
      // 'SELECT pg_sleep(10);' never answers
    });
    const { executeCurrentStatement, cancelStreamingQuery, queryProcessState } =
      setup();

    const running = executeCurrentStatement({
      currentStatements: [
        statement('SELECT id FROM a;', 0),
        statement('SELECT pg_sleep(10);', 18),
        statement('SELECT 3;', 39),
      ],
    });

    await vi.waitFor(() =>
      expect(streamingQuery.executeStreamingQuery).toHaveBeenCalledTimes(2)
    );
    expect(queryProcessState.isStreaming).toBe(true);

    cancelStreamingQuery();
    await running;

    expect(aborts['SELECT pg_sleep(10);']).toHaveBeenCalled();
    expect(streamingQuery.executeStreamingQuery).toHaveBeenCalledTimes(2);
    expect(lastTab().statements?.map(item => item.status)).toEqual([
      StatementRunStatus.SUCCESS,
      StatementRunStatus.CANCELLED,
      StatementRunStatus.CANCELLED,
    ]);
    expect(queryProcessState.isStreaming).toBe(false);
  });

  it('asks for missing variables once for the whole selection', async () => {
    scriptStreams({
      'SELECT * FROM a WHERE id = :id;': selectRows,
      'SELECT * FROM b WHERE id = :id AND kind = :kind;': selectRows,
    });
    const promptMissingVariables = vi.fn().mockResolvedValue({
      values: { id: 7, kind: 'x' },
      insertBack: false,
    });
    const { executeCurrentStatement } = setup({ promptMissingVariables });

    await executeCurrentStatement({
      currentStatements: [
        statement('SELECT * FROM a WHERE id = :id;', 0),
        statement('SELECT * FROM b WHERE id = :id AND kind = :kind;', 32),
      ],
    });

    expect(promptMissingVariables).toHaveBeenCalledTimes(1);
    expect(promptMissingVariables).toHaveBeenCalledWith(['id', 'kind']);
    for (const [args] of vi.mocked(streamingQuery.executeStreamingQuery).mock
      .calls) {
      expect(args.params).toEqual({ id: 7, kind: 'x' });
    }
  });

  it('runs nothing when the connection confirm is declined', async () => {
    const { executeCurrentStatement } = setup({
      beforeExecute: vi.fn().mockResolvedValue(false),
    });

    await executeCurrentStatement({
      currentStatements: [
        statement('SELECT 1;', 0),
        statement('SELECT 2;', 10),
      ],
    });

    expect(resultTabsMock.addResultTab).not.toHaveBeenCalled();
    expect(streamingQuery.executeStreamingQuery).not.toHaveBeenCalled();
  });

  it('ignores EXPLAIN for a multi-statement selection', async () => {
    const { executeCurrentStatement } = setup();

    await executeCurrentStatement({
      currentStatements: [
        statement('SELECT 1;', 0),
        statement('SELECT 2;', 10),
      ],
      queryPrefix: 'EXPLAIN ANALYZE',
    });

    expect(resultTabsMock.addResultTab).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('runs Redis lines one command at a time', async () => {
    mockFetch.mockImplementation(async (_url: string, options: any) => ({
      command: [options.body.command.split(' ')[0]],
      result: options.body.command === 'PING' ? 'PONG' : 'OK',
    }));
    const { executeCurrentStatement } = setup({
      connection: ref({
        type: DatabaseClientType.REDIS,
        method: EConnectionMethod.STRING,
        connectionString: 'redis://127.0.0.1:6379/0',
      }) as any,
    });

    await executeCurrentStatement({
      currentStatements: [statement('PING', 0), statement('SET a 1', 5)],
    });

    expect(streamingQuery.executeStreamingQuery).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.map(([, options]) => options.body.command)
    ).toEqual(['PING', 'SET a 1']);
    expect(lastTab().statements).toMatchObject([
      {
        status: StatementRunStatus.SUCCESS,
        command: 'PING',
        result: [{ value: 'PONG' }],
      },
      { status: StatementRunStatus.SUCCESS, command: 'SET' },
    ]);
  });

  it('opens one statement of a run in its own tab without running it again', async () => {
    scriptStreams({
      'SELECT id FROM a;': selectRows,
      'UPDATE b SET x = 1;': updateRows,
    });
    const { executeCurrentStatement, openStatementInTab } = setup();

    await executeCurrentStatement({
      currentStatements: [
        statement('SELECT id FROM a;', 0),
        statement('UPDATE b SET x = 1;', 18),
      ],
    });

    const tab = lastTab();
    resultTabsMock.executedResults.value = new Map([[tab.id, tab]]);
    vi.mocked(streamingQuery.executeStreamingQuery).mockClear();

    openStatementInTab(tab.id, tab.statements![0].id);

    expect(streamingQuery.executeStreamingQuery).not.toHaveBeenCalled();
    expect(resultTabsMock.addResultTab).toHaveBeenLastCalledWith(
      expect.objectContaining({
        result: [{ id: 1 }, { id: 2 }],
        metadata: expect.objectContaining({
          statementQuery: 'SELECT id FROM a;',
          command: 'SELECT',
          rowCount: 2,
        }),
      })
    );
    expect(
      resultTabsMock.addResultTab.mock.calls.at(-1)?.[0].statements
    ).toBeUndefined();
  });
});
