import {
  acceptCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import merge from 'lodash-es/merge';
import type { FieldDef } from 'pg';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { CompletionIcon } from '~/components/base/code-editor/constants';
import {
  currentStatementLineHighlightExtension,
  handleFormatCode,
  shortCutExecuteCurrentStatement,
  shortCutFormatOnSave,
  sqlAutoCompletion,
  sqlLinter,
  type SyntaxTreeNodeData,
} from '~/components/base/code-editor/extensions';
import {
  getCurrentStatement,
  pgKeywordCompletion,
} from '~/components/base/code-editor/utils';
import type { RowData } from '~/components/base/dynamic-table/utils';
import type { Connection, Schema } from '~/shared/stores';
import {
  convertParameters,
  type ParsedParametersResult,
} from '~/utils/common/convertParameters';
import type { EditorCursor } from '../interfaces';
import { formatStatementSql, getMappedSchemaSuggestion } from '../utils';

export function useRawQueryEditor({
  activeSchema,
  fileVariables,
  connection,
  fieldDefs,
}: {
  activeSchema: Ref<Schema | undefined>;
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  fieldDefs: Ref<FieldDef[]>;
}) {
  const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
  const rawQueryResults = shallowRef<RowData[]>([]);

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

  const mappedSchema = computed(() => {
    const tableDetails = activeSchema.value?.tableDetails;

    return getMappedSchemaSuggestion({
      tableDetails,
    });
  });

  const mappedTablesSchema = computed(() => {
    const tableDetails = activeSchema.value?.tableDetails;

    const tables: Completion[] = [];

    for (const tableName in tableDetails) {
      tables.push({
        label: tableName,
        type: CompletionIcon.Table,
        detail: `Schema: ${activeSchema.value?.name}`,
        boost: 100,
      });
    }

    // file variables
    try {
      const fileVariablesJson = JSON.parse(fileVariables.value);
      for (const key in fileVariablesJson) {
        tables.push({
          label: `:${key}`,
          type: CompletionIcon.Variable,
          boost: 120,
          detail: 'variable',
          apply(view, completion, _from, to) {
            const matched = view.state.doc.sliceString(_from - 1, to);

            let from = _from;

            if (matched.startsWith(':')) {
              from = _from - 1;
            }

            view.dispatch({
              changes: {
                from,
                to,
                insert: completion.label,
              },
            });
          },
        });
      }
    } catch {}

    return tables;
  });

  // const schema: SQLNamespace = activeSchema.value?.tableDetails ?? {};
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

    // console.log('currentStatementTrees:::', currentStatementTrees);
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
    rawQueryResults.value = [];
    queryProcessState.executeLoading = true;
    try {
      const result = await $fetch('/api/raw-execute', {
        method: 'POST',
        body: {
          dbConnectionString: connection.value?.connectionString,
          query: executeQuery,
        },
      });

      fieldDefs.value = result.fields;

      rawQueryResults.value = result.rows as RowData[];

      queryProcessState.executeErrors = undefined;

      queryProcessState.queryTime = result.queryTime || 0;
    } catch (e: any) {
      queryProcessState.executeErrors = e.data;
    }

    queryProcessState.executeLoading = false;
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
        dialect: PostgreSQL,
        upperCaseKeywords: true,
        keywordCompletion: pgKeywordCompletion,
        tables: mappedTablesSchema.value,
        schema: mappedSchema.value,
      })
    ),
    currentStatementLineHighlightExtension,
    ...sqlAutoCompletion(),
    // lintGutter(),
    //TODO: close to slow to usage
    // sqlLinter(),
  ];

  const reloadSqlCompartment = () => {
    if (!codeEditorRef.value?.editorView) {
      return;
    }

    codeEditorRef.value?.editorView.dispatch({
      effects: sqlCompartment.reconfigure(
        sql({
          dialect: PostgreSQL,
          upperCaseKeywords: true,
          keywordCompletion: pgKeywordCompletion,
          tables: mappedTablesSchema.value,
          schema: mappedSchema.value,
        })
      ),
    });
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

  //TODO:push error when execution error
  function pushSqlError(view: EditorView) {
    const diagnostics: Diagnostic[] = [
      {
        from: 0,
        to: 5,
        severity: 'error',
        message: 'Example error at the beginning',
      },
    ];

    view.dispatch(setDiagnostics(view.state, diagnostics));
  }

  return {
    codeEditorRef,
    rawQueryResults,
    queryProcessState,
    onExecuteCurrent,
    extensions,
    sqlCompartment,
    cursorInfo,
    onHandleFormatCode,
    reloadSqlCompartment,
    pushSqlError,
  };
}
