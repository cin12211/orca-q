import { defineEventHandler, readBody } from 'h3';
import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createViewAdapter } from '~/server/infrastructure/database/adapters/views';

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
    viewName: string;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  }>(event);

  const adapter = await createViewAdapter(
    body.type || DatabaseClientType.POSTGRES,
    body
  );

  return await adapter.getViewMeta(body.schema, body.viewName);
});
