import { createError, defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { renameMongoCollection } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface RequestBody extends DatabaseMetadataRequestParams {
  fromName: string;
  toName: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);
  if (!body.fromName || !body.toName || body.toName.startsWith('$')) {
    throw createError({
      statusCode: 400,
      message: 'A valid source and target collection name are required',
    });
  }

  await withMongoDatabase(body, database =>
    renameMongoCollection(database, body.fromName, body.toName)
  );

  return { name: body.toName };
});
