import { describe, expect, it, vi } from 'vitest';
import { createMongoSandboxExecution } from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner';
import { compileMongoScript } from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy';

describe('Mongo sandbox runner', () => {
  it('does not expose Node globals', async () => {
    const execution = createMongoSandboxExecution({
      compiled: {
        code: 'async ({ db, params, console }) => typeof process',
        sourceMap: '',
        wrapperLineOffset: 1,
        analysis: {
          wrappedSource: '',
          sourceFile: {} as any,
          operations: [],
          hasReturn: true,
          diagnostics: [],
        },
      },
      params: {},
      timeoutMs: 1_000,
      onRpc: vi.fn(),
      onLog: vi.fn(),
    });

    await expect(execution.result).resolves.toMatchObject({
      kind: 'value',
      value: 'undefined',
    });
  });

  it('returns a cursor descriptor without transferring a native cursor', async () => {
    const execution = createMongoSandboxExecution({
      compiled: compileMongoScript(
        `return db.collection('users').find({}).limit(10)`
      ),
      params: {},
      timeoutMs: 1_000,
      onRpc: vi.fn(),
      onLog: vi.fn(),
    });

    await expect(execution.result).resolves.toMatchObject({ kind: 'cursor' });
  });
});
