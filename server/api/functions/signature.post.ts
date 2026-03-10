import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createFunctionAdapter } from '~/server/infrastructure/database/adapters/functions';

import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    type?: DatabaseClientType;
    functionId: string;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  }>(event);

  if ((!body.dbConnectionString && !body.host) || !body.functionId) {
    throw createError({
      statusCode: 400,
      message: 'Missing (dbConnectionString or host) or functionId',
    });
  }

  const adapter = await createFunctionAdapter(body.type || DatabaseClientType.POSTGRES, body);

  return await adapter.getFunctionSignature(body.functionId);
});
