import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { resolveMongoScriptSource } from '~/components/modules/raw-query/mongo/utils/resolveMongoScriptSource';

const view = (source: string, from = 0, to = 0) =>
  ({
    state: Object.assign(EditorState.create({ doc: source }), {
      selection: { main: { from, to } },
    }),
  }) as any;

describe('resolveMongoScriptSource', () => {
  it('uses the full file even when the selection is non-empty', () => {
    expect(
      resolveMongoScriptSource(view('const a = 1\nreturn a', 12, 20))
    ).toEqual({
      text: 'const a = 1\nreturn a',
      from: 0,
      to: 'const a = 1\nreturn a'.length,
    });
  });

  it('uses the full file when there is no selection', () => {
    const source = 'const a = 1\nreturn a';
    expect(resolveMongoScriptSource(view(source))).toEqual({
      text: source,
      from: 0,
      to: source.length,
    });
  });
});
