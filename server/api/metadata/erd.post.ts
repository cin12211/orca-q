import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  const adapter = await createMetadataAdapter(
    body.type,
    {
      dbConnectionString: body.dbConnectionString,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      providerKind: body.providerKind,
      managedSqlite: body.managedSqlite,
      ssl: body.ssl,
      ssh: body.ssh,
    }
  );

  return await adapter.getErdData();
});
