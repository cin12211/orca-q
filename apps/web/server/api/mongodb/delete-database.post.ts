import { createError, defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { dropMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);
  if (!body.database) {
    throw createError({
      statusCode: 400,
      message: 'A database is required',
    });
  }

  await withMongoDatabase(body, database => dropMongoDatabase(database));

  return { database: body.database };
});
