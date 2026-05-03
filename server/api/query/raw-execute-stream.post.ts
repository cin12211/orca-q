import { defineEventHandler, readBody, createError } from 'h3';
import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';

function hasConnectionTarget(body: {
  dbConnectionString?: string;
  host?: string;
  filePath?: string;
  managedSqlite?: IManagedSqliteConfig;
}) {
  return Boolean(
    body.dbConnectionString || body.host || body.filePath || body.managedSqlite
  );
}

export default defineEventHandler(async event => {
  const body = await readBody<{
    query: string;
    dbConnectionString: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    serviceName?: string;
    filePath?: string;
    type?: DatabaseClientType;
    providerKind?: EConnectionProviderKind;
    managedSqlite?: IManagedSqliteConfig;
    params?: Record<string, unknown>;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  }>(event);

  if (!body.query || !hasConnectionTarget(body)) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: query and a valid connection target',
    });
  }

  const adapter = await createQueryAdapter(
    body.type || DatabaseClientType.POSTGRES,
    {
      dbConnectionString: body.dbConnectionString,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      serviceName: body.serviceName,
      filePath: body.filePath,
      providerKind: body.providerKind,
      managedSqlite: body.managedSqlite,
      ssl: body.ssl,
      ssh: body.ssh,
    }
  );

  return await adapter.rawExecuteStream(event, body.query, body.params);
});
