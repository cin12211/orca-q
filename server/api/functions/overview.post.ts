import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<{ dbConnectionString: string; schema: string }>(
    event
  );

  if (!body.dbConnectionString || !body.schema) {
    throw createError({
      statusCode: 400,
      message: 'Missing dbConnectionString or schema',
    });
  }

  const adapter = await createFunctionAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.getOverviewFunctions(body.schema);
});
