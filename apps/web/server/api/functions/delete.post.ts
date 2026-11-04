import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~~/app/core/types';
import { createFunctionAdapter } from '~~/server/infrastructure/database/adapters/functions';

interface RequestBody extends DatabaseMetadataRequestParams {
  schemaName: string;
  functionName: string;
  cascade?: boolean;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  if ((!body.dbConnectionString && !body.host) || !body.schemaName || !body.functionName) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters',
    });
  }

  const adapter = await createFunctionAdapter(
    body.type,
    body
  );

  return await adapter.deleteFunction(
    body.schemaName,
    body.functionName,
    body.cascade
  );
});
