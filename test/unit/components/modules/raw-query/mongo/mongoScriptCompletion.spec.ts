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

const contextualLabels = (source: string) => {
  const state = EditorState.create({ doc: source });
  const result = createMongoScriptCompletionSource({
    getMetadata: databaseName =>
      databaseName === 'analytics'
        ? { collections: ['events'], fieldsByCollection: {} }
        : metadata,
    databases: () => ['app', 'analytics'],
  })(new CompletionContext(state, source.length, false));
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

  it('suggests database names inside getSiblingDB', () => {
    expect(contextualLabels("db.getSiblingDB('an")).toContain('analytics');
  });

  it('suggests collections from a sibling database alias', () => {
    expect(
      contextualLabels(
        "const d = db.getSiblingDB('analytics')\nd.collection('ev"
      )
    ).toContain('events');
  });

  it('provides current-system styled metadata for database suggestions', () => {
    const state = EditorState.create({ doc: "db.getSiblingDB('an" });
    const result = createMongoScriptCompletionSource({
      getMetadata: () => metadata as any,
      databases: () => ['app', 'analytics'],
    })(new CompletionContext(state, state.doc.length, false));
    const info = result?.options.find(item => item.label === 'analytics')?.info;

    expect(info).toEqual(expect.any(Function));
  });

  it('provides collection metadata with field details', () => {
    const state = EditorState.create({ doc: "db.collection('us" });
    const result = createMongoScriptCompletionSource({
      getMetadata: () => ({
        collections: ['users'],
        fieldsByCollection: { users: ['_id', 'email', 'createdAt'] },
      }),
      databases: () => [],
    })(new CompletionContext(state, state.doc.length, false));
    const info = result?.options.find(item => item.label === 'users')?.info;

    expect(info).toEqual(expect.any(Function));
  });
});
