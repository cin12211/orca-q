import type { EditorView } from '@codemirror/view';

export function resolveMongoScriptSource(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const text = view.state.sliceDoc(from, to);
  if (from !== to) return { text, from, to };
  const source = view.state.doc.toString();
  return { text: source, from: 0, to: source.length };
}
