import type { EditorView } from '@codemirror/view';
import type { FieldDef } from 'pg';
import type { SyntaxTreeNodeData } from '~/components/base/code-editor/extensions';
import {
  applySqlErrorDiagnostics,
  clearSqlErrorDiagnostics,
  getCurrentStatement,
} from '~/components/base/code-editor/utils';
import type { RowData } from '~/components/base/data-grid/utils';
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import { uuidv4 } from '~/core/helpers';
import type { Connection } from '~/core/stores';
import type { RawQueryCapabilities, RawQueryExecutor } from '../contracts';
import { ViewMode, type ExecutedResultItem } from '../interfaces';
import { extractParamsFromSql } from '../utils';
import type { ResultTabsReturn } from './useResultTabs';

interface UseQueryExecutionParams {
  getEditorView: () => EditorView | null;
  connection: Ref<Connection | undefined>;
  capabilities: Ref<RawQueryCapabilities>;
  executor: Ref<RawQueryExecutor>;
  fileVariables: Ref<string>;
  fieldDefs: Ref<FieldDef[]>;
  resultTabs: ResultTabsReturn;
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
}

/**
 * Handles the full SQL query execution lifecycle:
 * prepare → execute (injected executor) → update result tabs → abort.
 */
export function useQueryExecution({
  getEditorView,
  connection,
  capabilities,
  executor,
  fileVariables,
  fieldDefs,
  resultTabs,
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

  /**
   * Core execution pipeline for a single SQL statement.
   */
  const executeCurrentStatement = async ({
    currentStatements,
    queryPrefix,
    executor: overrideExecutor,
    resultView,
  }: {
    currentStatements: SyntaxTreeNodeData[];
    queryPrefix?: string;
    executor?: RawQueryExecutor;
    resultView?: ViewMode;
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

    const isVariableSupported = capabilities.value.supportsVariables;

    if (isVariableSupported && promptMissingVariables) {
      const extracted = extractParamsFromSql(
        executeQuery,
        capabilities.value.parameterStyle
      );
      const missing = extracted.filter(param => !(param in fileParameters));
      if (missing.length > 0) {
        const result = await promptMissingVariables(missing);
        if (!result) {
          return;
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
      }
    }

    const executedResultView: ExecutedResultItem['view'] =
      resultView ?? ViewMode.RESULT;

    if (queryPrefix) {
      executeQuery = `${queryPrefix} ${executeQuery}`;
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

    const activeExecutor = overrideExecutor ?? executor.value;
    queryProcessState.isStreaming = activeExecutor.streaming === true;
    queryProcessState.executeLoading = !queryProcessState.isStreaming;
    // Handlers can fire synchronously, so track ownership without the `abort` const (TDZ).
    let ownAbort: (() => void) | null = null;
    const releaseOwnAbort = () => {
      if (activeStreamAbort === ownAbort) activeStreamAbort = null;
    };

    const { abort } = activeExecutor.execute(
      {
        connection: connection.value,
        query: executeQuery,
        params: fileParameters,
      },
      {
        onMeta: (fields, command) => {
          fieldDefs.value = fields;
          executedResultItem.metadata.fieldDefs = fields;
          executedResultItem.metadata.connection = connection.value;
          executedResultItem.metadata.command = command;
          resultTabs.refreshResultTab(
            executedResultItem.id,
            executedResultItem
          );
        },
        onRows: (batch, totalSoFar) => {
          rowBuffer.push(...batch);
          queryProcessState.streamingRowCount = totalSoFar;
          executedResultItem.result = rowBuffer;
          executedResultItem.metadata.rowCount = totalSoFar;
          currentRawQueryResult.value = rowBuffer;
          resultTabs.refreshResultTab(
            executedResultItem.id,
            executedResultItem
          );
        },
        onComplete: ({ rowCount, queryTime }) => {
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

          resultTabs.refreshResultTab(
            executedResultItem.id,
            executedResultItem
          );
          releaseOwnAbort();
        },
        onError: ({ message, detail }) => {
          const resolvedError = { message, data: detail || { message } };

          queryProcessState.executeLoading = false;
          queryProcessState.isStreaming = false;
          queryProcessState.executeErrors = resolvedError;
          executedResultItem.metadata.executeErrors = resolvedError;
          executedResultItem.view = ViewMode.ERROR;

          const editorView = getEditorView();
          if (editorView && detail && capabilities.value.language !== 'redis') {
            applySqlErrorDiagnostics({
              editorView: editorView as EditorView,
              originalSql: currentStatement.text,
              statementFrom: Number(currentStatement.from),
              fileParameters,
              errorDetail: detail,
              clientType: connection.value?.type as DatabaseClientType,
              // The util concatenates this verbatim; `undefined` would become the text "undefined".
              queryPrefix: queryPrefix ?? '',
            });
          }

          resultTabs.refreshResultTab(
            executedResultItem.id,
            executedResultItem
          );
          releaseOwnAbort();
        },
      }
    );

    ownAbort = abort;
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
    cancelStreamingQuery,
  };
}
