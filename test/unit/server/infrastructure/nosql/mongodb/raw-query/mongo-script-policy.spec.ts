import { describe, expect, it } from 'vitest';
import {
  analyzeMongoScript,
  compileMongoScript,
} from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy';
import { typeScriptCompiler } from '~/server/utils/load-typescript';

describe('Mongo raw query script policy', () => {
  it('loads the TypeScript compiler through the Node CommonJS boundary', () => {
    expect(typeScriptCompiler.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(() =>
      typeScriptCompiler.createSourceFile(
        'mongo-raw-query.ts',
        'return db.collection("users").find({})',
        typeScriptCompiler.ScriptTarget.ES2022,
        true,
        typeScriptCompiler.ScriptKind.TS
      )
    ).not.toThrow();
  });

  it('classifies a collection update before execution', () => {
    const analysis = analyzeMongoScript(`
      return db.collection('users').updateMany({}, { $set: { active: true } })
    `);

    expect(analysis.operations).toEqual([
      expect.objectContaining({
        target: 'collection',
        collection: 'users',
        method: 'updateMany',
        risk: 'write',
      }),
    ]);
  });

  it('classifies writes through a collection alias', () => {
    const analysis = analyzeMongoScript(`
      const users = db.collection('users');
      return users.updateMany({}, { $set: { active: true } });
    `);

    expect(analysis.operations).toEqual([
      expect.objectContaining({ method: 'updateMany', collection: 'users' }),
    ]);
  });

  it('classifies a write against the database selected in the script', () => {
    const analysis = analyzeMongoScript(`
      return db.getSiblingDB('analytics').collection('users').updateMany(
        {},
        { $set: { active: true } }
      )
    `);

    expect(analysis.operations).toEqual([
      expect.objectContaining({
        target: 'collection',
        database: 'analytics',
        dynamicDatabase: false,
        collection: 'users',
        method: 'updateMany',
      }),
    ]);
  });

  it('classifies writes through a database alias selected in the script', () => {
    const analysis = analyzeMongoScript(`
      const analytics = db.getSiblingDB('analytics');
      return analytics.collection('users').updateMany(
        {},
        { $set: { active: true } }
      )
    `);

    expect(analysis.operations).toEqual([
      expect.objectContaining({
        database: 'analytics',
        dynamicDatabase: false,
        collection: 'users',
        method: 'updateMany',
      }),
    ]);
  });

  it.each([
    `import fs from 'node:fs'`,
    `return require('node:fs')`,
    `return import('node:fs')`,
    `return eval('1 + 1')`,
    `return Function('return process')()`,
    `return db.collection('users')['deleteMany']({})`,
  ])('rejects forbidden source: %s', source => {
    expect(() => analyzeMongoScript(source)).toThrow();
  });

  it('treats aggregation $merge as a write', () => {
    expect(
      analyzeMongoScript(
        `return db.collection('users').aggregate([{ $merge: 'archive' }])`
      ).operations
    ).toEqual([expect.objectContaining({ method: 'aggregate:$merge' })]);
  });

  it('classifies aggregation $out separately from $merge', () => {
    expect(
      analyzeMongoScript(
        `return db.collection('users').aggregate([{ $out: 'archive' }])`
      ).operations
    ).toEqual([expect.objectContaining({ method: 'aggregate:$out' })]);
  });

  it('redacts and bounds operation summaries', () => {
    const analysis = analyzeMongoScript(`
      return db.collection('users').updateOne(
        { email: 'ada@example.com' },
        { $set: { accessToken: 'super-secret' } }
      )
    `);

    expect(analysis.operations[0]?.summary).not.toContain('super-secret');
    expect(analysis.operations[0]?.summary.length).toBeLessThanOrEqual(2_000);
  });

  it('compiles TypeScript and reports a reachable return', () => {
    const compiled = compileMongoScript(
      `const limit: number = 5\nreturn db.collection('users').find({}).limit(limit)`
    );

    expect(compiled.code).toContain('async');
    expect(compiled.analysis.hasReturn).toBe(true);
  });
});
