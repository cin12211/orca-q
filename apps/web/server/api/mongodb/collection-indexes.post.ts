import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { getMongoCollectionIndexes } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface RequestBody extends DatabaseMetadataRequestParams {
  collection: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  const indexes = await withMongoDatabase(body, database =>
    getMongoCollectionIndexes(database, body.collection)
  );

  return { indexes };
});
