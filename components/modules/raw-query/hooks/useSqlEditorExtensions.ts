import { storeToRefs } from 'pinia';
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { lintGutter } from '@codemirror/lint';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { sqlExtension } from '@marimo-team/codemirror-sql';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { SQLDialectSupport } from '~/components/base/code-editor/constants';
import {
  currentStatementLineGutterExtension,
  currentStatementLineHighlightExtension,
  shortCutExecuteCurrentStatement,
  sqlAutoCompletion,
  type SyntaxTreeNodeData,
} from '~/components/base/code-editor/extensions';
import {
  pgKeywordCompletion,
  rawQueryEditorFormat,
  sqlParserConfigField,
  updateSqlParserConfigEffect,
} from '~/components/base/code-editor/utils';
import { useSchemaStore } from '~/core/stores';
import type { EditorCursor } from '../interfaces';
import { createCteAwareCompletionSource } from '../utils/cteAwareCompletionSource';
import { mappedSchemaSuggestion } from '../utils/getMappedSchemaSuggestion';

const getKeywordDocs = async () => {
  const keywords = await import(
    '@marimo-team/codemirror-sql/data/common-keywords.json'
  );
  return keywords.default.keywords;
};

interface UseSqlEditorExtensionsParams {
  codeEditorRef: Ref<InstanceType<typeof BaseCodeEditor> | null>;
  fileVariables: Ref<string>;
  /** Callback wired to useQueryExecution.executeCurrentStatement */
  onExecuteStatement: (params: {
    currentStatements: SyntaxTreeNodeData[];
    treeNodes: SyntaxTreeNodeData[];
    queryPrefix?: string;
  }) => void;
  onExplainAnalyzeCurrent: () => void;
}

/**
 * Configures CodeMirror extensions, keymaps, SQL compartments,
 * schema-aware completion, and the schema watcher.
 */
export function useSqlEditorExtensions({
  codeEditorRef,
  fileVariables,
  onExecuteStatement,
  onExplainAnalyzeCurrent,
}: UseSqlEditorExtensionsParams) {
  const schemaStore = useSchemaStore();
  const { schemasByContext: connectionSchemas, activeSchema } =
    storeToRefs(schemaStore);

  const cursorInfo = ref<EditorCursor>({ line: 1, column: 1 });

  const getEditorView = () =>
    codeEditorRef.value?.editorView as EditorView | null;

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

  const sqlCompartment = new Compartment();
  const sqlCompletionCompartment = new Compartment();

  const buildCteAwareCompletionSource = () =>
    createCteAwareCompletionSource({
      schemas: connectionSchemas.value,
      defaultSchemaName: defaultSchemaName.value,
    });

  const { onHandleFormatCurrentStatement, onHandleFormatCode } =
    rawQueryEditorFormat({
      getEditorView: () => getEditorView(),
    });

  // --- Extensions array ---
  const extensions = [
    shortCutExecuteCurrentStatement(onExecuteStatement),

    keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          onHandleFormatCurrentStatement();
          return true;
        },
        preventDefault: true,
      },
      {
        key: 'Shift-Alt-f',
        run: () => {
          onHandleFormatCode();
          return true;
        },
        preventDefault: true,
      },
      {
        key: 'Mod-e',
        run: () => {
          onExplainAnalyzeCurrent();
          return true;
        },
        preventDefault: true,
      },
      { key: 'Mod-i', run: startCompletion },
      { key: 'Tab', run: acceptCompletion },
    ]),

    sqlCompartment.of(
      sql({
        dialect: SQLDialectSupport['PostgreSQL'],
        upperCaseKeywords: true,
        keywordCompletion: pgKeywordCompletion,
        tables: schemaConfig.value.variableCompletions,
        schema: schemaConfig.value.schema,
        defaultSchema: schemaConfig.value.defaultSchema,
      })
    ),
    sqlCompletionCompartment.of(
      PostgreSQL.language.data.of({
        autocomplete: buildCteAwareCompletionSource(),
      })
    ),
    currentStatementLineHighlightExtension,
    currentStatementLineGutterExtension,
    ...sqlAutoCompletion(),
    lintGutter(),
    sqlExtension({
      enableLinting: false,
      enableGutterMarkers: false,
      enableHover: true,
      hoverConfig: {
        hoverTime: 250,
        enableKeywords: true,
        keywords: async () => {
          const keywords = await getKeywordDocs();
          return keywords;
        },
        enableTables: false,
        enableColumns: false,
        enableFuzzySearch: false,
      },
    }),
    sqlParserConfigField,
  ];

  /**
   * Reconfigure SQL compartments when schema or variables change.
   */
  const reloadSqlCompartment = () => {
    const editorView = getEditorView();
    if (!editorView) return;

    editorView.dispatch({
      effects: [
        updateSqlParserConfigEffect.of({
          dialect: PostgreSQL,
          isEnable: true,
        }),
        sqlCompartment.reconfigure(
          sql({
            dialect: SQLDialectSupport['PostgreSQL'],
            upperCaseKeywords: true,
            keywordCompletion: pgKeywordCompletion,
            tables: schemaConfig.value.variableCompletions,
            schema: schemaConfig.value.schema,
            defaultSchema: schemaConfig.value.defaultSchema,
          })
        ),
        sqlCompletionCompartment.reconfigure(
          PostgreSQL.language.data.of({
            autocomplete: buildCteAwareCompletionSource(),
          })
        ),
      ],
    });
  };

  // Auto-reload when schema changes
  watch(
    () => [activeSchema.value?.name, connectionSchemas.value],
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
    extensions,
    sqlCompartment,
    cursorInfo,
    onHandleFormatCode,
    onHandleFormatCurrentStatement,
    reloadSqlCompartment,
  };
}
