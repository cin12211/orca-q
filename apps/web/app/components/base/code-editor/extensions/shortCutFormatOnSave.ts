import { EditorView, keymap } from '@codemirror/view';
import { handleFormatCode } from '../utils/formatSql';

// ---------------------------------------------------------------------------
// Keymap extension
// ---------------------------------------------------------------------------

/**
 * Creates a Mod-S / Cmd-S shortcut that formats the whole document
 * and keeps the cursor at its semantic position.
 */
export const shortCutFormatOnSave = (
  updateFormatOnSave: (fileContent: string) => string
) =>
  keymap.of([
    {
      key: 'Mod-s',
      mac: 'Cmd-s',
      preventDefault: true,
      run: (view: EditorView) => handleFormatCode(view, updateFormatOnSave),
    },
  ]);
