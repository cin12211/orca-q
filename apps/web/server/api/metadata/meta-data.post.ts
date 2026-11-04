import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import type {
  SchemaMetaData,
  DatabaseMetadataRequestParams,
} from '~~/app/core/types';
import { createMetadataAdapter } from '~~/server/infrastructure/database/adapters/metadata';

export default defineEventHandler(async (event): Promise<SchemaMetaData[]> => {
  const body: DatabaseMetadataRequestParams = await readBody(event);

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

  return await adapter.getSchemaMetaData({
    namesOnly: body.namesOnly,
    schemaName: body.schemaName,
  });
});
