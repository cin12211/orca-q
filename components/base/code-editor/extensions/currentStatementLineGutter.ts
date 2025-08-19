import { GutterMarker, gutter } from '@codemirror/view';
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

export const currentStatementLineGutter = gutter({
  lineMarker(view, line) {
    const { currentStatement } = getCurrentStatement(view);

    if (
      currentStatement &&
      line.from >= currentStatement.from &&
      currentStatement.to >= line.to
    ) {
      return currentStatementMarker;
    }

    return null;
  },
  initialSpacer: () => currentStatementMarker,
});
