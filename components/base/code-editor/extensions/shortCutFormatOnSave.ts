import { EditorView, keymap } from '@codemirror/view';

/**
 * Create a shortcut that formats the current file on save.
 *
 * This extension creates a shortcut that will format the current file
 * when Ctrl-S (or Cmd-S on Mac) is pressed. It calls the provided function
 * with the current file content and then replaces the content with the
 * formatted version.
 *
 * @param updateFormatOnSave - A function that takes a string and returns a
 * formatted string.
 *
 * @returns A keymap extension that can be added to an editor.
 */
export const shortCutFormatOnSave = (
  updateFormatOnSave: (fileContent: string) => string
) =>
  keymap.of([
    {
      key: 'Ctrl-s',
      mac: 'Cmd-s',
      run: (view: EditorView) => {
        // format on save
        const code = view.state.doc.toString();

        if (code) {
          const formattedCode = updateFormatOnSave(code);

          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: formattedCode,
            },
          });
        }

        return true;
      },
      preventDefault: true,
    },
  ]);
