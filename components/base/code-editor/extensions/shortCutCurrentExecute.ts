import { EditorView, keymap } from '@codemirror/view';
import { getCurrentStatement } from '../utils';
import type { SyntaxTreeNodeData } from './currentStatementLineGutter';

/**
 * Create a shortcut that executes the current statement on Ctrl-Enter.
 *
 * This extension creates a shortcut that will execute the current statement
 * when Ctrl-Enter is pressed. The statement is determined by
 * {@link getCurrentStatement}.
 *
 * @param callback - The callback to call when the shortcut is pressed. It
 * should take the current statement as an argument.
 * @returns A keymap extension that can be added to an editor.
 */
export const shortCutCurrentStatementExecute = (
  callback: (currentStatement: SyntaxTreeNodeData) => void
) =>
  keymap.of([
    {
      key: 'Ctrl-Enter',
      mac: 'Cmd-Enter',
      run: (view: EditorView) => {
        const currentStatement = getCurrentStatement(view);

        if (currentStatement) {
          callback(currentStatement);
        }

        return true;
      },
      preventDefault: true,
    },
  ]);
