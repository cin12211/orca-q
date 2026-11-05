import { setDiagnostics, type Diagnostic } from '@codemirror/lint';
import type { EditorView } from 'codemirror';

export function pushDiagnostics(view: EditorView, diagnostics: Diagnostic[]) {
  view.dispatch(setDiagnostics(view.state, diagnostics));
}
