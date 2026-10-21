import { storeToRefs } from 'pinia';
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { sql } from '@codemirror/lang-sql';
import { lintGutter } from '@codemirror/lint';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap, type KeyBinding } from '@codemirror/view';
import { sqlExtension } from '@marimo-team/codemirror-sql';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { SQLDialectSupport } from '~/components/base/code-editor/constants';
import {
  currentStatementLineGutterExtension,
  currentStatementLineHighlightExtension,
  redis,
  shortCutExecuteCurrentStatement,
  sqlAutoCompletion,
  type SyntaxTreeNodeData,
} from '~/components/base/code-editor/extensions';
import {
  rawQueryEditorFormat,
  sqlParserConfigField,
  updateSqlParserConfigEffect,
} from '~/components/base/code-editor/utils';
import { useSchemaStore } from '~/core/stores';
import type { RawQueryCapabilities } from '../contracts';
import type { EditorCursor } from '../interfaces';
import { createCteAwareCompletionSource } from '../utils/cteAwareCompletionSource';
import { mappedSchemaSuggestion } from '../utils/getMappedSchemaSuggestion';
import {
  isRedisLanguage,
  resolveStatementMode,
} from '../utils/resolveStatementMode';

const getKeywordDocs = async () => {
  const keywords = await import(
    '@marimo-team/codemirror-sql/data/common-keywords.json'
  );
  return keywords.default.keywords;
};

interface UseSqlEditorExtensionsParams {
  codeEditorRef: Ref<InstanceType<typeof BaseCodeEditor> | null>;
  fileVariables: Ref<string>;
  /** Drives dialect, language and formatting support. */
  capabilities: Ref<RawQueryCapabilities>;
  /** Extra keybindings contributed by the engine, e.g. PostgreSQL's Mod-e. */
  extraKeymap?: KeyBinding[];
  /** Callback wired to useQueryExecution.executeCurrentStatement */
  onExecuteStatement: (params: {
    currentStatements: SyntaxTreeNodeData[];
    treeNodes: SyntaxTreeNodeData[];
    queryPrefix?: string;
  }) => void;
}

/**
 * Configures CodeMirror extensions, keymaps, SQL compartments,
 * schema-aware completion, and the schema watcher.
 */
export function useSqlEditorExtensions({
  codeEditorRef,
  fileVariables,
  capabilities,
  extraKeymap,
  onExecuteStatement,
}: UseSqlEditorExtensionsParams) {
  const schemaStore = useSchemaStore();
  const { schemasByContext: connectionSchemas, activeSchema } =
    storeToRefs(schemaStore);

  const cursorInfo = ref<EditorCursor>({ line: 1, column: 1 });

  const getEditorView = () =>
    codeEditorRef.value?.editorView as EditorView | null;

  const defaultSchemaName = computed(
    () => activeSchema.value?.name || connectionSchemas.value?.[0]?.name
  );
  const isRedis = computed(() => isRedisLanguage(capabilities.value));
  const isFormatSupported = computed(() => capabilities.value.supportsFormat);

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
      // `highlightDialect` is optional on the contract because non-SQL
      // languages omit it; this builder only runs for SQL, where it is set.
      dialect:
        capabilities.value.highlightDialect ??
        SQLDialectSupport.PostgreSQLHighlightDialect,
      upperCaseKeywords: true,
      keywordCompletion: capabilities.value.keywordCompletion,
      schema: schemaConfig.value.schema,
      defaultSchema: schemaConfig.value.defaultSchema,
    });

  const buildLanguageExtension = () =>
    isRedis.value ? redis() : buildSqlLanguageExtension();

  const buildCompletionExtension = () => {
    if (isRedis.value) return [];

    // Unreachable for non-SQL languages, which are the only ones that may
    // omit `highlightDialect`.
    const dialect =
      capabilities.value.highlightDialect ??
      SQLDialectSupport.PostgreSQLHighlightDialect;

    return dialect.language.data.of({
      autocomplete: buildCteAwareCompletionSource(),
    });
  };

  const buildHoverExtension = () => {
    if (isRedis.value) return [];

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
      fileVariables: fileVariables.value,
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
      ...(extraKeymap ?? []),
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

    // Non-SQL languages omit `parserDialect`; the parser is disabled for them
    // (`isEnable: false`), so the value below is inert and only keeps the
    // effect payload well-typed.
    const parserDialect =
      capabilities.value.parserDialect ??
      SQLDialectSupport.PostgreSQLParserDialect;

    editorView.dispatch({
      effects: [
        updateSqlParserConfigEffect.of({
          dialect: parserDialect,
          isEnable: !isRedis.value,
          statementMode: resolveStatementMode(capabilities.value),
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

  // Auto-reload when the active connection's capabilities change (e.g. switching workspaces)
  watch(
    () => capabilities.value,
    () => {
      reloadSqlCompartment();
    }
  );

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
