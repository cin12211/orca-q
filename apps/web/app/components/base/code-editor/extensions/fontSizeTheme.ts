import { EditorView } from 'codemirror';

export const fontSizeTheme = (size: string) =>
  EditorView.theme({
    '.cm-content, .cm-gutters, .cm-scroller': {
      fontSize: size,
    },
  });
