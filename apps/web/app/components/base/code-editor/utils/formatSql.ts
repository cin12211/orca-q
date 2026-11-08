import { EditorView, keymap } from '@codemirror/view';
import { format, type FormatOptions } from 'sql-formatter';
import { getCurrentStatement } from '~/components/base/code-editor/utils';

export const formatStatementSql = (
  fileContent: string,
  params?: FormatOptions['params']
): string => {
  try {
    return format(fileContent, {
      language: 'postgresql',
      keywordCase: 'upper',
      linesBetweenQueries: 1,
      functionCase: 'upper',
      newlineBeforeSemicolon: true,
      paramTypes: { named: [':'] },
      params,
    });
  } catch (error) {
    console.error('formatStatementSql error:', error);
    return fileContent;
  }
};

/**
 * Maps a cursor position from old (pre-format) text to new (post-format) text.
 *
 * Core insight: a SQL formatter only mutates whitespace — it never adds,
 * removes, or reorders real tokens. Therefore the N-th non-whitespace character
 * in the old text is the same token as the N-th non-whitespace character in the
 * new text.
 *
 * Algorithm:
 *  1. Count non-whitespace characters in oldText[0..oldPos).
 *  2. Walk newText until we have seen the same count → that index is the
 *     new cursor position (placed just after that character).
 */
export function mapCursorThroughFormat(
  oldText: string,
  newText: string,
  oldPos: number
): number {
  let tokensBefore = 0;
  for (let i = 0; i < oldPos; i++) {
    if (!/\s/.test(oldText[i])) tokensBefore++;
  }

  if (tokensBefore === 0) return 0;

  let seen = 0;
  for (let i = 0; i < newText.length; i++) {
    if (!/\s/.test(newText[i])) {
      seen++;
      if (seen === tokensBefore) return i + 1;
    }
  }

  return newText.length;
}

/**
 * Formats the entire editor document and restores the cursor to the
 * semantically equivalent position using mapCursorThroughFormat.
 *
 * Returns true so it can be used directly as a CodeMirror key handler.
 */
export function handleFormatCode(
  view: EditorView,
  updateFormatOnSave: (fileContent: string) => string
): boolean {
  const oldCode = view.state.doc.toString();
  if (!oldCode) return true;

  const newCode = updateFormatOnSave(oldCode);

  if (newCode === oldCode) {
    view.focus();
    return true;
  }

  const oldCursor = view.state.selection.main.head;
  const newCursor = mapCursorThroughFormat(oldCode, newCode, oldCursor);

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newCode },
    selection: { anchor: newCursor, head: newCursor },
    effects: [EditorView.scrollIntoView(newCursor, { y: 'center' })],
  });

  view.focus();
  return true;
}

/**
 * Walk back from `statementFrom` to the start of its line (after the nearest
 * preceding '\n', or document start). Only trims the horizontal whitespace
 * (spaces / tabs) on the cursor's own line — blank lines above are untouched.
 */
function extendFromToStartOfLine(
  docStr: string,
  statementFrom: number
): number {
  let pos = statementFrom - 1;
  while (pos >= 0 && docStr[pos] !== '\n') {
    pos--;
  }
  // pos === -1 → document start; otherwise pos points at '\n'
  return pos + 1;
}

function formatCurrentStatement(editorView: EditorView): void {
  const currentSelection = editorView.state.selection.main;
  const { currentStatements } = getCurrentStatement(editorView);

  if (!currentStatements.length) return;

  const firstStatement = currentStatements[0];
  const lastStatement = currentStatements[currentStatements.length - 1];

  // statementFrom = actual SQL start (used for cursor mapping)
  const statementFrom = Math.min(firstStatement.from, currentSelection.from);
  const to = Math.max(lastStatement.to, currentSelection.to);

  // from = extended backwards to eat leading blank lines / indentation
  const docStr = editorView.state.doc.toString();
  const from = extendFromToStartOfLine(docStr, statementFrom);

  // Content to format = pure SQL, no leading whitespace
  const sqlContent = editorView.state.doc.sliceString(statementFrom, to);
  const newContent = formatStatementSql(sqlContent);

  // Nothing changed AND no orphan whitespace to clean up
  if (newContent === sqlContent && from === statementFrom) {
    editorView.focus();
    return;
  }

  if (!currentSelection.empty) {
    // Explicit selection → highlight the formatted result
    editorView.dispatch({
      changes: { from, to, insert: newContent },
      selection: { anchor: from, head: from + newContent.length },
      effects: [EditorView.scrollIntoView(from)],
    });
  } else {
    // No selection → map cursor through format relative to sqlContent
    const localCursor = currentSelection.head - statementFrom;
    const newLocalCursor = mapCursorThroughFormat(
      sqlContent,
      newContent,
      localCursor
    );
    const newCursor = from + newLocalCursor;

    editorView.dispatch({
      changes: { from, to, insert: newContent },
      selection: { anchor: newCursor, head: newCursor },
      effects: [
        EditorView.scrollIntoView(newCursor, { y: 'center', x: 'center' }),
      ],
    });
  }

  editorView.focus();
}

export function rawQueryEditorFormat({
  getEditorView,
}: {
  getEditorView: () => EditorView | null;
}) {
  const onHandleFormatCurrentStatement = () => {
    const editorView = getEditorView();
    if (editorView) formatCurrentStatement(editorView);
  };

  const onHandleFormatCode = () => {
    const editorView = getEditorView();
    if (editorView) handleFormatCode(editorView, formatStatementSql);
  };

  return { onHandleFormatCurrentStatement, onHandleFormatCode };
}
