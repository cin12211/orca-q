import type { EditorView } from '@codemirror/view';

export function resolveMongoScriptSource(view: EditorView) {
  const text = view.state.doc.toString();
  return { text, from: 0, to: text.length };
}
