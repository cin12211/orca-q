import type { DatabaseMetadataRequestParams } from '#shared/types/database-schemas.types';
import { defineEventHandler, readBody } from 'h3';
import { getMongoDatabaseStats } from '~~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  const stats = await withMongoDatabase(body, database =>
    getMongoDatabaseStats(database)
  );

  return stats;
});
