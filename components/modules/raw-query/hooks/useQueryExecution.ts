import type { EditorView } from '@codemirror/view';
import type { FieldDef } from 'pg';
import type { SyntaxTreeNodeData } from '~/components/base/code-editor/extensions';
import {
  applySqlErrorDiagnostics,
  clearSqlErrorDiagnostics,
  getCurrentStatement,
} from '~/components/base/code-editor/utils';
import type { RowData } from '~/components/base/data-grid/utils';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { uuidv4 } from '~/core/helpers';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { DatabaseDriverError } from '~/core/types';
import {
  StatementRunStatus,
  ViewMode,
  type ExecutedResultItem,
  type StatementResultItem,
  type StatementRunOutcome,
} from '../types';
import {
  createPendingStatementResults,
  extractParamsFromSql,
  runStatementsSequentially,
  summarizeStatementResults,
} from '../utils';
import type { ResultTabsReturn } from './useResultTabs';
import { executeStreamingQuery } from './useStreamingQuery';

interface UseQueryExecutionParams {
  getEditorView: () => EditorView | null;
  connection: Ref<Connection | undefined>;
  redisDatabaseIndex?: Ref<number>;
  fileVariables: Ref<string>;
  fieldDefs: Ref<FieldDef[]>;
  resultTabs: ResultTabsReturn;
  buildExplainAnalyzePrefix: () => string;
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
}

type RedisCommandResponse = {
  command?: string[];
  result: unknown;
};

type StatementRequestOutcome =
  | {
      status: StatementRunStatus.SUCCESS;
      rowCount: number;
      queryTime: number;
    }
  | { status: StatementRunStatus.CANCELLED }
  | {
      status: StatementRunStatus.ERROR;
      message: string;
      errorDetail?: Partial<DatabaseDriverError>;
    };

/** Token of one multi-statement run; `cancelled` is flipped by Stop. */
interface MultiStatementRun {
  cancelled: boolean;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const toFieldDefs = (fieldNames: string[]) =>
  fieldNames.map(name => ({ name }) as FieldDef);

const normalizeRedisResult = (
  value: unknown
): {
  rows: RowData[];
  fields: FieldDef[];
} => {
  if (Array.isArray(value)) {
    if (value.every(item => isPlainObject(item))) {
      const rows = value as RowData[];
      const fieldNames = Array.from(
        new Set(
          rows.flatMap(row => Object.keys(row as Record<string, unknown>))
        )
      );

      return {
        rows,
        fields: toFieldDefs(fieldNames),
      };
    }

    return {
      rows: value.map((item, index) => ({
        index,
        value: item,
      })),
      fields: toFieldDefs(['index', 'value']),
    };
  }

  if (isPlainObject(value)) {
    const rows = [value as RowData];
    return {
      rows,
      fields: toFieldDefs(Object.keys(value)),
    };
  }

  return {
    rows: [{ value }],
    fields: toFieldDefs(['value']),
  };
};

/**
 * Handles the full SQL query execution lifecycle:
 * prepare → execute (fetch / streaming) → update result tabs → abort.
 */
export function useQueryExecution({
  getEditorView,
  connection,
  redisDatabaseIndex,
  fileVariables,
  fieldDefs,
  resultTabs,
  buildExplainAnalyzePrefix,
  beforeExecute,
  promptMissingVariables,
  onUpdateVariables,
}: UseQueryExecutionParams) {
  const currentRawQueryResult = shallowRef<RowData[]>([]);
  const rawResponse = shallowRef<
    | {
        rows: RowData[];
        fields: FieldDef[];
        queryTime: number;
      }
    | {}
  >({});

  const seqIndex = shallowRef(0);

  const queryProcessState = reactive<{
    isHaveOneExecute: boolean;
    executeLoading: boolean;
    isStreaming: boolean;
    streamingRowCount: number;
    queryTime: number;
    executeErrors: ExecutedResultItem['metadata']['executeErrors'];
    currentStatementQuery: string;
  }>({
    isHaveOneExecute: false,
    executeLoading: false,
    isStreaming: false,
    streamingRowCount: 0,
    queryTime: 0,
    executeErrors: undefined,
    currentStatementQuery: '',
  });

  // Abort controller for cancelling streaming queries
  let activeStreamAbort: (() => void) | null = null;
  // Multi-statement run in flight, and the cancel of its current request
  let activeMultiRun: MultiStatementRun | null = null;
  let activeRequestCancel: (() => void) | null = null;

  const isRedis = () => connection.value?.type === DatabaseClientType.REDIS;

  const buildRedisRequestBody = (command: string) => ({
    method: connection.value?.method,
    stringConnection: connection.value?.connectionString,
    host: connection.value?.host,
    port: connection.value?.port,
    username: connection.value?.username,
    password: connection.value?.password,
    database: connection.value?.database,
    databaseIndex: redisDatabaseIndex?.value,
    ssl: connection.value?.ssl,
    ssh: connection.value?.ssh,
    command,
  });

  const getRedisCommandName = (
    response: RedisCommandResponse,
    command: string
  ) =>
    response.command?.[0] ||
    command.trim().split(/\s+/)[0]?.toUpperCase() ||
    'REDIS';

  /**
   * Stops whatever is running: the single streaming query and/or the
   * multi-statement run (its current request and the statements after it).
   */
  const stopInFlightRuns = () => {
    if (activeStreamAbort) {
      activeStreamAbort();
      activeStreamAbort = null;
    }

    if (activeMultiRun) {
      activeMultiRun.cancelled = true;
      activeMultiRun = null;
    }

    activeRequestCancel?.();
    activeRequestCancel = null;
  };

  const parseFileParameters = (): Record<string, unknown> => {
    try {
      return JSON.parse(fileVariables.value || '{}');
    } catch (e) {
      console.log('fileParameters error::', e);
      return {};
    }
  };

  /**
   * Reads the file variables and asks for the ones `queryText` uses but the
   * file does not define. Resolves `null` when the user cancels the prompt.
   */
  const resolveFileParameters = async (
    queryText: string
  ): Promise<Record<string, unknown> | null> => {
    let fileParameters = parseFileParameters();

    const isSqliteConnection = [
      DatabaseClientType.SQLITE3,
      DatabaseClientType.BETTER_SQLITE3,
    ].includes(connection.value?.type as DatabaseClientType);
    const isVariableSupported = !isRedis() && !isSqliteConnection;

    if (!isVariableSupported || !promptMissingVariables) {
      return fileParameters;
    }

    const extracted = extractParamsFromSql(queryText, connection.value?.type);
    const missing = [
      ...new Set(extracted.filter(param => !(param in fileParameters))),
    ];

    if (missing.length === 0) {
      return fileParameters;
    }

    const result = await promptMissingVariables(missing);
    if (!result) {
      return null;
    }

    fileParameters = {
      ...fileParameters,
      ...result.values,
    };

    if (result.insertBack && onUpdateVariables) {
      try {
        const currentVars = JSON.parse(fileVariables.value || '{}');
        const newVars = {
          ...currentVars,
          ...result.values,
        };
        onUpdateVariables(JSON.stringify(newVars, null, 2));
      } catch (e) {
        console.error('Failed to update variables:', e);
      }
    }

    return fileParameters;
  };

  /**
   * Runs one statement of a multi-statement run (streaming for SQL, a single
   * request for Redis) and resolves once it is done, failed or cancelled.
   */
  const runStatementRequest = ({
    query,
    params,
    onMeta,
    onRows,
  }: {
    query: string;
    params: Record<string, unknown>;
    onMeta: (fields: FieldDef[], command: string) => void;
    onRows: (rows: RowData[], totalSoFar: number) => void;
  }) =>
    new Promise<StatementRequestOutcome>(resolve => {
      let settled = false;
      const settle = (outcome: StatementRequestOutcome) => {
        if (settled) return;
        settled = true;
        activeRequestCancel = null;
        resolve(outcome);
      };

      if (isRedis()) {
        const controller = new AbortController();
        const startedAt = Date.now();

        activeRequestCancel = () => {
          controller.abort();
          settle({ status: StatementRunStatus.CANCELLED });
        };

        $fetch<RedisCommandResponse>('/api/redis/workbench/execute', {
          method: 'POST',
          body: buildRedisRequestBody(query),
          signal: controller.signal,
        })
          .then(response => {
            const normalized = normalizeRedisResult(response.result);
            onMeta(normalized.fields, getRedisCommandName(response, query));
            onRows(normalized.rows, normalized.rows.length);
            settle({
              status: StatementRunStatus.SUCCESS,
              rowCount: normalized.rows.length,
              queryTime: Date.now() - startedAt,
            });
          })
          .catch((error: any) => {
            const message =
              error?.data?.message ||
              error?.message ||
              'Failed to execute Redis command.';
            settle({
              status: StatementRunStatus.ERROR,
              message,
              errorDetail: error?.data || { message },
            });
          });

        return;
      }

      const { abort } = executeStreamingQuery({
        query,
        ...getConnectionParams(connection.value),
        params,
        onMeta,
        onRows,
        onDone: (rowCount, queryTime) =>
          settle({ status: StatementRunStatus.SUCCESS, rowCount, queryTime }),
        onError: (message, errorDetail) =>
          settle({
            status: StatementRunStatus.ERROR,
            message,
            errorDetail: errorDetail || { message },
          }),
        onEnd: () =>
          settle({
            status: StatementRunStatus.ERROR,
            message: 'The query stream ended without a result.',
          }),
      });

      activeRequestCancel = () => {
        abort();
        settle({ status: StatementRunStatus.CANCELLED });
      };
    });

  /**
   * Runs the selected statements one by one into a single result tab.
   * Stops at the first error (the rest are skipped); Stop cancels the
   * current statement and the rest.
   */
  const executeMultipleStatements = async (
    statements: SyntaxTreeNodeData[],
    fileParameters: Record<string, unknown>
  ) => {
    stopInFlightRuns();

    const run: MultiStatementRun = { cancelled: false };
    activeMultiRun = run;

    seqIndex.value++;

    const executedResultItem: ExecutedResultItem = {
      id: uuidv4(),
      metadata: {
        queryTime: 0,
        statementQuery: statements.map(statement => statement.text).join('\n'),
        executedAt: new Date(),
        executeErrors: undefined,
        fieldDefs: undefined,
        connection: connection.value,
      },
      result: [],
      view: ViewMode.RESULT,
      seqIndex: seqIndex.value,
      statements: createPendingStatementResults(
        statements.map(statement => ({
          text: statement.text,
          from: Number(statement.from),
        })),
        uuidv4
      ),
    };

    resultTabs.addResultTab(executedResultItem);
    clearSqlErrorDiagnostics(getEditorView() as EditorView);

    fieldDefs.value = [];
    currentRawQueryResult.value = [];
    rawResponse.value = {};
    queryProcessState.executeLoading = false;
    queryProcessState.isStreaming = true;
    queryProcessState.streamingRowCount = 0;
    queryProcessState.executeErrors = undefined;

    const updateStatement = (
      index: number,
      patch: Partial<StatementResultItem>
    ) => {
      const next = [...(executedResultItem.statements || [])];
      next[index] = { ...next[index], ...patch };
      executedResultItem.statements = next;
      resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
    };

    const runOne = async (index: number): Promise<StatementRunOutcome> => {
      const statement = statements[index];
      const rowBuffer: RowData[] = [];
      let statementFields: FieldDef[] = [];

      updateStatement(index, {
        status: StatementRunStatus.RUNNING,
        connection: connection.value,
      });

      const outcome = await runStatementRequest({
        query: statement.text,
        params: fileParameters,
        onMeta: (fields, command) => {
          statementFields = fields;
          updateStatement(index, { fieldDefs: fields, command });
        },
        onRows: (batch, totalSoFar) => {
          rowBuffer.push(...batch);
          queryProcessState.streamingRowCount = totalSoFar;
          updateStatement(index, { result: rowBuffer, rowCount: totalSoFar });
        },
      });

      if (outcome.status === StatementRunStatus.SUCCESS) {
        updateStatement(index, {
          status: StatementRunStatus.SUCCESS,
          queryTime: outcome.queryTime,
          rowCount: outcome.rowCount,
          result: rowBuffer,
        });

        fieldDefs.value = statementFields;
        currentRawQueryResult.value = rowBuffer;
        rawResponse.value = {
          rows: rowBuffer,
          fields: statementFields,
          queryTime: outcome.queryTime,
        };

        return StatementRunStatus.SUCCESS;
      }

      if (outcome.status === StatementRunStatus.CANCELLED) {
        updateStatement(index, { status: StatementRunStatus.CANCELLED });
        return StatementRunStatus.CANCELLED;
      }

      const resolvedError = {
        message: outcome.message,
        data: outcome.errorDetail || { message: outcome.message },
      };

      executedResultItem.metadata.executeErrors = resolvedError;
      updateStatement(index, {
        status: StatementRunStatus.ERROR,
        executeErrors: resolvedError,
      });

      const editorView = getEditorView();
      if (editorView && outcome.errorDetail && !isRedis()) {
        applySqlErrorDiagnostics({
          editorView: editorView as EditorView,
          originalSql: statement.text,
          statementFrom: Number(statement.from),
          fileParameters,
          errorDetail: outcome.errorDetail as DatabaseDriverError,
          clientType:
            (connection.value?.type as unknown as DatabaseClientType) ||
            DatabaseClientType.POSTGRES,
        });
      }

      return StatementRunStatus.ERROR;
    };

    await runStatementsSequentially({
      count: statements.length,
      isCancelled: () => run.cancelled,
      runOne,
      onNotRun: (index, status) => updateStatement(index, { status }),
    });

    const summary = summarizeStatementResults(
      executedResultItem.statements || []
    );
    executedResultItem.metadata.queryTime = summary.totalQueryTime;
    resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);

    // A newer run took over (stopInFlightRuns); leave the shared state to it.
    if (activeMultiRun !== run) {
      return;
    }

    activeMultiRun = null;

    queryProcessState.executeLoading = false;
    queryProcessState.isStreaming = false;
    queryProcessState.queryTime = summary.totalQueryTime;
    queryProcessState.executeErrors = executedResultItem.metadata.executeErrors;
  };

  /**
   * Core execution pipeline for a single SQL statement.
   */
  const executeCurrentStatement = async ({
    currentStatements,
    queryPrefix,
  }: {
    currentStatements: SyntaxTreeNodeData[];
    queryPrefix?: string;
  }) => {
    if (!currentStatements.length) {
      return;
    }

    const isMultiStatement = currentStatements.length > 1;

    // EXPLAIN works on a single statement only.
    if (isMultiStatement && queryPrefix) {
      return;
    }

    if (beforeExecute) {
      const canExecute = await beforeExecute();
      if (!canExecute) {
        return;
      }
    }

    queryProcessState.isHaveOneExecute = true;

    if (isMultiStatement) {
      const combinedQuery = currentStatements
        .map(statement => statement.text)
        .join('\n');
      queryProcessState.currentStatementQuery = combinedQuery;

      const parameters = await resolveFileParameters(combinedQuery);
      if (!parameters) {
        return;
      }

      await executeMultipleStatements(currentStatements, parameters);
      return;
    }

    const currentStatement = currentStatements[0];
    queryProcessState.currentStatementQuery = currentStatement.text;

    let executeQuery = currentStatement.text;

    const resolvedParameters = await resolveFileParameters(executeQuery);
    if (!resolvedParameters) {
      return;
    }
    const fileParameters = resolvedParameters;

    const isRedisConnection = isRedis();

    let executedResultView: ExecutedResultItem['view'] = ViewMode.RESULT;

    if (queryPrefix && !isRedisConnection) {
      executeQuery = `${queryPrefix} ${executeQuery}`;
      if (queryPrefix.startsWith('EXPLAIN')) {
        executedResultView = ViewMode.EXPLAIN;
      }
    }

    fieldDefs.value = [];
    currentRawQueryResult.value = [];
    rawResponse.value = {};
    queryProcessState.executeLoading = true;
    queryProcessState.isStreaming = false;
    queryProcessState.streamingRowCount = 0;

    // Cancel any in-flight streaming query or multi-statement run
    stopInFlightRuns();

    seqIndex.value++;

    const executedResultItem: ExecutedResultItem = {
      id: uuidv4(),
      metadata: {
        queryTime: 0,
        statementQuery: executeQuery,
        executedAt: new Date(),
        executeErrors: undefined,
        fieldDefs: undefined,
        connection: undefined,
      },
      result: [],
      view: executedResultView,
      seqIndex: seqIndex.value,
    };

    // Register the result tab immediately so user sees it
    resultTabs.addResultTab(executedResultItem);
    clearSqlErrorDiagnostics(getEditorView() as EditorView);

    const rowBuffer: RowData[] = []; // accumulator, không reactive

    if (isRedisConnection) {
      try {
        const startedAt = Date.now();
        const redisResponse = await $fetch<RedisCommandResponse>(
          '/api/redis/workbench/execute',
          {
            method: 'POST',
            body: buildRedisRequestBody(executeQuery),
          }
        );

        const normalizedResult = normalizeRedisResult(redisResponse.result);
        const queryTime = Date.now() - startedAt;

        fieldDefs.value = normalizedResult.fields;
        executedResultItem.metadata.fieldDefs = normalizedResult.fields;
        executedResultItem.metadata.connection = connection.value;
        executedResultItem.metadata.command = getRedisCommandName(
          redisResponse,
          executeQuery
        );
        executedResultItem.metadata.queryTime = queryTime;
        executedResultItem.metadata.rowCount = normalizedResult.rows.length;
        executedResultItem.result = normalizedResult.rows;

        rawResponse.value = {
          rows: normalizedResult.rows,
          fields: normalizedResult.fields,
          queryTime,
        };
        currentRawQueryResult.value = normalizedResult.rows;
        queryProcessState.executeLoading = false;
        queryProcessState.isStreaming = false;
        queryProcessState.streamingRowCount = normalizedResult.rows.length;
        queryProcessState.queryTime = queryTime;
        queryProcessState.executeErrors = undefined;

        resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      } catch (error: any) {
        const message =
          error?.data?.message ||
          error?.message ||
          'Failed to execute Redis command.';

        queryProcessState.executeLoading = false;
        queryProcessState.isStreaming = false;
        queryProcessState.executeErrors = {
          message,
          data: error?.data || { message },
        };
        executedResultItem.metadata.executeErrors =
          queryProcessState.executeErrors;
        executedResultItem.view = ViewMode.ERROR;

        resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      }

      return;
    }

    if (queryPrefix && executedResultView === ViewMode.EXPLAIN) {
      try {
        const connParams = getConnectionParams(connection.value);
        const result = await $fetch('/api/query/raw-execute', {
          method: 'POST',
          body: {
            ...connParams,
            query: executeQuery,
            params: fileParameters,
          },

          onResponseError: ({ response }) => {
            const errorDetail = response._data?.data as DatabaseDriverError;
            const editorView = getEditorView();
            if (editorView && errorDetail) {
              applySqlErrorDiagnostics({
                editorView: editorView as EditorView,
                originalSql: currentStatement.text,
                statementFrom: Number(currentStatement.from),
                fileParameters,
                errorDetail,
                clientType:
                  (connection.value?.type as unknown as DatabaseClientType) ||
                  DatabaseClientType.POSTGRES,
                queryPrefix,
              });
            }
          },
        });

        fieldDefs.value = result.fields;
        executedResultItem.metadata.fieldDefs = result.fields;
        executedResultItem.result = result.rows;
        executedResultItem.metadata.queryTime = result.queryTime || 0;
        executedResultItem.metadata.connection = connection.value;

        rawResponse.value = result;
        currentRawQueryResult.value = result.rows as RowData[];
        queryProcessState.executeErrors = undefined;
        queryProcessState.queryTime = result.queryTime || 0;
      } catch (e: any) {
        queryProcessState.executeErrors = e.data;
        executedResultItem.metadata.executeErrors = e.data;
        executedResultItem.view = ViewMode.ERROR;
      }

      queryProcessState.executeLoading = false;

      // Refresh the tab with final data
      resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      return;
    }

    // Regular queries: use streaming for progressive rendering
    queryProcessState.isStreaming = true;
    queryProcessState.executeLoading = false;

    const connParams = getConnectionParams(connection.value);
    const { abort } = executeStreamingQuery({
      query: executeQuery,
      ...connParams,
      params: fileParameters,
      onMeta: (fields, command) => {
        fieldDefs.value = fields;
        executedResultItem.metadata.fieldDefs = fields;
        executedResultItem.metadata.connection = connection.value;
        executedResultItem.metadata.command = command;

        // Refresh tab to show column headers
        resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      },
      onRows: (batch, totalSoFar) => {
        rowBuffer.push(...batch);
        queryProcessState.streamingRowCount = totalSoFar;
        executedResultItem.result = rowBuffer;
        executedResultItem.metadata.rowCount = totalSoFar;
        currentRawQueryResult.value = rowBuffer;
        resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      },
      onDone: (rowCount, queryTime) => {
        queryProcessState.executeLoading = false;
        queryProcessState.isStreaming = false;
        queryProcessState.queryTime = queryTime;
        queryProcessState.executeErrors = undefined;
        queryProcessState.streamingRowCount = rowCount;

        executedResultItem.metadata.queryTime = queryTime;
        executedResultItem.metadata.rowCount = rowCount;

        rawResponse.value = {
          rows: executedResultItem.result,
          fields: fieldDefs.value,
          queryTime,
        };

        // Final refresh
        resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);

        activeStreamAbort = null;
      },
      onError: (message, errorDetail) => {
        const resolvedError = {
          message,
          data: errorDetail || { message },
        };

        queryProcessState.executeLoading = false;
        queryProcessState.isStreaming = false;
        queryProcessState.executeErrors = resolvedError;
        executedResultItem.metadata.executeErrors = resolvedError;
        executedResultItem.view = ViewMode.ERROR;

        const editorView = getEditorView();
        if (editorView && errorDetail) {
          applySqlErrorDiagnostics({
            editorView: editorView as EditorView,
            originalSql: currentStatement.text,
            statementFrom: Number(currentStatement.from),
            fileParameters,
            errorDetail: errorDetail,
            clientType:
              (connection.value?.type as unknown as DatabaseClientType) ||
              DatabaseClientType.POSTGRES,
          });
        }

        // Refresh tab to show error
        resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);

        activeStreamAbort = null;
      },
    });

    activeStreamAbort = abort;
  };

  /**
   * Execute the SQL statement at current cursor position.
   */
  const onExecuteCurrent = () => {
    const editorView = getEditorView();
    if (!editorView) return;

    const { currentStatements } = getCurrentStatement(editorView);

    executeCurrentStatement({
      currentStatements,
    });
  };

  /**
   * Execute EXPLAIN ANALYZE for the SQL statement at current cursor position.
   */
  const onExplainAnalyzeCurrent = () => {
    const editorView = getEditorView();
    if (!editorView) return;

    const { currentStatements } = getCurrentStatement(editorView);

    // EXPLAIN works on a single statement only.
    if (currentStatements.length !== 1) return;

    executeCurrentStatement({
      currentStatements,
      queryPrefix: buildExplainAnalyzePrefix(),
    });
  };

  /**
   * Cancel an in-flight streaming query.
   */
  const cancelStreamingQuery = () => {
    if (activeMultiRun) {
      // The run finishes on its own and marks the rest as cancelled.
      activeMultiRun.cancelled = true;
      activeRequestCancel?.();
      return;
    }

    if (activeStreamAbort) {
      activeStreamAbort();
      activeStreamAbort = null;
      queryProcessState.executeLoading = false;
      queryProcessState.isStreaming = false;
    }
  };

  /**
   * Opens one statement of a multi-statement run in its own result tab,
   * using the stored result (nothing is run again).
   */
  const openStatementInTab = (tabId: string, statementId: string) => {
    const parent = resultTabs.executedResults?.value.get(tabId);
    const statement = parent?.statements?.find(item => item.id === statementId);
    if (!parent || !statement) return;

    seqIndex.value++;

    resultTabs.addResultTab({
      id: uuidv4(),
      metadata: {
        queryTime: statement.queryTime,
        statementQuery: statement.statementQuery,
        executedAt: parent.metadata.executedAt,
        executeErrors: statement.executeErrors,
        fieldDefs: statement.fieldDefs,
        connection: statement.connection,
        command: statement.command,
        rowCount: statement.rowCount,
      },
      result: statement.result,
      view: statement.executeErrors ? ViewMode.ERROR : ViewMode.RESULT,
      seqIndex: seqIndex.value,
    });
  };

  return {
    currentRawQueryResult,
    rawResponse,
    queryProcessState,
    executeCurrentStatement,
    openStatementInTab,
    onExecuteCurrent,
    onExplainAnalyzeCurrent,
    cancelStreamingQuery,
  };
}
