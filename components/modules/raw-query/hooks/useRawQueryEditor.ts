import { computed, ref, watch, type Ref } from 'vue';
import { Compartment } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { FieldDef } from 'pg';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { Connection } from '~/core/stores';
import {
  useMongoScriptEditorExtensions,
  useMongoScriptExecution,
  useMongoScriptMetadata,
} from '../mongo/hooks';
import { resolveMongoScriptSource } from '../mongo/utils';
import { formatMongoScript } from '../mongo/utils/formatMongoScript';
import { useQueryExecution } from './useQueryExecution';
import { useRawQueryExplainAnalyzeOptions } from './useRawQueryExplainAnalyzeOptions';
import { useRawQueryKernel } from './useRawQueryKernel';
import { useSqlEditorExtensions } from './useSqlEditorExtensions';

/**
 * Composition root for the Raw Query editor.
 * Wires together: result tabs, query execution, SQL editor extensions.
 * Returns the same public API surface as before — non-breaking change.
 */
export function useRawQueryEditor({
  fileVariables,
  connection,
  beforeExecute,
  promptMissingVariables,
  onUpdateVariables,
  documentText: documentTextRef,
}: {
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
  documentText?: Ref<string>;
}) {
  const kernel = useRawQueryKernel({
    fileVariables,
    connection,
    beforeExecute,
    promptMissingVariables,
    onUpdateVariables,
    documentText: documentTextRef,
  });

  const { codeEditorRef, resultTabs, cursorInfo, getEditorView } = kernel;
  const fieldDefs = ref<FieldDef[]>([]);

  const {
    explainAnalyzeOptionItems,
    serializeMode,
    toggleExplainOption,
    setSerializeMode,
    buildExplainAnalyzePrefix,
  } = useRawQueryExplainAnalyzeOptions();

  const queryExecution = useQueryExecution({
    getEditorView,
    connection,
    fileVariables,
    fieldDefs,
    resultTabs,
    buildExplainAnalyzePrefix,
    beforeExecute,
    promptMissingVariables,
    onUpdateVariables,
  });

  const sqlEditor = useSqlEditorExtensions({
    codeEditorRef,
    fileVariables,
    connection,
    onExecuteStatement: queryExecution.executeCurrentStatement,
    onExplainAnalyzeCurrent: queryExecution.onExplainAnalyzeCurrent,
  });

  const documentText = documentTextRef ?? ref('');
  const formatMongoScriptDocument = async () => {
    const editorView = getEditorView();
    if (!editorView) return;

    try {
      const source = editorView.state.doc.toString();
      const formatted = await formatMongoScript(source);
      if (formatted === source) {
        editorView.focus();
        return;
      }

      const selection = editorView.state.selection.main;
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: formatted,
        },
        selection: {
          anchor: Math.min(selection.anchor, formatted.length),
          head: Math.min(selection.head, formatted.length),
        },
      });
      editorView.focus();
    } catch (error) {
      console.error('[RawQueryEditor] Failed to format Mongo script', error);
    }
  };
  const mongoExecution = useMongoScriptExecution({
    connection,
    documentText,
    fileVariables,
    fieldDefs,
    resultTabs,
    beforeExecute,
  });
  const mongoMetadata = useMongoScriptMetadata({
    connection,
  });
  const isMongoConnection = computed(
    () => connection.value?.type === DatabaseClientType.MONGODB
  );
  const mongoEditor = useMongoScriptEditorExtensions({
    codeEditorRef,
    fileVariables,
    metadata: mongoMetadata.metadata,
    databases: mongoMetadata.databases,
    metadataByDatabase: mongoMetadata.metadataByDatabase,
    ensureDatabaseMetadata: mongoMetadata.ensureDatabaseMetadata,
    onExecuteCurrent: async () => {
      const editorView = getEditorView();

      console.log('editorView', editorView);

      if (editorView)
        await mongoExecution.execute(resolveMongoScriptSource(editorView));
    },
    onFormat: formatMongoScriptDocument,
  });
  const editorModeCompartment = new Compartment();
  const activeModeExtensions = () =>
    isMongoConnection.value ? mongoEditor.extensions : sqlEditor.extensions;
  const extensions = [editorModeCompartment.of(activeModeExtensions())];
  const reloadLanguageCompartment = () => {
    const editorView = getEditorView();
    if (!editorView) return;
    editorView.dispatch({
      effects: editorModeCompartment.reconfigure(activeModeExtensions()),
    });
  };
  watch(() => connection.value?.type, reloadLanguageCompartment, {
    flush: 'post',
  });
  const onExecuteCurrent = async () => {
    if (isMongoConnection.value) {
      const editorView = getEditorView();

      console.log('editorView', editorView);

      if (editorView)
        await mongoExecution.execute(resolveMongoScriptSource(editorView));
      return;
    }
    queryExecution.onExecuteCurrent();
  };
  const cancelStreamingQuery = () => {
    if (isMongoConnection.value) mongoExecution.cancel();
    else queryExecution.cancelStreamingQuery();
  };

  return {
    codeEditorRef,
    //TODO: waiting for delete because not usage
    currentRawQueryResult: computed(() =>
      isMongoConnection.value
        ? mongoExecution.currentRawQueryResult.value
        : queryExecution.currentRawQueryResult.value
    ),
    rawResponse: computed(() =>
      isMongoConnection.value
        ? mongoExecution.rawResponse.value
        : queryExecution.rawResponse.value
    ),
    queryProcessState: computed(() =>
      isMongoConnection.value
        ? mongoExecution.queryProcessState
        : queryExecution.queryProcessState
    ),
    onExecuteCurrent,
    extensions,
    sqlCompartment: sqlEditor.sqlCompartment,
    cursorInfo,
    onHandleFormatCode: () => {
      if (isMongoConnection.value) {
        void formatMongoScriptDocument();
        return;
      }
      sqlEditor.onHandleFormatCode();
    },
    onHandleFormatCurrentStatement: () => {
      if (isMongoConnection.value) {
        void formatMongoScriptDocument();
        return;
      }
      sqlEditor.onHandleFormatCurrentStatement();
    },
    onExplainAnalyzeCurrent: queryExecution.onExplainAnalyzeCurrent,
    explainAnalyzeOptionItems,
    serializeMode,
    toggleExplainOption,
    setSerializeMode,
    reloadSqlCompartment: () =>
      isMongoConnection.value
        ? reloadLanguageCompartment()
        : sqlEditor.reloadSqlCompartment(),
    reloadLanguageCompartment,
    cancelStreamingQuery,
    fieldDefs,

    // Results tab management
    executedResults: resultTabs.executedResults,
    activeResultTabId: resultTabs.activeResultTabId,
    setActiveResultTab: resultTabs.setActiveResultTab,
    closeResultTab: resultTabs.closeResultTab,
    closeOtherResultTabs: resultTabs.closeOtherResultTabs,
    closeResultTabsToRight: resultTabs.closeResultTabsToRight,
    updateResultTabView: resultTabs.updateResultTabView,
    kernel,
  };
}

export type RawQueryEditor = ReturnType<typeof useRawQueryEditor>;
