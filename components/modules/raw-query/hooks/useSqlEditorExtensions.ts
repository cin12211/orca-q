import { storeToRefs } from 'pinia';
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { sql } from '@codemirror/lang-sql';
import { lintGutter } from '@codemirror/lint';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { sqlExtension } from '@marimo-team/codemirror-sql';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import {
  currentStatementLineGutterExtension,
  currentStatementLineHighlightExtension,
  redis,
  shortCutExecuteCurrentStatement,
  sqlAutoCompletion,
  type SyntaxTreeNodeData,
} from '~/components/base/code-editor/extensions';
import { resolveDialect } from '~/components/base/code-editor/states/sqlParserConfig';
import {
  pgKeywordCompletion,
  rawQueryEditorFormat,
  sqlParserConfigField,
  updateSqlParserConfigEffect,
} from '~/components/base/code-editor/utils';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores';
import type { Connection } from '~/core/stores';
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
  /** Active workspace connection — used to resolve the correct SQL dialect. */
  connection?: Ref<Connection | undefined>;
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
  connection,
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
  const isRedisConnection = computed(
    () => connection?.value?.type === DatabaseClientType.REDIS
  );
  const isFormatSupported = computed(() => !isRedisConnection.value);
  const isExplainSupported = computed(
    () => connection?.value?.type === DatabaseClientType.POSTGRES
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
  const sqlHoverCompartment = new Compartment();

  const buildSqlLanguageExtension = () =>
    sql({
      dialect: resolveDialect(connection?.value?.type),
      upperCaseKeywords: true,
      keywordCompletion:
        !connection?.value?.type ||
        connection.value.type === DatabaseClientType.POSTGRES
          ? pgKeywordCompletion
          : undefined,
      tables: schemaConfig.value.variableCompletions,
      schema: schemaConfig.value.schema,
      defaultSchema: schemaConfig.value.defaultSchema,
    });

  const buildLanguageExtension = () => {
    if (isRedisConnection.value) {
      return redis();
    }

    return buildSqlLanguageExtension();
  };

  const buildCompletionExtension = () => {
    if (isRedisConnection.value) {
      return [];
    }

    return resolveDialect(connection?.value?.type).language.data.of({
      autocomplete: buildCteAwareCompletionSource(),
    });
  };

  const buildHoverExtension = () => {
    if (isRedisConnection.value) {
      return [];
    }

    return sqlExtension({
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
    });
  };

  const buildCteAwareCompletionSource = () =>
    createCteAwareCompletionSource({
      schemas: connectionSchemas.value,
      defaultSchemaName: defaultSchemaName.value,
    });

  const {
    onHandleFormatCurrentStatement: onHandleFormatCurrentStatementSql,
    onHandleFormatCode: onHandleFormatCodeSql,
  } = rawQueryEditorFormat({
    getEditorView: () => getEditorView(),
  });

  const onHandleFormatCurrentStatement = () => {
    if (!isFormatSupported.value) {
      return;
    }

    onHandleFormatCurrentStatementSql();
  };

  const onHandleFormatCode = () => {
    if (!isFormatSupported.value) {
      return;
    }

    onHandleFormatCodeSql();
  };

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
          if (!isExplainSupported.value) {
            return true;
          }

          onExplainAnalyzeCurrent();
          return true;
        },
        preventDefault: true,
      },
      { key: 'Mod-i', run: startCompletion },
      { key: 'Tab', run: acceptCompletion },
    ]),

    sqlCompartment.of(buildLanguageExtension()),
    sqlCompletionCompartment.of(buildCompletionExtension()),
    currentStatementLineHighlightExtension,
    currentStatementLineGutterExtension,
    ...sqlAutoCompletion(),
    lintGutter(),
    sqlHoverCompartment.of(buildHoverExtension()),
    sqlParserConfigField,
  ];

  /**
   * Reconfigure SQL compartments when schema or variables change.
   */
  const reloadSqlCompartment = () => {
    const editorView = getEditorView();
    if (!editorView) return;

    const dialect = resolveDialect(connection?.value?.type);
    const statementMode = isRedisConnection.value ? 'line' : 'sql';

    editorView.dispatch({
      effects: [
        updateSqlParserConfigEffect.of({
          dialect,
          isEnable: !isRedisConnection.value,
          statementMode,
        }),
        sqlCompartment.reconfigure(buildLanguageExtension()),
        sqlCompletionCompartment.reconfigure(buildCompletionExtension()),
        sqlHoverCompartment.reconfigure(buildHoverExtension()),
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

  // Auto-reload when the active connection's DB type changes (e.g. switching workspaces)
  if (connection) {
    watch(
      () => connection.value?.type,
      () => {
        reloadSqlCompartment();
      }
    );
  }

  watch(
    () => codeEditorRef.value?.editorView,
    editorView => {
      if (!editorView) {
        return;
      }

      reloadSqlCompartment();
    },
    { immediate: true }
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
