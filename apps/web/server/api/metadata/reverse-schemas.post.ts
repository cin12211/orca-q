import { DatabaseClientType } from '#shared/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '#shared/types';
import { defineEventHandler, readBody } from 'h3';
import { createMetadataAdapter } from '~~/server/infrastructure/database/adapters/metadata';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  const adapter = await createMetadataAdapter(body.type, {
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
  });

  const result = await adapter.getReverseSchemas();
  return { result };
});
