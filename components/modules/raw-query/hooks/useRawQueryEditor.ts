import {
  acceptCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import merge from 'lodash-es/merge';
import type { FieldDef } from 'pg';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { CompletionIcon } from '~/components/base/code-editor/constants';
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
import type { Connection, Schema } from '~/shared/stores';
import {
  convertParameters,
  type ParsedParametersResult,
} from '~/utils/common/convertParameters';
import type { EditorCursor } from '../interfaces';
import {
  formatStatementSql,
  generateTableAlias,
  getMappedSchemaSuggestion,
} from '../utils';

// interface ExecutedResultItem {
//   id: string;
//   metadata: {
//     queryTime: number;
//     statementQuery: string;
//     executeErrors:
//       | {
//           message: string;
//           data: Record<string, unknown>;
//         }
//       | undefined;
//     fieldDefs?: FieldDef[];
//     connection?: Connection | undefined;
//   };
//   result: RowData[];
// }

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
  const currentRawQueryResult = shallowRef<RowData[]>([]);
  const rawResponse = shallowRef<
    | {
        rows: Record<string, any>[];
        fields: FieldDef[];
        queryTime: number;
      }
    | {}
  >({});

  //TODO: open when support multiple statements
  // const executedResults = shallowRef<ExecutedResultItem[]>([]);

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
      const label = `${tableName} as ${generateTableAlias(tableName)}`;
      const apply = `${tableName} AS ${generateTableAlias(tableName)}`;

      tables.push({
        label,
        type: CompletionIcon.Table,
        detail: `Schema: ${activeSchema.value?.name}`,
        boost: 100,
        apply,
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

            if (matched?.startsWith(':')) {
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
    currentRawQueryResult.value = [];
    rawResponse.value = {};
    queryProcessState.executeLoading = true;

    // const executedResultItem: ExecutedResultItem = {
    //   id: uuidv4(),
    //   metadata: {
    //     queryTime: 0,
    //     statementQuery: executeQuery,
    //     executeErrors: undefined,
    //     fieldDefs: undefined,
    //     connection: undefined,
    //   },
    //   result: [],
    // };
    try {
      const result = await $fetch('/api/raw-execute', {
        method: 'POST',
        body: {
          dbConnectionString: connection.value?.connectionString,
          query: executeQuery,
        },
      });

      fieldDefs.value = result.fields;

      // executedResultItem.metadata.fieldDefs = result.fields;
      // executedResultItem.result = result.rows;
      // executedResultItem.metadata.queryTime = result.queryTime || 0;
      // executedResultItem.metadata.connection = connection.value;

      rawResponse.value = result;
      currentRawQueryResult.value = result.rows as RowData[];
      queryProcessState.executeErrors = undefined;
      queryProcessState.queryTime = result.queryTime || 0;
    } catch (e: any) {
      queryProcessState.executeErrors = e.data;
      // executedResultItem.metadata.executeErrors = e.data;
    }

    queryProcessState.executeLoading = false;

    // executedResults.value.push(executedResultItem);
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
    currentStatementLineGutterExtension,
    ...sqlAutoCompletion(),
    //TODO: close to slow to usage
    // lintGutter(),
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
    currentRawQueryResult,
    rawResponse,
    queryProcessState,
    onExecuteCurrent,
    extensions,
    sqlCompartment,
    cursorInfo,
    onHandleFormatCode,
    reloadSqlCompartment,
    pushSqlError,
    // executedResults,
  };
}
