import {
  acceptCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';
import { PostgreSQL, sql, type SQLNamespace } from '@codemirror/lang-sql';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import merge from 'lodash-es/merge';
import type { FieldDef } from 'pg';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  CompletionIcon,
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
import type { Connection, Schema } from '~/shared/stores';
import {
  convertParameters,
  type ParsedParametersResult,
} from '~/utils/common/convertParameters';
import type { EditorCursor } from '../interfaces';
import { formatStatementSql } from '../utils';

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
  const rawQueryResults = ref<unknown[][]>([]);

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

    const schema: SQLNamespace = {};

    for (const key in tableDetails) {
      const columns = tableDetails[key]?.columns;

      const foreignKeys = tableDetails[key]?.foreign_keys;
      const primaryKeys = tableDetails[key]?.primary_keys;

      const mappedColumns = columns.map(col => {
        let type = '';

        if (primaryKeys?.find(pk => pk.column === col.name)) {
          type = CompletionIcon.Keyword;
        } else if (foreignKeys?.find(fk => fk.column === col.name)) {
          type = CompletionIcon.ForeignKey;
        } else {
          type = CompletionIcon.Field;
        }

        const sqlNamespace: Completion = {
          label: col.name,
          type,
          boost: -col.ordinal_position,
          detail: col.short_type_name, // show in last suggestion
          // info: col.short_type_name || '', // show tooltip
        };

        return sqlNamespace;
      });

      mappedColumns.push({
        label: '*',
        type: CompletionIcon.Function,
        boost: 50,
        detail: `All ${key}'s columns`,
      });

      schema[key] = mappedColumns;
    }

    console.log('mappedSchema', schema);

    return schema;
  });

  const mappedTablesSchema = computed(() => {
    const tableDetails = activeSchema.value?.tableDetails;

    const tables: Completion[] = [];

    for (const tableName in tableDetails) {
      tables.push({
        label: tableName,
        type: CompletionIcon.Table,
        displayLabel: `Table ${tableName}`,
        // info: `Table ${tableName}`,
      });
    }

    // tables.push({
    //   label: ':test-variable',
    //   type: CompletionIcon.Variable,
    //   boost: 200,
    // });

    // try {
    //   const fileVariablesJson = JSON.parse(fileVariables.value);
    //   for (const key in fileVariablesJson) {
    //     console.log('🚀 ~ useRawQueryEditor ~ key:', key);
    //     tables.push({
    //       label: `:${key}`,
    //       type: CompletionIcon.Variable,
    //       boost: 200,
    //     });
    //   }
    // } catch {}

    return tables;
  });

  // const schema: SQLNamespace = activeSchema.value?.tableDetails ?? {};
  const sqlCompartment = new Compartment();

  const executeCurrentStatement = async ({
    currentStatement,
    treeNodes,
  }: {
    currentStatement: SyntaxTreeNodeData;
    treeNodes: SyntaxTreeNodeData[];
  }) => {
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

    queryProcessState.executeLoading = true;
    try {
      const result = await $fetch('/api/raw-execute', {
        method: 'POST',
        body: {
          dbConnectionString: connection.value?.connectionString,
          query: executeQuery,
        },
      });

      rawQueryResults.value = result.rows as unknown[][];
      fieldDefs.value = result.fields;

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

    const { currentStatement, treeNodes } = getCurrentStatement(
      codeEditorRef.value?.editorView as EditorView
    );

    if (currentStatement) {
      executeCurrentStatement({
        currentStatement,
        treeNodes,
      });
    }
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
  };
}
