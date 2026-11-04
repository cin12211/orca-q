import { DatabaseClientType } from '#shared/constants/database-client-type';
import type {
  ISSLConfig,
  ISSHConfig,
} from '#shared/types/entities/connection.entity';
import type {
  SchemaDiffRequest,
  SchemaDiffResponse,
} from '#shared/types/schema-diff.types';
import { defineEventHandler, readBody } from 'h3';
import { createMetadataAdapter } from '~~/server/infrastructure/database/adapters/metadata';
import { computeSchemaDiff } from '~~/server/utils/schema-diff.utils';

export default defineEventHandler(
  async (event): Promise<SchemaDiffResponse> => {
    const body: SchemaDiffRequest = await readBody(event);

    const [sourceAdapter, targetAdapter] = await Promise.all([
      createMetadataAdapter(body.source.type, {
        dbConnectionString: body.source.connectionString ?? '',
        host: body.source.host,
        port: body.source.port,
        username: body.source.username,
        password: body.source.password,
        database: body.source.database,
        serviceName: body.source.serviceName,
        filePath: body.source.filePath,
        ssl: body.source.ssl,
        ssh: body.source.ssh,
      }),
      createMetadataAdapter(body.target.type, {
        dbConnectionString: body.target.connectionString ?? '',
        host: body.target.host,
        port: body.target.port,
        username: body.target.username,
        password: body.target.password,
        database: body.target.database,
        serviceName: body.target.serviceName,
        filePath: body.target.filePath,
        ssl: body.target.ssl,
        ssh: body.target.ssh,
      }),
    ]);

    const [sourceSchemas, targetSchemas] = await Promise.all([
      sourceAdapter.getSchemaMetaData(),
      targetAdapter.getSchemaMetaData(),
    ]);

    return computeSchemaDiff(
      sourceSchemas,
      targetSchemas,
      body.safeMode ?? true,
      body.target.type
    );
  }
);
