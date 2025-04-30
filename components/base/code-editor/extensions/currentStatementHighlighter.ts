import type { Range } from '@codemirror/state';
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  EditorView,
  ViewUpdate,
} from '@codemirror/view';
import { getCurrentStatement } from '../utils';

// 1. Tạo Decoration line
const currentStatementLineHighlight = Decoration.line({
  //TODO: need to move to css

  attributes: {
    class: 'cm-current-statement-line',
  },
});

//TODO: fix this , this plugin is prevent select because this always update dom
// 2. Plugin để highlight
export const currentStatementHighlighter = ViewPlugin.fromClass(
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
      const currentStatement = getCurrentStatement(view);

      if (!currentStatement) return Decoration.none;

      const builder: Range<Decoration>[] = []; // 🔥 Sửa đúng TypeScript ở đây

      // Lấy dòng bắt đầu và dòng kết thúc của statement
      const startLine = view.state.doc.lineAt(currentStatement.from);
      const endLine = view.state.doc.lineAt(currentStatement.to);

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
