import { EditorView } from 'codemirror';

export const selectionBaseTheme = EditorView.baseTheme({
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(26, 42, 128, 0.3) !important',
  },
  '&dark .cm-selectionBackground': {
    backgroundColor: 'rgba(255, 255, 255, 0.5) !important;',
  },
  '.cm-selectionLayer': {
    zIndex: '0 !important',
  },
});
