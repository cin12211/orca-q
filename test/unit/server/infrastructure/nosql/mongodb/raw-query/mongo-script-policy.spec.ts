import { describe, expect, it } from 'vitest';
import {
  analyzeMongoScript,
  compileMongoScript,
} from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy';

describe('Mongo raw query script policy', () => {
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
    expect(compiled.sourceMap).toContain('version');
    expect(compiled.analysis.hasReturn).toBe(true);
  });
});
