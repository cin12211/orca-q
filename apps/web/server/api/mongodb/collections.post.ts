import type { DatabaseMetadataRequestParams } from '#shared/types/database-schemas.types';
import { defineEventHandler, readBody } from 'h3';
import { listMongoCollections } from '~~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  const collections = await withMongoDatabase(body, database =>
    listMongoCollections(database)
  );

  return { collections };
});
