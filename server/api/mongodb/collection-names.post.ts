import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import {
  getMongoDatabaseTotalSize,
  listMongoCollectionNames,
} from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  const result = await withMongoDatabase(body, async database => {
    const [collections, totalSize] = await Promise.all([
      listMongoCollectionNames(database),
      getMongoDatabaseTotalSize(database),
    ]);
    return { collections, totalSize };
  });

  return result;
});
