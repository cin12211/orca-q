import type { EditorView } from '@codemirror/view';
import type { FieldDef } from 'pg';
import type { SyntaxTreeNodeData } from '~/components/base/code-editor/extensions';
import {
  applySqlErrorDiagnostics,
  clearSqlErrorDiagnostics,
  getCurrentStatement,
} from '~/components/base/code-editor/utils';
import type { RowData } from '~/components/base/dynamic-table/utils';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { uuidv4 } from '~/core/helpers';
import type { Connection } from '~/core/stores';
import type { DatabaseDriverError } from '~/core/types';
import type { ExecutedResultItem } from '../interfaces';
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
}

type RedisCommandResponse = {
  command?: string[];
  result: unknown;
};

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

    // TODO: support multiple statements
    const currentStatement = currentStatements[0];

    if (beforeExecute) {
      const canExecute = await beforeExecute();
      if (!canExecute) {
        return;
      }
    }

    queryProcessState.isHaveOneExecute = true;
    queryProcessState.currentStatementQuery = currentStatement.text;

    let executeQuery = currentStatement.text;

    let fileParameters: Record<string, unknown> = {};

    try {
      fileParameters = JSON.parse(fileVariables.value || '{}');
    } catch (e) {
      console.log('fileParameters error::', e);
    }

    let executedResultView: ExecutedResultItem['view'] = 'result';
    const isRedisConnection =
      connection.value?.type === DatabaseClientType.REDIS;

    if (queryPrefix && !isRedisConnection) {
      executeQuery = `${queryPrefix} ${executeQuery}`;
      if (queryPrefix.startsWith('EXPLAIN')) {
        executedResultView = 'explain';
      }
    }

    fieldDefs.value = [];
    currentRawQueryResult.value = [];
    rawResponse.value = {};
    queryProcessState.executeLoading = true;
    queryProcessState.isStreaming = false;
    queryProcessState.streamingRowCount = 0;

    // Cancel any in-flight streaming query
    if (activeStreamAbort) {
      activeStreamAbort();
      activeStreamAbort = null;
    }

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
            body: {
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
              command: executeQuery,
            },
          }
        );

        const normalizedResult = normalizeRedisResult(redisResponse.result);
        const queryTime = Date.now() - startedAt;

        fieldDefs.value = normalizedResult.fields;
        executedResultItem.metadata.fieldDefs = normalizedResult.fields;
        executedResultItem.metadata.connection = connection.value;
        executedResultItem.metadata.command =
          redisResponse.command?.[0] ||
          executeQuery.trim().split(/\s+/)[0]?.toUpperCase() ||
          'REDIS';
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
        executedResultItem.view = 'error';

        resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      }

      return;
    }

    if (queryPrefix && executedResultView === 'explain') {
      try {
        const result = await $fetch('/api/query/raw-execute', {
          method: 'POST',
          body: {
            dbConnectionString: connection.value?.connectionString,
            type: connection.value?.type,
            providerKind: connection.value?.providerKind,
            managedSqlite: connection.value?.managedSqlite,
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
        executedResultItem.view = 'error';
      }

      queryProcessState.executeLoading = false;

      // Refresh the tab with final data
      resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      return;
    }

    // Regular queries: use streaming for progressive rendering
    queryProcessState.isStreaming = true;
    queryProcessState.executeLoading = false;

    const { abort } = executeStreamingQuery({
      query: executeQuery,
      dbConnectionString: connection.value?.connectionString || '',
      type: connection.value?.type,
      providerKind: connection.value?.providerKind,
      managedSqlite: connection.value?.managedSqlite,
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
        executedResultItem.view = 'error';

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

    executeCurrentStatement({
      currentStatements,
      queryPrefix: buildExplainAnalyzePrefix(),
    });
  };

  /**
   * Cancel an in-flight streaming query.
   */
  const cancelStreamingQuery = () => {
    if (activeStreamAbort) {
      activeStreamAbort();
      activeStreamAbort = null;
      queryProcessState.executeLoading = false;
      queryProcessState.isStreaming = false;
    }
  };

  return {
    currentRawQueryResult,
    rawResponse,
    queryProcessState,
    executeCurrentStatement,
    onExecuteCurrent,
    onExplainAnalyzeCurrent,
    cancelStreamingQuery,
  };
}
