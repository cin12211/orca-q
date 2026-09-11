import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import {
  createMongoScriptCompletionSource,
  completionDetails,
} from '~/components/modules/raw-query/mongo/utils/createMongoScriptCompletionSource';

const metadata = { collections: ['users', 'orders'], fieldsByCollection: {} };
const labels = (source: string) => {
  const state = EditorState.create({ doc: source });
  const result = createMongoScriptCompletionSource(metadata as any)(
    new CompletionContext(state, source.length, false)
  );
  return result?.options.map(item => item.label) ?? [];
};

describe('Mongo script completion', () => {
  it('suggests collections inside db.collection()', () => {
    expect(labels(`return db.collection('us`)).toContain('users');
  });

  it('suggests collection methods after a chain', () => {
    expect(labels(`const users = db.collection('users')\nusers.`)).toEqual(
      expect.arrayContaining(['find', 'updateMany', 'aggregate'])
    );
  });

  it('marks write methods as requiring confirmation', async () => {
    expect(
      await completionDetails(`db.collection('users').updateM`, metadata as any)
    ).toContain('Requires confirmation');
  });
});
