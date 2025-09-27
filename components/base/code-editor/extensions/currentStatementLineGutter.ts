import { EditorView, GutterMarker, gutter } from '@codemirror/view';
import { getCurrentStatement } from '../utils';

export interface SyntaxTreeNodeData {
  type: string;
  from: number;
  to: number;
  text: string;
}

const currentStatementMarker = new (class extends GutterMarker {
  override toDOM() {
    const newDiv = document.createElement('div');
    //TODO: need to move to css
    newDiv.classList.add('line-gutter-statement-line');

    return newDiv;
  }
})();

const currentStatementLineGutter = gutter({
  lineMarker(view, line) {
    const { currentStatements } = getCurrentStatement(view);

    if (!currentStatements.length) return null;

    const from = currentStatements[0].from;
    const to = currentStatements[currentStatements.length - 1].to;

    if (line.from >= from && to >= line.to) {
      return currentStatementMarker;
    }

    return null;
  },
  initialSpacer: () => currentStatementMarker,
});

const currentStatementBaseTheme = EditorView.baseTheme({
  '.line-gutter-statement-line': {
    width: '2px',
    height: '100%',
    backgroundColor: `var(--color-amber-400)`,
  },
  '.cm-gutters': {
    backgroundColor: `unset !important`,
    border: `none !important`,
  },
  '.cm-line': {
    paddingLeft: `4px !important`,
  },
  '.cm-focused': {
    outline: `unset !important`,
  },
  '.cm-activeLine': {
    zIndex: -3,
  },
});

export const currentStatementLineGutterExtension = [
  currentStatementBaseTheme,
  // currentStatementLineGutter,
];
