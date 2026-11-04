import {
  CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import type { SQLDialect } from '@codemirror/lang-sql';
import { sql } from '@codemirror/lang-sql';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

/**
 * Creates an EditorState from a string with a cursor position marker (!).
 * Returns the state and the cursor position.
 */
export function createTestState(
  contentWithCursor: string,
  dialect: SQLDialect,
  extensions: any[] = []
) {
  const cursor = contentWithCursor.indexOf('!');
  const content =
    cursor > -1
      ? contentWithCursor.slice(0, cursor) + contentWithCursor.slice(cursor + 1)
      : contentWithCursor;

  const pos = cursor > -1 ? cursor : content.length;

  const state = EditorState.create({
    doc: content,
    extensions: [sql({ dialect }), ...extensions],
    selection: { anchor: pos },
  });

  // Ensure tree is built
  ensureSyntaxTree(state, content.length, 5000);

  return { state, pos };
}

/**
 * Runs a completion source and returns the result.
 */
export async function getCompletionResult(
  state: EditorState,
  pos: number,
  source: CompletionSource,
  explicit = true
): Promise<CompletionResult | null> {
  const context = new CompletionContext(state, pos, explicit);
  const result = await source(context);
  return result as CompletionResult | null;
}

/**
 * Helper to check if a completion option exists
 */
export function hasOption(
  result: CompletionResult | null,
  label: string
): boolean {
  if (!result) return false;
  return result.options.some(opt => opt.label === label);
}

/**
 * Helper to get a specific completion option by label
 */
export function getOption(result: CompletionResult | null, label: string) {
  if (!result) return null;
  return result.options.find(opt => opt.label === label) || null;
}
