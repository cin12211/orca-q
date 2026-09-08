import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { listMongoDatabases } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoClient } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  const databases = await withMongoClient(body, client =>
    listMongoDatabases(client)
  );

  return { databases };
});
