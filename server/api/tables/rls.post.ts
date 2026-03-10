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
    table: string;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  }>(event);

  const adapter = await createTableAdapter(body.type || DatabaseClientType.POSTGRES, body);

  const [status, policies] = await Promise.all([
    adapter.getTableRlsStatus(body.schema, body.table),
    adapter.getTableRlsPolicies(body.schema, body.table),
  ]);

  return { ...status, policies };
});
