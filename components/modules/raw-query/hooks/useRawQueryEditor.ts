import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { sql, PostgreSQL, SQLDialect } from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import merge from 'lodash-es/merge';
import type { FieldDef } from 'pg';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  currentStatementLineGutterExtension,
  currentStatementLineHighlightExtension,
  handleFormatCode,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
  sqlAutoCompletion,
  type SyntaxTreeNodeData,
} from '~/components/base/code-editor/extensions';
import {
  getCurrentStatement,
  pgKeywordCompletion,
} from '~/components/base/code-editor/utils';
import type { RowData } from '~/components/base/dynamic-table/utils';
import { uuidv4 } from '~/lib/utils';
import { useSchemaStore, type Connection, type Schema } from '~/shared/stores';
import {
  convertParameters,
  type ParsedParametersResult,
} from '~/utils/common/convertParameters';
import type { EditorCursor } from '../interfaces';
import { formatStatementSql } from '../utils';
import { mappedSchemaSuggestion } from '../utils/getMappedSchemaSuggestion';

export interface ExecutedResultItem {
  id: string;
  metadata: {
    queryTime: number;
    statementQuery: string;
    executedAt: Date;
    executeErrors:
      | {
          message: string;
          data: Record<string, unknown>;
        }
      | undefined;
    fieldDefs?: FieldDef[];
    connection?: Connection | undefined;
  };
  result: RowData[];
  seqIndex: number;
  view: 'result' | 'error' | 'info' | 'raw' | 'agent';
}

export function useRawQueryEditor({
  fileVariables,
  connection,
  fieldDefs,
}: {
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  fieldDefs: Ref<FieldDef[]>;
}) {
  const schemaStore = useSchemaStore();
  const { schemasByContext: connectionSchemas, activeSchema } =
    toRefs(schemaStore);

  const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
  const currentRawQueryResult = shallowRef<RowData[]>([]);
  const rawResponse = shallowRef<
    | {
        rows: Record<string, any>[];
        fields: FieldDef[];
        queryTime: number;
      }
    | {}
  >({});

  const seqIndex = shallowRef(0);

  //TODO: open when support multiple statements
  const executedResults = shallowRef<Map<string, ExecutedResultItem>>(
    new Map()
  );

  // Track active result tab - new executions will be set as active
  const activeResultTabId = ref<string | null>(null);

  const editorView = computed<EditorView | null>(
    () => codeEditorRef.value?.editorView as EditorView
  );

  const queryProcessState = reactive<{
    isHaveOneExecute: boolean;
    executeLoading: boolean;
    queryTime: number; // ms
    executeErrors:
      | {
          message: string;
          data: Record<string, unknown>;
        }
      | undefined;
    currentStatementQuery: string;
  }>({
    isHaveOneExecute: false,
    executeLoading: false,
    queryTime: 0, // ms
    executeErrors: undefined,
    currentStatementQuery: '',
  });

  const cursorInfo = ref<EditorCursor>({ line: 1, column: 1 });

  const defaultSchemaName = computed(
    () => activeSchema.value?.name || 'public'
  );

  const schemaConfig = computed(() => {
    return mappedSchemaSuggestion({
      schemas: connectionSchemas.value,
      defaultSchemaName: defaultSchemaName.value,
      fileVariables: fileVariables.value,
    });
  });

  //TODO: support nested CTE and alias from multiple schemas
  /**
   * Custom completion sources for enhanced SQL autocomplete
   * These handle alias-based column completion and CTE references
   * Now supports multiple schemas
   */
  // const customCompletionSources = computed<CompletionSource[]>(() => {
  //   return [
  //     createAliasCompletionSource(connectionSchemas, defaultSchemaName.value),
  //     createCTECompletionSource(connectionSchemas),
  //   ];
  // });

  const sqlCompartment = new Compartment();

  const executeCurrentStatement = async ({
    currentStatements,
    treeNodes,
  }: {
    currentStatements: SyntaxTreeNodeData[];
    treeNodes: SyntaxTreeNodeData[];
  }) => {
    // TODO: support multiple statements
    const currentStatement = currentStatements[0];

    queryProcessState.isHaveOneExecute = true;
    queryProcessState.currentStatementQuery = currentStatement.text;

    let executeQuery = currentStatement.text;

    const currentStatementTrees: SyntaxTreeNodeData[] = [];

    treeNodes.forEach(item => {
      if (
        item.from >= currentStatement.from &&
        item.to <= currentStatement.to
      ) {
        currentStatementTrees.push(item);
      }
    });

    // TODO: for show lint error when query
    // const lintCompartment = new Compartment();
    // const dynamicDiagnostics = ref<Diagnostic[]>([]);
    // const createSqlLinter = () => {
    //   return linter(view => {
    //     return dynamicDiagnostics.value;
    //   });
    // };
    // const cursorPos = editorView.value?.state.selection.main.head || 0;
    // const queryWithFormat = formatStatementSql(currentStatement.text);
    // editorView.value?.dispatch({
    //   changes: [
    //     {
    //       from: currentStatement.from,
    //       to: currentStatement.to,
    //       insert: queryWithFormat,
    //     },
    //   ],
    //   selection: { anchor: cursorPos, head: cursorPos },
    //   annotations: [Transaction.addToHistory.of(true)],
    // });

    const reversedCurrentStatementTrees = currentStatementTrees.toReversed();

    let parameters: ParsedParametersResult | null = null;

    for (var statement of reversedCurrentStatementTrees) {
      if (statement.type === 'LineComment') {
        const convertResult = convertParameters(statement.text);

        if (convertResult.values) {
          parameters = convertResult;
          break;
        }
      }
    }

    const fileParameters = convertParameters(fileVariables.value || '');

    let mergeParameters: Record<string, string> =
      (fileParameters.values as Record<string, string>) || {};

    if (parameters?.values) {
      mergeParameters = merge(mergeParameters, parameters.values || {});
    }

    //TODO: bug with formatStatementSql -> this format incorrect for function
    const fillQueryWithParameters = formatStatementSql(
      currentStatement.text,
      mergeParameters
    );

    executeQuery = fillQueryWithParameters;

    //TODO: parse AST to get columns
    //      import { parse, type Statement } from 'pgsql-ast-parser';
    //     const ast: Statement[] = parse(rawNodeText);
    //     console.log('🚀 ~ applyASTRules ~ ast:', ast);

    fieldDefs.value = [];
    currentRawQueryResult.value = [];
    rawResponse.value = {};
    queryProcessState.executeLoading = true;

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
      view: 'result',
      seqIndex: seqIndex.value,
    };

    try {
      const result = await $fetch('/api/raw-execute', {
        method: 'POST',
        body: {
          dbConnectionString: connection.value?.connectionString,
          query: executeQuery,
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

      // TODO: for show lint error when query
      // const message = e.data.message;
      // const errorDetail = JSON.parse(e.data.data);
      // if (editorView.value && errorDetail) {
      //   const pos =
      //     Number(currentStatement.from) + parseInt(errorDetail.position) - 1;
      //   const diagnostics: Diagnostic[] = [
      //     {
      //       from: pos,
      //       to: pos + 1,
      //       severity: 'error',
      //       message,
      //     },
      //   ];
      //   // dynamicDiagnostics.value = diagnostics;
      //   pushDiagnostics(editorView.value, diagnostics);
      // }
    }

    queryProcessState.executeLoading = false;

    // Add to results map at the BEGINNING (new tabs first)
    const newMap = new Map<string, ExecutedResultItem>();
    newMap.set(executedResultItem.id, executedResultItem);
    // Add existing items after the new one
    executedResults.value.forEach((value, key) => {
      newMap.set(key, value);
    });
    executedResults.value = newMap;

    // Set the new result as active tab
    activeResultTabId.value = executedResultItem.id;
  };

  const onExecuteCurrent = () => {
    if (!codeEditorRef.value?.editorView) {
      return;
    }

    const { currentStatements, treeNodes } = getCurrentStatement(
      codeEditorRef.value?.editorView as EditorView
    );

    executeCurrentStatement({
      currentStatements,
      treeNodes,
    });
  };

  const extensions = [
    shortCutExecuteCurrentStatement(executeCurrentStatement),
    shortCutFormatOnSave((fileContent: string) => {
      return formatStatementSql(fileContent);
    }),

    keymap.of([
      { key: 'Mod-i', run: startCompletion },
      { key: 'Tab', run: acceptCompletion },
    ]),

    sqlCompartment.of(
      sql({
        //TODO: bug if use PostgreSQL -> can higlight function name
        // and if use -> parse incorrect for function
        dialect: SQLDialect.define({
          ...PostgreSQL.spec,
          doubleDollarQuotedStrings: false,
        }),
        upperCaseKeywords: true,
        keywordCompletion: pgKeywordCompletion,
        // Use enhanced schema with proper SQLNamespace structure
        tables: schemaConfig.value.variableCompletions,
        schema: schemaConfig.value.schema,
        // Set default schema for direct table completion
        defaultSchema: schemaConfig.value.defaultSchema,
      })
    ),
    currentStatementLineHighlightExtension,
    currentStatementLineGutterExtension,
    // Enhanced SQL autocompletion with custom sources for aliases and CTEs
    ...sqlAutoCompletion(),
    //   {
    //   override: customCompletionSources.value,
    // }
    //TODO: close to slow to usage
    // lintGutter(),
    // lintGutter(),
    // lintCompartment.of(createSqlLinter()),
  ];

  const reloadSqlCompartment = () => {
    if (!codeEditorRef.value?.editorView) {
      return;
    }

    codeEditorRef.value?.editorView.dispatch({
      effects: sqlCompartment.reconfigure(
        sql({
          dialect: SQLDialect.define({
            ...PostgreSQL.spec,
            doubleDollarQuotedStrings: false,
          }),
          upperCaseKeywords: true,
          keywordCompletion: pgKeywordCompletion,
          // Use enhanced schema with proper SQLNamespace structure
          tables: schemaConfig.value.variableCompletions,
          schema: schemaConfig.value.schema,
          // Set default schema for direct table completion
          defaultSchema: schemaConfig.value.defaultSchema,
        })
      ),
    });
  };

  // Tab management functions
  const setActiveResultTab = (tabId: string) => {
    if (executedResults.value.has(tabId)) {
      activeResultTabId.value = tabId;
    }
  };

  const closeResultTab = (tabId: string) => {
    const newMap = new Map(executedResults.value);
    newMap.delete(tabId);
    executedResults.value = newMap;

    // If closing the active tab, switch to the last remaining tab
    if (activeResultTabId.value === tabId) {
      const remainingIds = Array.from(newMap.keys());
      activeResultTabId.value =
        remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;
    }
  };

  const updateResultTabView = (
    tabId: string,
    view: ExecutedResultItem['view']
  ) => {
    const tab = executedResults.value.get(tabId);
    if (tab) {
      const newMap = new Map(executedResults.value);
      newMap.set(tabId, { ...tab, view });
      executedResults.value = newMap;
    }
  };

  const closeOtherResultTabs = (keepTabId: string) => {
    const tabToKeep = executedResults.value.get(keepTabId);
    if (!tabToKeep) return;

    const newMap = new Map<string, ExecutedResultItem>();
    newMap.set(keepTabId, tabToKeep);
    executedResults.value = newMap;

    // Set the kept tab as active
    activeResultTabId.value = keepTabId;
  };

  const closeResultTabsToRight = (tabId: string) => {
    const tabIds = Array.from(executedResults.value.keys());
    const currentIndex = tabIds.indexOf(tabId);

    if (currentIndex < 0) return;

    // Keep tabs from start to current index (inclusive)
    const newMap = new Map<string, ExecutedResultItem>();
    for (let i = 0; i <= currentIndex; i++) {
      const id = tabIds[i];
      const tab = executedResults.value.get(id);
      if (tab) {
        newMap.set(id, tab);
      }
    }
    executedResults.value = newMap;

    // If active tab was deleted, switch to the current tab
    if (!newMap.has(activeResultTabId.value || '')) {
      activeResultTabId.value = tabId;
    }
  };

  const onHandleFormatCode = () => {
    if (!codeEditorRef.value?.editorView) {
      return;
    }

    handleFormatCode(
      codeEditorRef.value?.editorView as EditorView,
      formatStatementSql
    );
  };

  watch(
    () => activeSchema.value?.name,
    () => {
      if (!activeSchema.value?.name) return;
      reloadSqlCompartment();
    },
    {
      deep: true,
      immediate: true,
    }
  );

  return {
    codeEditorRef,
    currentRawQueryResult,
    rawResponse,
    queryProcessState,
    onExecuteCurrent,
    extensions,
    sqlCompartment,
    cursorInfo,
    onHandleFormatCode,
    reloadSqlCompartment,

    // Results tab management
    executedResults,
    activeResultTabId,
    setActiveResultTab,
    closeResultTab,
    closeOtherResultTabs,
    closeResultTabsToRight,
    updateResultTabView,
  };
}
