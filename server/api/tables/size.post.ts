import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

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
    schema: string;
    tableName: string;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  }>(event);

  const adapter = await createTableAdapter(body.type || DatabaseClientType.POSTGRES, body);

  return await adapter.getTableSize(body.schema, body.tableName);
});
