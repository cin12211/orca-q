import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~~/app/core/types';
import { createFunctionAdapter } from '~~/server/infrastructure/database/adapters/functions';

interface RequestBody extends DatabaseMetadataRequestParams {
  schema: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  if (
    (!body.dbConnectionString && !body.host && !body.filePath) ||
    !body.schema
  ) {
    throw createError({
      statusCode: 400,
      message: 'Missing (dbConnectionString or host) or schema',
    });
  }

  const adapter = await createFunctionAdapter(body.type, body);

  return await adapter.getOverviewFunctions(body.schema);
});
