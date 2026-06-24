import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

interface RequestBody extends DatabaseMetadataRequestParams {
  functionId: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  if ((!body.dbConnectionString && !body.host) || !body.functionId) {
    throw createError({
      statusCode: 400,
      message: 'Missing (dbConnectionString or host) or functionId',
    });
  }

  const adapter = await createFunctionAdapter(
    body.type,
    body
  );

  return await adapter.getOneFunction(body.functionId);
});
