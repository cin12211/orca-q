import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    type?: DatabaseClientType;
    schema: string;
  }>(event);

  if ((!body.dbConnectionString && !body.host) || !body.schema) {
    throw createError({
      statusCode: 400,
      message: 'Missing (dbConnectionString or host) or schema',
    });
  }

  const adapter = await createFunctionAdapter(
    body.type || DatabaseClientType.POSTGRES,
    {
      dbConnectionString: body.dbConnectionString,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
    }
  );

  return await adapter.getOverviewFunctions(body.schema);
});
