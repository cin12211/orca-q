import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';

import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';

export default defineEventHandler(async event => {
  const body = await readBody<{
    query: string;
    dbConnectionString: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    type?: DatabaseClientType;
    params?: Record<string, unknown>;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  }>(event);

  if (!body.query || (!body.dbConnectionString && !body.host)) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: query and (dbConnectionString or host)',
    });
  }

  const adapter = await createQueryAdapter(body.type || DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
    host: body.host,
    port: body.port,
    username: body.username,
    password: body.password,
    database: body.database,
    ssl: body.ssl,
    ssh: body.ssh,
  });

  return await adapter.rawExecuteStream(event, body.query, body.params);
});
