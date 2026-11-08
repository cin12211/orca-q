import { EditorView, keymap } from '@codemirror/view';

/**
 * Create a keyboard shortcut (Cmd-S / Ctrl-S) that triggers a save callback.
 *
 * This extension allows the user to save the current content by pressing
 * the save shortcut. The callback receives the current editor content.
 *
 * @param onSave - Callback function that receives the current editor content.
 * @returns A keymap extension that can be added to an editor.
 */
export const shortCutSaveFunction = (onSave: (content: string) => void) =>
  keymap.of([
    {
      key: 'Ctrl-s',
      mac: 'Cmd-s',
      run: (view: EditorView) => {
        const content = view.state.doc.toString();
        onSave(content);
        return true;
      },
      preventDefault: true,
    },
  ]);
