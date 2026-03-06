import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';

export default defineEventHandler(async event => {
  const body = await readBody<{
    query: string;
    dbConnectionString: string;
    params?: Record<string, unknown>;
  }>(event);

  if (!body.query || !body.dbConnectionString) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: query, dbConnectionString',
    });
  }

  const adapter = await createQueryAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.rawExecuteStream(event, body.query, body.params);
});
