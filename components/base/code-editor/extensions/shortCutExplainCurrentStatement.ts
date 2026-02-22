import { EditorView, keymap } from '@codemirror/view';
import { getCurrentStatement } from '../utils';
import type { SyntaxTreeNodeData } from './currentStatementLineGutter';

/**
 * Create a shortcut that explains the current statement on Ctrl-E.
 *
 * This extension creates a shortcut that will explain the current statement
 * when Ctrl-E is pressed. The statement is determined by
 * {@link getCurrentStatement}.
 *
 * @param callback - The callback to call when the shortcut is pressed. It
 * should take the current statement as an argument.
 * @returns A keymap extension that can be added to an editor.
 */
export const shortCutExplainCurrentStatement = (
  callback: (value: { currentStatements: SyntaxTreeNodeData[] }) => void
) =>
  keymap.of([
    {
      key: 'Ctrl-e',
      mac: 'Cmd-e',
      run: (view: EditorView) => {
        const { currentStatements } = getCurrentStatement(view);

        if (currentStatements.length) {
          callback({ currentStatements });
        }

        return true;
      },
      preventDefault: true,
    },
  ]);
