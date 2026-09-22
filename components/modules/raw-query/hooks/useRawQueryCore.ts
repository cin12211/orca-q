import type { EditorView } from '@codemirror/view';
import type { KeyBinding } from '@codemirror/view';
import type { FieldDef } from 'pg';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import type { Connection } from '~/core/stores';
import type { RawQueryDriverDescriptor, RawQueryExecutor } from '../contracts';
import { useQueryExecution } from './useQueryExecution';
import { useRawQueryResultTabsContext } from './useRawQueryResultTabsContext';
import { useSqlEditorExtensions } from './useSqlEditorExtensions';

/**
 * Engine-agnostic composition root for the Raw Query editor.
 * Wires together: result tabs, query execution, SQL editor extensions.
 * Engine specifics (capabilities, executor, extra keymap) are injected.
 */
export function useRawQueryCore({
  descriptor,
  executor,
  fileVariables,
  connection,
  fieldDefs,
  extraKeymap,
  beforeExecute,
  promptMissingVariables,
  onUpdateVariables,
}: {
  descriptor: Ref<RawQueryDriverDescriptor>;
  executor: Ref<RawQueryExecutor>;
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  fieldDefs: Ref<FieldDef[]>;
  extraKeymap?: KeyBinding[];
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
}) {
  const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);

  const capabilities = computed(() => descriptor.value.capabilities);

  const resultTabs = useRawQueryResultTabsContext();

  const getEditorView = () =>
    (codeEditorRef.value?.editorView as EditorView | undefined) ?? null;

  const queryExecution = useQueryExecution({
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
  });

  const sqlEditor = useSqlEditorExtensions({
    codeEditorRef,
    fileVariables,
    capabilities,
    extraKeymap,
    onExecuteStatement: queryExecution.executeCurrentStatement,
  });

  return {
    codeEditorRef,
    capabilities,
    getEditorView,
    executeCurrentStatement: queryExecution.executeCurrentStatement,
    currentRawQueryResult: queryExecution.currentRawQueryResult,
    rawResponse: queryExecution.rawResponse,
    queryProcessState: queryExecution.queryProcessState,
    onExecuteCurrent: queryExecution.onExecuteCurrent,
    extensions: sqlEditor.extensions,
    sqlCompartment: sqlEditor.sqlCompartment,
    cursorInfo: sqlEditor.cursorInfo,
    onHandleFormatCode: sqlEditor.onHandleFormatCode,
    onHandleFormatCurrentStatement: sqlEditor.onHandleFormatCurrentStatement,
    reloadSqlCompartment: sqlEditor.reloadSqlCompartment,
    cancelStreamingQuery: queryExecution.cancelStreamingQuery,

    // Results tab management
    executedResults: resultTabs.executedResults,
    activeResultTabId: resultTabs.activeResultTabId,
    setActiveResultTab: resultTabs.setActiveResultTab,
    closeResultTab: resultTabs.closeResultTab,
    closeOtherResultTabs: resultTabs.closeOtherResultTabs,
    closeResultTabsToRight: resultTabs.closeResultTabsToRight,
    updateResultTabView: resultTabs.updateResultTabView,
  };
}
