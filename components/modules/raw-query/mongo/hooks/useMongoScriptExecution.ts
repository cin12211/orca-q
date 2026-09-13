import { reactive, ref, shallowRef, type Ref } from 'vue';
import type { FieldDef } from 'pg';
import { uuidv4 } from '~/core/helpers';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoRawQueryOperation } from '~/core/types/mongodb-raw-query.types';
import { ViewMode, type ExecutedResultItem } from '../../interfaces';
import { approveMongoRawQuery, executeMongoRawQuery } from '../api';
import { resolveMongoScriptSource } from '../utils';

export function useMongoScriptExecution(options: {
  connection: Ref<Connection | undefined>;
  databaseName: Ref<string | undefined>;
  collectionContext: Ref<string | undefined>;
  documentText: Ref<string>;
  fileVariables: Ref<string>;
  fieldDefs: Ref<FieldDef[]>;
  resultTabs: any;
  beforeExecute?: () => Promise<boolean>;
}) {
  const currentRawQueryResult = shallowRef<Record<string, unknown>[]>([]);
  const rawResponse = shallowRef<Record<string, unknown>>({});
  const pendingApproval = ref<{
    challengeId: string;
    operations: MongoRawQueryOperation[];
  } | null>(null);
  const activeExecution = shallowRef<ReturnType<
    typeof executeMongoRawQuery
  > | null>(null);
  const queryProcessState = reactive({
    isHaveOneExecute: false,
    executeLoading: false,
    isStreaming: false,
    streamingRowCount: 0,
    queryTime: 0,
    executeErrors: undefined as any,
    currentStatementQuery: '',
  });
  let sequence = 0;
  let pendingSource: { text: string; from: number; to: number } | null = null;

  const execute = async (
    source?: { text: string; from: number; to: number },
    approvalToken?: string
  ) => {
    console.log('[MongoScriptExecution] execute entered', {
      hasSource: Boolean(source),
      hasConnection: Boolean(options.connection.value),
      connectionId: options.connection.value?.id,
      databaseName: options.databaseName.value,
      documentLength: options.documentText.value.length,
      hasApprovalToken: Boolean(approvalToken),
    });

    if (!options.connection.value) {
      console.warn('[MongoScriptExecution] skipped: missing connection');
      return;
    }

    if (options.beforeExecute) {
      console.log('[MongoScriptExecution] waiting for execution confirmation');
      const canExecute = await options.beforeExecute();
      console.log('[MongoScriptExecution] execution confirmation result', {
        canExecute,
      });
      if (!canExecute) {
        console.warn('[MongoScriptExecution] skipped: execution not confirmed');
        return;
      }
    }
    let params: Record<string, unknown> = {};
    try {
      params = JSON.parse(options.fileVariables.value || '{}');
    } catch {
      throw new Error('Mongo variables must be valid JSON');
    }
    const resolvedSource = source ?? {
      text: options.documentText.value,
      from: 0,
      to: options.documentText.value.length,
    };

    console.log('[MongoScriptExecution] resolvedSource:::', resolvedSource);

    pendingSource = resolvedSource;
    sequence += 1;
    const item: ExecutedResultItem = {
      id: uuidv4(),
      metadata: {
        queryTime: 0,
        statementQuery: resolvedSource.text,
        executedAt: new Date(),
        executeErrors: undefined,
        connection: options.connection.value,
        command: 'MONGODB',
        rowCount: 0,
        resultKind: 'cursor',
      } as any,
      result: [],
      seqIndex: sequence,
      view: ViewMode.RESULT,
    };
    options.resultTabs.addResultTab(item);
    const rows: Record<string, unknown>[] = [];
    queryProcessState.executeLoading = true;
    const connParams = getConnectionParams(options.connection.value);
    console.log('[MongoScriptExecution] calling raw-query API', {
      connectionId: options.connection.value.id,
      database: options.databaseName.value,
      scriptLength: resolvedSource.text.length,
      hasApprovalToken: Boolean(approvalToken),
    });
    activeExecution.value = executeMongoRawQuery({
      ...connParams,
      connectionId: options.connection.value.id,
      database: options.databaseName.value,
      collectionContext: options.collectionContext.value,
      script: resolvedSource.text,
      params,
      approvalToken,
      onMeta: message => {
        item.metadata.resultKind = message.resultKind;
        options.fieldDefs.value = message.fields as any;
        item.metadata.fieldDefs = message.fields as any;
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onRows: (batch, total) => {
        rows.push(...batch);
        item.result = rows;
        item.metadata.rowCount = total;
        queryProcessState.streamingRowCount = total;
        currentRawQueryResult.value = rows;
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onLog: entry => {
        item.metadata.logs ??= [];
        item.metadata.logs.push(entry);
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onResult: message => {
        item.metadata.rawResult = message.data;
        item.result = Array.isArray(message.data)
          ? (message.data as any)
          : [{ value: message.data }];
        rawResponse.value = message.data as any;
        if (message.mutationSummary)
          item.metadata.mutationSummary = message.mutationSummary;
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onApprovalRequired: message => {
        pendingApproval.value = message;
        queryProcessState.executeLoading = false;
      },
      onDone: message => {
        queryProcessState.executeLoading = false;
        queryProcessState.isStreaming = false;
        queryProcessState.queryTime = message.queryTime;
        item.metadata.queryTime = message.queryTime;
        item.metadata.truncated = message.truncated;
        item.metadata.rowCount = message.rowCount;
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onError: error => {
        queryProcessState.executeLoading = false;
        item.metadata.executeErrors = {
          message: error.message,
          data: { message: error.message },
        };
        item.view = ViewMode.ERROR;
        options.resultTabs.refreshResultTab(item.id, item);
      },
    });
    await activeExecution.value.finished;
  };
  const confirmPendingWrite = async () => {
    if (!pendingApproval.value || !pendingSource) return;
    const approval = await approveMongoRawQuery(
      pendingApproval.value.challengeId
    );
    const source = pendingSource;
    pendingApproval.value = null;
    await execute(source, approval.approvalToken);
    return approval;
  };
  const cancelPendingWrite = () => {
    pendingApproval.value = null;
    pendingSource = null;
  };
  const cancel = () => {
    activeExecution.value?.abort();
    activeExecution.value = null;
    queryProcessState.executeLoading = false;
    queryProcessState.isStreaming = false;
  };
  return {
    execute,
    cancel,
    pendingApproval,
    confirmPendingWrite,
    cancelPendingWrite,
    queryProcessState,
    currentRawQueryResult,
    rawResponse,
  };
}
