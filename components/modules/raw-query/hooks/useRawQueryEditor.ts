import type { EditorView } from '@codemirror/view';
import type { FieldDef } from 'pg';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import type { Connection } from '~/core/stores';
import { useQueryExecution } from './useQueryExecution';
import { useRawQueryExplainAnalyzeOptions } from './useRawQueryExplainAnalyzeOptions';
import { useResultTabs } from './useResultTabs';
import { useSqlEditorExtensions } from './useSqlEditorExtensions';

/**
 * Composition root for the Raw Query editor.
 * Wires together: result tabs, query execution, SQL editor extensions.
 * Returns the same public API surface as before — non-breaking change.
 */
export function useRawQueryEditor({
  fileVariables,
  connection,
  fieldDefs,
}: {
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  fieldDefs: Ref<FieldDef[]>;
}) {
  const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);

  const {
    explainAnalyzeOptionItems,
    serializeMode,
    toggleExplainOption,
    setSerializeMode,
    buildExplainAnalyzePrefix,
  } = useRawQueryExplainAnalyzeOptions();

  const resultTabs = useResultTabs();

  const getEditorView = () =>
    (codeEditorRef.value?.editorView as EditorView | undefined) ?? null;

  const queryExecution = useQueryExecution({
    getEditorView,
    connection,
    fileVariables,
    fieldDefs,
    resultTabs,
    buildExplainAnalyzePrefix,
  });

  const sqlEditor = useSqlEditorExtensions({
    codeEditorRef,
    fileVariables,
    onExecuteStatement: queryExecution.executeCurrentStatement,
    onExplainAnalyzeCurrent: queryExecution.onExplainAnalyzeCurrent,
  });

  return {
    codeEditorRef,
    currentRawQueryResult: queryExecution.currentRawQueryResult,
    rawResponse: queryExecution.rawResponse,
    queryProcessState: queryExecution.queryProcessState,
    onExecuteCurrent: queryExecution.onExecuteCurrent,
    extensions: sqlEditor.extensions,
    sqlCompartment: sqlEditor.sqlCompartment,
    cursorInfo: sqlEditor.cursorInfo,
    onHandleFormatCode: sqlEditor.onHandleFormatCode,
    onHandleFormatCurrentStatement: sqlEditor.onHandleFormatCurrentStatement,
    onExplainAnalyzeCurrent: queryExecution.onExplainAnalyzeCurrent,
    explainAnalyzeOptionItems,
    serializeMode,
    toggleExplainOption,
    setSerializeMode,
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
