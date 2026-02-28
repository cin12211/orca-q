import { defineEventHandler, readBody, createError } from 'h3';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString: string;
    functionId: string;
  }>(event);

  if (!body.dbConnectionString || !body.functionId) {
    throw createError({
      statusCode: 400,
      message: 'Missing dbConnectionString or functionId',
    });
  }

  const adapter = await createFunctionAdapter('postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.getFunctionSignature(body.functionId);
});
