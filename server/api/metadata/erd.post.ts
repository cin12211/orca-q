import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { createMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata';

export default defineEventHandler(async event => {
  const body = await readBody<{
    dbConnectionString: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    type?: DatabaseClientType;
    providerKind?: EConnectionProviderKind;
    managedSqlite?: IManagedSqliteConfig;
  }>(event);

  const adapter = await createMetadataAdapter(
    body.type || DatabaseClientType.POSTGRES,
    {
      dbConnectionString: body.dbConnectionString,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      providerKind: body.providerKind,
      managedSqlite: body.managedSqlite,
    }
  );

  return await adapter.getErdData();
});
