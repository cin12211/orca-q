/**
 * @vitest-environment happy-dom
 */
import { CompletionContext } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
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

  it('suggests collection methods when typing after dot (e.g. users.f)', () => {
    expect(labels(`const users = db.collection('users')\nusers.f`)).toEqual(
      expect.arrayContaining(['find', 'findOne'])
    );
  });

  it('suggests collections and database methods after db.', () => {
    const options = labels('db.');
    expect(options).toContain('users');
    expect(options).toContain('orders');
    expect(options).toContain('collection');
    expect(options).toContain('getSiblingDB');
  });

  it('suggests filtered collection when typing after db.', () => {
    expect(labels('db.u')).toContain('users');
    expect(labels('db.u')).not.toContain('orders');
  });

  it('sets correct completion types matching CompletionIcon', () => {
    const state = EditorState.create({ doc: "db.getSiblingDB('an" });
    const result = createMongoScriptCompletionSource({
      getMetadata: () => metadata as any,
      databases: () => ['app', 'analytics'],
    })(new CompletionContext(state, state.doc.length, false));
    const dbOption = result?.options.find(item => item.label === 'analytics');
    expect(dbOption?.type).toBe('DATABASE');

    const colState = EditorState.create({ doc: "db.collection('us" });
    const colResult = createMongoScriptCompletionSource(metadata as any)(
      new CompletionContext(colState, colState.doc.length, false)
    );
    const colOption = colResult?.options.find(item => item.label === 'users');
    expect(colOption?.type).toBe('TABLE');
  });

  it('renders structured tooltip element for collection suggestions matching current system', () => {
    const state = EditorState.create({ doc: "db.collection('us" });
    const result = createMongoScriptCompletionSource({
      getMetadata: () => ({
        collections: ['users'],
        fieldsByCollection: { users: ['_id', 'email', 'createdAt'] },
      }),
      databases: () => [],
    })(new CompletionContext(state, state.doc.length, false));
    const infoFn = result?.options.find(item => item.label === 'users')?.info;
    const element = (infoFn as Function)() as HTMLElement;

    expect(element.className).toContain('min-w-[20rem]');
    expect(element.textContent).toContain('users');
    expect(element.textContent).toContain('Fields: 3');
    expect(element.textContent).toContain('_id: ObjectId');
    expect(element.textContent).toContain('email: field');
  });

  it('renders structured tooltip element for database suggestions matching current system', () => {
    const state = EditorState.create({ doc: "db.getSiblingDB('an" });
    const result = createMongoScriptCompletionSource({
      getMetadata: () => metadata as any,
      databases: () => ['analytics'],
    })(new CompletionContext(state, state.doc.length, false));
    const infoFn = result?.options.find(
      item => item.label === 'analytics'
    )?.info;
    const element = (infoFn as Function)() as HTMLElement;

    expect(element.className).toContain('min-w-[20rem]');
    expect(element.textContent).toContain('analytics (database)');
    expect(element.textContent).toContain(
      "Usage: db.getSiblingDB('analytics')"
    );
  });

  it('suggests variables when typing : or params.', () => {
    const state = EditorState.create({ doc: 'return :' });
    const result = createMongoScriptCompletionSource({
      getMetadata: () => metadata as any,
      databases: () => [],
      fileVariables: () => JSON.stringify({ userId: '123', status: 'active' }),
    })(new CompletionContext(state, state.doc.length, false));

    const varOptions = result?.options.map(o => o.label) ?? [];
    expect(varOptions).toContain(':userId');
    expect(varOptions).toContain(':status');

    const paramsState = EditorState.create({ doc: 'return params.' });
    const paramsResult = createMongoScriptCompletionSource({
      getMetadata: () => metadata as any,
      databases: () => [],
      fileVariables: () => JSON.stringify({ userId: '123', status: 'active' }),
    })(new CompletionContext(paramsState, paramsState.doc.length, false));

    const paramsOptions = paramsResult?.options.map(o => o.label) ?? [];
    expect(paramsOptions).toContain('userId');
    expect(paramsOptions).toContain('status');
  });

  it('suggests basic JS syntax keywords like return, const, let, await', () => {
    expect(labels('ret')).toContain('return');
    expect(labels('con')).toContain('const');
    expect(labels('let')).toContain('let');
    expect(labels('awai')).toContain('await');
    expect(labels('asyn')).toContain('async');
    expect(labels('fun')).toContain('function');
    expect(labels('for')).toContain('for');
    expect(labels('try')).toContain('try');
  });

  it('sets keyword type and proper tooltip for JS keywords', () => {
    const state = EditorState.create({ doc: 'ret' });
    const result = createMongoScriptCompletionSource(metadata as any)(
      new CompletionContext(state, state.doc.length, false)
    );
    const returnOption = result?.options.find(item => item.label === 'return');
    expect(returnOption?.type).toBe('KEYWORD');
    expect(returnOption?.boost).toBe(95);

    const infoFn = returnOption?.info;
    const element = (infoFn as Function)() as HTMLElement;
    expect(element.textContent).toContain('return (keyword)');
    expect(element.textContent).toContain(
      'Syntax: return <expression>; // output results'
    );
    // Ensure it does not have misleading MongoDB doc link
    expect(element.textContent).not.toContain('Open MongoDB docs');
  });

  it('suggests console methods after console. and does not suggest collection methods', () => {
    const options = labels('console.');
    expect(options).toContain('log');
    expect(options).toContain('info');
    expect(options).toContain('warn');
    expect(options).toContain('error');
    expect(options).toContain('table');
    expect(options).not.toContain('aggregate');
    expect(options).not.toContain('find');
    expect(options).not.toContain('countDocuments');
    expect(options).not.toContain('deleteMany');
  });

  it('suggests filtered console method when typing after console. (e.g. console.l)', () => {
    const options = labels('console.l');
    expect(options).toContain('log');
    expect(options).not.toContain('warn');
    expect(options).not.toContain('aggregate');
  });

  it('does not link to MongoDB docs in console suggestion tooltip', () => {
    const state = EditorState.create({ doc: 'console.' });
    const result = createMongoScriptCompletionSource(metadata as any)(
      new CompletionContext(state, state.doc.length, false)
    );
    const logOption = result?.options.find(item => item.label === 'log');
    expect(logOption?.type).toBe('METHOD');
    const infoFn = logOption?.info;
    const element = (infoFn as Function)() as HTMLElement;
    expect(element.textContent).toContain('log (method)');
    expect(element.textContent).toContain(
      'Signature: (...data: any[]) => void'
    );
    expect(element.textContent).not.toContain('Open MongoDB docs');
  });

  it('suggests database methods and collections for siblingDB alias without suggesting collection methods', () => {
    const source =
      "const sissDB  = db.getSiblingDB('smartos_identity_service_staging');\nsissDB.";
    const state = EditorState.create({ doc: source });
    const result = createMongoScriptCompletionSource({
      getMetadata: dbName =>
        dbName === 'smartos_identity_service_staging'
          ? { collections: ['accounts', 'tokens'], fieldsByCollection: {} }
          : metadata,
      databases: () => ['app', 'smartos_identity_service_staging'],
    })(new CompletionContext(state, source.length, false));

    const options = result?.options.map(item => item.label) ?? [];
    // Collections of sibling DB
    expect(options).toContain('accounts');
    expect(options).toContain('tokens');
    // Database methods
    expect(options).toContain('collection');
    expect(options).toContain('command');
    expect(options).toContain('getSiblingDB');
    expect(options).toContain('listCollections');
    // Must NOT suggest collection methods!
    expect(options).not.toContain('aggregate');
    expect(options).not.toContain('find');
    expect(options).not.toContain('countDocuments');
    expect(options).not.toContain('deleteMany');
    expect(options).not.toContain('insertOne');
  });

  it('suggests database methods and collections when user types const sissDB.', () => {
    const source =
      "const sissDB  = db.getSiblingDB('smartos_identity_service_staging');\nconst sissDB.";
    const state = EditorState.create({ doc: source });
    const result = createMongoScriptCompletionSource({
      getMetadata: dbName =>
        dbName === 'smartos_identity_service_staging'
          ? { collections: ['accounts', 'tokens'], fieldsByCollection: {} }
          : metadata,
      databases: () => ['app', 'smartos_identity_service_staging'],
    })(new CompletionContext(state, source.length, false));

    const options = result?.options.map(item => item.label) ?? [];
    expect(options).toContain('accounts');
    expect(options).toContain('collection');
    expect(options).not.toContain('aggregate');
    expect(options).not.toContain('find');
  });

  it('suggests collection methods after accessing collection on sibling DB (sissDB.accounts.)', () => {
    const source =
      "const sissDB  = db.getSiblingDB('smartos_identity_service_staging');\nsissDB.accounts.";
    const state = EditorState.create({ doc: source });
    const result = createMongoScriptCompletionSource({
      getMetadata: dbName =>
        dbName === 'smartos_identity_service_staging'
          ? { collections: ['accounts'], fieldsByCollection: {} }
          : metadata,
      databases: () => ['smartos_identity_service_staging'],
    })(new CompletionContext(state, source.length, false));

    const options = result?.options.map(item => item.label) ?? [];
    expect(options).toContain('find');
    expect(options).toContain('findOne');
    expect(options).toContain('aggregate');
    expect(options).toContain('countDocuments');
  });

  it('suggests cursor methods when chaining after find()', () => {
    const options = labels('db.users.find().');
    expect(options).toContain('toArray');
    expect(options).toContain('sort');
    expect(options).toContain('limit');
    expect(options).toContain('skip');
    expect(options).toContain('project');
  });

  it('does not suggest collection methods on unknown objects', () => {
    const options = labels('const res = await fetch();\nres.');
    expect(options).toEqual([]);
  });

  it('suggests local variables from JavaScript AST scope', () => {
    const source = 'const myLocalScore = 100;\nmy';
    const state = EditorState.create({
      doc: source,
      extensions: [javascript()],
    });
    const result = createMongoScriptCompletionSource(metadata as any)(
      new CompletionContext(state, source.length, false)
    );
    const options = result?.options.map(item => item.label) ?? [];
    expect(options).toContain('myLocalScore');
    const myLocalOption = result?.options.find(
      item => item.label === 'myLocalScore'
    );
    expect(myLocalOption?.type).toBe('VARIABLE');
  });

  it('does not suggest uninitialized database or collection at top level', () => {
    const options = labels('col');
    expect(options).not.toContain('collection');

    const dbOptions = labels('data');
    expect(dbOptions).not.toContain('database');
  });

  it('suggests database and collection only when declared in script', () => {
    const options = labels(
      "const database = db.getSiblingDB('analytics');\nconst collection = database.collection('events');\ncol"
    );
    expect(options).toContain('collection');
  });
});
