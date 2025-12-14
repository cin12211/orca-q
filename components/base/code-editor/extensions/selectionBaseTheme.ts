import { EditorView } from 'codemirror';

export const selectionBaseTheme = EditorView.baseTheme({
  '.cm-selectionLayer': {
    pointerEvents: 'none',
    zIndex: '2 !important',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(26, 42, 128, 0.3) !important',
  },
  '&dark .cm-selectionBackground': {
    backgroundColor: 'rgba(255, 255, 255, 0.3) !important;',
  },
});
