import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { SchemaMetaData } from '~/core/types';
import { createMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata';

import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';

interface RequestBody {
  dbConnectionString: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  type?: DatabaseClientType;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}

export default defineEventHandler(async (event): Promise<SchemaMetaData[]> => {
  const body: RequestBody = await readBody(event);

  const adapter = await createMetadataAdapter(body.type || DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
    host: body.host,
    port: body.port,
    username: body.username,
    password: body.password,
    database: body.database,
    ssl: body.ssl,
    ssh: body.ssh,
  });

  return await adapter.getSchemaMetaData();
});
