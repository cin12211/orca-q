import { Transaction } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { getCurrentStatement } from '~/components/base/code-editor/utils';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';

interface EditorContextMenuActions {
  onExecuteCurrent: () => void;
  onExplainAnalyzeCurrent: () => void;
  onHandleFormatCurrentStatement: () => void;
  onHandleFormatCode: () => void;
  isSupportFormat?: Ref<boolean>;
  isExplainSupported?: Ref<boolean>;
  // Accepts any EditorView-like object (including readonly refs)
  getEditorView: () => EditorView | null | undefined;
}

/**
 * Resolves the current SQL statement(s) under the cursor.
 * Returns the combined text and the full range (from..to).
 */
const resolveCurrentStatements = (
  view: EditorView
): { text: string; from: number; to: number } | null => {
  const { currentStatements } = getCurrentStatement(view);
  if (!currentStatements.length) return null;

  const from = Math.min(...currentStatements.map(s => s.from));
  const to = Math.max(...currentStatements.map(s => s.to));
  const text = currentStatements.map(s => s.text).join('\n');

  return { text, from, to };
};

export function useRawQueryEditorContextMenu(
  actions: EditorContextMenuActions
) {
  // Validation state — updated each time context menu opens
  const hasStatement = ref(false);
  const hasContent = ref(false);
  /**
   * Copy the current SQL statement(s) under the cursor to clipboard.
   */
  const copyStatement = () => {
    const view = actions.getEditorView();
    if (!view) return;

    const result = resolveCurrentStatements(view);
    if (!result) return;

    navigator.clipboard.writeText(result.text);
  };

  /**
   * Copy all content from the editor to clipboard.
   */
  const copyAll = () => {
    const view = actions.getEditorView();
    if (!view) return;

    const allText = view.state.doc.toString();
    if (allText) {
      navigator.clipboard.writeText(allText);
    }
  };

  /**
   * Delete the current SQL statement(s) under the cursor from the editor.
   * Adds the change to undo history so the user can revert with Ctrl+Z.
   */
  const deleteStatement = () => {
    const view = actions.getEditorView();
    if (!view) return;

    const result = resolveCurrentStatements(view);
    if (!result) return;

    // Also remove trailing newline/semicolon whitespace for clean deletion
    let deleteTo = result.to;
    const docLength = view.state.doc.length;

    // Extend to consume the trailing newline if present
    while (deleteTo < docLength) {
      const char = view.state.sliceDoc(deleteTo, deleteTo + 1);
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
    view.focus();
  };

  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const noStatement = !hasStatement.value;
    const noContent = !hasContent.value;

    return [
      {
        type: ContextMenuItemType.ACTION,
        title: 'Execute',
        icon: 'hugeicons:play',
        shortcut: '⌘↵',
        select: actions.onExecuteCurrent,
        disabled: noStatement,
      },
      ...(actions.isExplainSupported?.value
        ? [
            {
              type: ContextMenuItemType.ACTION,
              title: 'Analyze Query',
              icon: 'hugeicons:analytics-01',
              shortcut: '⌘E',
              select: actions.onExplainAnalyzeCurrent,
              disabled: noStatement,
            } satisfies ContextMenuItem,
          ]
        : []),
      { type: ContextMenuItemType.SEPARATOR },
      ...(actions.isSupportFormat?.value
        ? [
            {
              type: ContextMenuItemType.ACTION,
              title: 'Format Current',
              icon: 'hugeicons:magic-wand-01',
              shortcut: '⌘S',
              select: actions.onHandleFormatCurrentStatement,
              disabled: noStatement,
            } satisfies ContextMenuItem,
            {
              type: ContextMenuItemType.ACTION,
              title: 'Format All',
              icon: 'hugeicons:text-align-left',
              shortcut: '⇧⌥F',
              select: actions.onHandleFormatCode,
              disabled: noContent,
            } satisfies ContextMenuItem,
          ]
        : []),
      { type: ContextMenuItemType.SEPARATOR },
      {
        type: ContextMenuItemType.ACTION,
        title: 'Copy Statement',
        icon: 'hugeicons:copy-02',
        select: copyStatement,
        disabled: noStatement,
      },
      {
        type: ContextMenuItemType.ACTION,
        title: 'Copy All',
        icon: 'hugeicons:copy-01',
        select: copyAll,
        disabled: noContent,
      },
      { type: ContextMenuItemType.SEPARATOR },
      {
        type: ContextMenuItemType.ACTION,
        title: 'Delete Statement',
        icon: 'hugeicons:delete-02',
        select: deleteStatement,
        disabled: noStatement,
      },
    ];
  });

  const onContextMenuOpen = (open: boolean) => {
    if (!open) return;

    const view = actions.getEditorView();
    if (!view) {
      hasStatement.value = false;
      hasContent.value = false;
      return;
    }

    hasContent.value = view.state.doc.length > 0;
    hasStatement.value = !!resolveCurrentStatements(view);
  };

  return {
    contextMenuItems,
    onContextMenuOpen,
  };
}
