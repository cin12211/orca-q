import { createError, defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { createMongoCollection } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface RequestBody extends DatabaseMetadataRequestParams {
  name: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);
  if (!body.name || body.name.startsWith('$')) {
    throw createError({
      statusCode: 400,
      message: 'A valid collection name is required',
    });
  }

  await withMongoDatabase(body, database =>
    createMongoCollection(database, body.name)
  );

  return { name: body.name };
});
