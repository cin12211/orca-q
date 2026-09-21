import { describe, expect, it } from 'vitest';
import { compileMongoScript } from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy';
import {
  executeMongoScript,
  type MongoScriptGlobals,
} from '~/server/infrastructure/nosql/mongodb/raw-query/mongo-script-runtime';

describe('Mongo script runtime', () => {
  it('executes compiled content directly with injected globals', async () => {
    const globals: MongoScriptGlobals = {
      db: { name: 'database' },
      params: { limit: 10 },
      ObjectId: 'ObjectId' as never,
      console: {} as Console,
    };

    const result = await executeMongoScript(
      compileMongoScript(
        'return { dbName: db.name, limit: params.limit, objectId: ObjectId }'
      ),
      globals
    );

    expect(result).toEqual({
      dbName: 'database',
      limit: 10,
      objectId: 'ObjectId',
    });
  });
});
