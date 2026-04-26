import { defineEventHandler, readBody } from 'h3';
import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import type {
  SchemaDiffRequest,
  SchemaDiffResponse,
} from '~/components/modules/database-tools';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata';
import { computeSchemaDiff } from '~/server/utils/schema-diff.utils';

export default defineEventHandler(
  async (event): Promise<SchemaDiffResponse> => {
    const body: SchemaDiffRequest = await readBody(event);

    const [sourceAdapter, targetAdapter] = await Promise.all([
      createMetadataAdapter(body.source.type || DatabaseClientType.POSTGRES, {
        dbConnectionString: body.source.connectionString ?? '',
        host: body.source.host,
        port: body.source.port,
        username: body.source.username,
        password: body.source.password,
        database: body.source.database,
        ssl: body.source.ssl,
        ssh: body.source.ssh,
      }),
      createMetadataAdapter(body.target.type || DatabaseClientType.POSTGRES, {
        dbConnectionString: body.target.connectionString ?? '',
        host: body.target.host,
        port: body.target.port,
        username: body.target.username,
        password: body.target.password,
        database: body.target.database,
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
      body.safeMode ?? true
    );
  }
);
