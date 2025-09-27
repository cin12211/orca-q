import { EditorView } from 'codemirror';

export const cursorSmooth = EditorView.theme({
  '.cm-editor': {
    'will-change': 'contents',
    transform: 'translateZ(0)',
  },
  '.cm-content': {
    'font-smoothing': 'antialiased !important',
    transition: 'all 50ms ease !important',
    // animation: 'fadeIn 80ms ease',
  },
  '.cm-cursor': {
    'border-left': '2px solid',
    transition: 'left 50ms ease, top 50ms ease !important',
  },
  '.cm-selectionBackground': {
    background: 'rgba(0, 120, 212, 0.3)',
    transition: 'background-color 120ms ease !important',
  },
});
