import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { Transaction } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { getCurrentStatement } from '~/components/base/code-editor/utils';
import type { ContextMenuItem } from '~/components/base/context-menu/menuContext.type';
import { postgresPlugin } from '../registry/plugins/postgres.plugin';
import type {
  RawQueryContext,
  RawQueryContextMenuContext,
  RawQueryDialectPlugin,
} from '../registry/rawQueryPlugin.types';
import { buildContextMenuItems } from '../utils/rawQueryContextMenu';

export interface EditorContextMenuActions {
  onExecuteCurrent?: () => void;
  onExplainAnalyzeCurrent?: () => void;
  onHandleFormatCurrentStatement?: () => void;
  onHandleFormatCode?: () => void;
  isFormatSupported?: MaybeRefOrGetter<boolean | undefined>;
  isSupportFormat?: MaybeRefOrGetter<boolean | undefined>;
  isExplainSupported?: MaybeRefOrGetter<boolean | undefined>;
  // Accepts any EditorView-like object (including readonly refs)
  getEditorView: () => EditorView | null | undefined;
  plugin?: MaybeRefOrGetter<RawQueryDialectPlugin<any> | undefined>;
  context?: MaybeRefOrGetter<RawQueryContext<any> | undefined>;
}

/**
 * Resolves the current SQL statement(s) under the cursor.
 * Returns the combined text and the full range (from..to).
 */
const resolveCurrentStatements = (
  view: EditorView
): { text: string; from: number; to: number } | null => {
  try {
    const { currentStatements } = getCurrentStatement(view);
    if (!currentStatements || !currentStatements.length) return null;

    const from = Math.min(...currentStatements.map(s => s.from));
    const to = Math.max(...currentStatements.map(s => s.to));
    const text = currentStatements.map(s => s.text).join('\n');

    return { text, from, to };
  } catch {
    // If AST statement parser fails (e.g. mock view in unit tests or unsupported state),
    // fallback to lineAt if available
    try {
      if (typeof (view.state?.doc as any)?.lineAt === 'function') {
        const head = view.state?.selection?.main?.head ?? 0;
        const line = (view.state.doc as any).lineAt(head);
        const text = line?.text?.trim?.() ?? '';
        if (text) {
          return { text, from: line.from, to: line.to };
        }
      }
    } catch {
      // ignore
    }
    return null;
  }
};

export function useRawQueryEditorContextMenu(
  actions: EditorContextMenuActions
) {
  // Validation state — updated each time context menu opens
  const hasStatement = ref(false);
  const hasContent = ref(false);

  const getRawQueryContext = (_view: EditorView): RawQueryContext<any> => {
    const passedContext = toValue(actions.context);
    const isFormatSupported =
      toValue(actions.isFormatSupported ?? actions.isSupportFormat) ??
      passedContext?.isFormatSupported ??
      true;
    const isExplainSupported =
      toValue(actions.isExplainSupported) ??
      passedContext?.isExplainSupported ??
      false;

    if (passedContext) {
      return {
        ...passedContext,
        onExecuteCurrent:
          actions.onExecuteCurrent ?? passedContext.onExecuteCurrent,
        onExplainAnalyzeCurrent:
          actions.onExplainAnalyzeCurrent ??
          passedContext.onExplainAnalyzeCurrent,
        onFormatCurrentStatement:
          actions.onHandleFormatCurrentStatement ??
          passedContext.onFormatCurrentStatement,
        onFormatAll: actions.onHandleFormatCode ?? passedContext.onFormatAll,
        isFormatSupported,
        isExplainSupported,
      } as RawQueryContext<any>;
    }

    return {
      onExecuteCurrent: actions.onExecuteCurrent,
      onExplainAnalyzeCurrent: actions.onExplainAnalyzeCurrent,
      onFormatCurrentStatement: actions.onHandleFormatCurrentStatement,
      onFormatAll: actions.onHandleFormatCode,
      isFormatSupported,
      isExplainSupported,
    } as any;
  };

  const resolveStatement = (
    view: EditorView
  ): { text: string; from: number; to: number } | null => {
    const activePlugin = toValue(actions.plugin);
    if (activePlugin?.resolveStatement) {
      const rawQueryCtx = getRawQueryContext(view);
      try {
        const result = activePlugin.resolveStatement(view, rawQueryCtx);
        if (result !== undefined) return result;
      } catch {
        // Fallback to resolveCurrentStatements if plugin throws
      }
    }
    return resolveCurrentStatements(view);
  };

  /**
   * Copy the current SQL/dialect statement under the cursor to clipboard.
   */
  const copyStatement = () => {
    const view = actions.getEditorView();
    if (!view) return;

    const result = resolveStatement(view);
    if (!result) return;

    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(result.text);
    }
  };

  /**
   * Copy all content from the editor to clipboard.
   */
  const copyAll = () => {
    const view = actions.getEditorView();
    if (!view) return;

    const allText = view.state?.doc?.toString?.();
    if (
      allText &&
      typeof navigator !== 'undefined' &&
      navigator?.clipboard?.writeText
    ) {
      navigator.clipboard.writeText(allText);
    }
  };

  /**
   * Delete the current statement under the cursor from the editor.
   * Adds the change to undo history so the user can revert with Ctrl+Z.
   */
  const deleteStatement = () => {
    const view = actions.getEditorView();
    if (!view) return;

    const result = resolveStatement(view);
    if (!result) return;

    // Also remove trailing newline/whitespace for clean deletion
    let deleteTo = result.to;
    const docLength = view.state?.doc?.length ?? 0;

    // Extend to consume the trailing newline if present
    while (deleteTo < docLength) {
      const char = view.state?.sliceDoc?.(deleteTo, deleteTo + 1);
      if (char === '\n' || char === '\r') {
        deleteTo++;
        break;
      }
      if (char === ' ' || char === '\t') {
        deleteTo++;
      } else {
        break;
      }
    }

    view.dispatch({
      changes: { from: result.from, to: deleteTo, insert: '' },
      annotations: [Transaction.addToHistory.of(true)],
    });
    view.focus?.();
  };

  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const view = actions.getEditorView();
    if (!view) return [];

    const sel = view.state?.selection?.main ?? {
      from: 0,
      to: 0,
      empty: true,
    };
    const statement = resolveStatement(view);
    const rawQueryCtx = getRawQueryContext(view);

    const selectionText = sel.empty
      ? ''
      : (view.state?.sliceDoc?.(sel.from, sel.to) ??
        view.state?.doc?.sliceString?.(sel.from, sel.to) ??
        '');

    const ctx: RawQueryContextMenuContext = {
      editorView: view,
      statement,
      hasSelection: !sel.empty,
      selectionText,
      dialectState: toValue(actions.context)?.dialectState,
      context: rawQueryCtx,
    };

    const activePlugin = toValue(actions.plugin);
    const effectivePlugin = activePlugin ?? postgresPlugin;

    return buildContextMenuItems(ctx, effectivePlugin, {
      copyStatement,
      copyAll,
      deleteStatement,
    });
  });

  const onContextMenuOpen = (open: boolean) => {
    if (!open) return;

    const view = actions.getEditorView();
    if (!view) {
      hasStatement.value = false;
      hasContent.value = false;
      return;
    }

    hasContent.value = (view.state?.doc?.length ?? 0) > 0;
    hasStatement.value = !!resolveStatement(view);
  };

  return {
    contextMenuItems,
    onContextMenuOpen,
    menuItems: contextMenuItems,
    onOpenMenu: onContextMenuOpen,
    copyStatement,
    copyAll,
    deleteStatement,
    hasStatement,
    hasContent,
  };
}
