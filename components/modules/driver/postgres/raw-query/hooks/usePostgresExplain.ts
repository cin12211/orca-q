import type { EditorView, KeyBinding } from '@codemirror/view';
import type { SyntaxTreeNodeData } from '~/components/base/code-editor/extensions';
import { getCurrentStatement } from '~/components/base/code-editor/utils';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { RawQueryExecutor } from '~/components/modules/raw-query/contracts';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { EXPLAIN_ANALYZE_OPTIONS } from '../constants';
import { postgresExplainExecutor } from '../services';
import type {
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
} from '../types';

export interface PostgresExplainParams {
  executeCurrentStatement: (params: {
    currentStatements: SyntaxTreeNodeData[];
    queryPrefix?: string;
    executor?: RawQueryExecutor;
    resultView?: ViewMode;
  }) => void;
  getEditorView: () => EditorView | null;
}

/**
 * PostgreSQL EXPLAIN ANALYZE: option state, the `EXPLAIN (...)` prefix and the
 * editor contributions (⌘E keybinding, "Analyze Query" context-menu entry).
 */
export function usePostgresExplain({
  executeCurrentStatement,
  getEditorView,
}: PostgresExplainParams) {
  const explainAnalyzeOptions = ref<
    Record<ExplainAnalyzeToggleOptionKey, boolean>
  >({
    BUFFERS: true,
    COSTS: true,
    GENERIC_PLAN: false,
    MEMORY: false,
    SETTINGS: true,
    SUMMARY: true,
    TIMING: true,
    VERBOSE: true,
    WAL: true,
  });

  const serializeMode = ref<ExplainAnalyzeSerializeMode>('NONE');

  const toggleOption = (option: ExplainAnalyzeToggleOptionKey) => {
    explainAnalyzeOptions.value[option] = !explainAnalyzeOptions.value[option];
  };

  const setSerializeMode = (mode: ExplainAnalyzeSerializeMode) => {
    serializeMode.value = mode;
  };

  const optionItems = computed(() => {
    return EXPLAIN_ANALYZE_OPTIONS.filter(
      option => option.key !== 'SERIALIZE'
    ).map(option => ({
      key: option.key as ExplainAnalyzeToggleOptionKey,
      label: option.label,
      checked:
        explainAnalyzeOptions.value[
          option.key as ExplainAnalyzeToggleOptionKey
        ],
    }));
  });

  const buildPrefix = () => {
    const enabledOptions = EXPLAIN_ANALYZE_OPTIONS.filter(
      option =>
        option.key !== 'SERIALIZE' &&
        explainAnalyzeOptions.value[option.key as ExplainAnalyzeToggleOptionKey]
    )
      .map(option => option.key)
      .flatMap(option => {
        if (option === 'GENERIC_PLAN') {
          return [];
        }

        return [option];
      });

    const serializeOption =
      serializeMode.value === 'NONE'
        ? []
        : [`SERIALIZE ${serializeMode.value}`];

    const options = [
      'ANALYZE',
      'FORMAT JSON',
      ...enabledOptions,
      ...serializeOption,
    ].join(', ');

    return `EXPLAIN (${options})`;
  };

  const runExplain = () => {
    const editorView = getEditorView();
    if (!editorView) return;

    const { currentStatements } = getCurrentStatement(editorView);

    executeCurrentStatement({
      currentStatements,
      queryPrefix: buildPrefix(),
      executor: postgresExplainExecutor,
      resultView: ViewMode.EXPLAIN,
    });
  };

  const explainKeymap: KeyBinding[] = [
    {
      key: 'Mod-e',
      run: () => {
        runExplain();
        return true;
      },
      preventDefault: true,
    },
  ];

  const explainContextMenuItems: ContextMenuItem[] = [
    {
      type: ContextMenuItemType.ACTION,
      title: 'Analyze Query',
      icon: 'hugeicons:analytics-01',
      shortcut: '⌘E',
      select: () => runExplain(),
    },
  ];

  return {
    optionItems,
    serializeMode,
    toggleOption,
    setSerializeMode,
    buildPrefix,
    runExplain,
    explainKeymap,
    explainContextMenuItems,
  };
}
