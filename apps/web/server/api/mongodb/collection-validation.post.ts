import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { getMongoCollectionValidation } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface RequestBody extends DatabaseMetadataRequestParams {
  collection: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  const validation = await withMongoDatabase(body, database =>
    getMongoCollectionValidation(database, body.collection)
  );

  return validation;
});
