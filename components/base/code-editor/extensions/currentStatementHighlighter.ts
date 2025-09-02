import type { Range } from '@codemirror/state';
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  EditorView,
  ViewUpdate,
} from '@codemirror/view';
import { getCurrentStatement } from '../utils';

const currentStatementLineHighlightBaseTheme = EditorView.baseTheme({
  '.cm-current-statement-line': {
    backgroundColor: `rgb(59, 56, 160, 0.05) !important`,
  },
});

// 1. Tạo Decoration line
const currentStatementLineHighlight = Decoration.line({
  //TODO: need to move to css

  attributes: {
    class: 'cm-current-statement-line',
  },
});

//TODO: fix this , this plugin is prevent select because this always update dom
// 2. Plugin để highlight
const currentStatementHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.getDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = this.getDecorations(update.view);
      }
    }

    getDecorations(view: EditorView): DecorationSet {
      const { currentStatements } = getCurrentStatement(view);

      if (!currentStatements.length) return Decoration.none;

      const from = currentStatements[0].from;
      const to = currentStatements[currentStatements.length - 1].to;

      const builder: Range<Decoration>[] = []; // 🔥 Sửa đúng TypeScript ở đây

      // Lấy dòng bắt đầu và dòng kết thúc của statement
      const startLine = view.state.doc.lineAt(from);
      const endLine = view.state.doc.lineAt(to);

      for (let lineNo = startLine.number; lineNo <= endLine.number; lineNo++) {
        const line = view.state.doc.line(lineNo);
        builder.push(currentStatementLineHighlight.range(line.from));
      }

      return Decoration.set(builder);
    }
  },
  {
    decorations: v => v.decorations,
  }
);

export const currentStatementLineHighlightExtension = [
  currentStatementHighlighter,
  currentStatementLineHighlightBaseTheme,
];
