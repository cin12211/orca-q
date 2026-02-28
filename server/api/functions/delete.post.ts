import { defineEventHandler, readBody, createError } from 'h3';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString: string;
    schemaName: string;
    functionName: string;
    cascade?: boolean;
  }>(event);

  if (!body.dbConnectionString || !body.schemaName || !body.functionName) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters',
    });
  }

  const adapter = await createFunctionAdapter('postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.deleteFunction(
    body.schemaName,
    body.functionName,
    body.cascade
  );
});
