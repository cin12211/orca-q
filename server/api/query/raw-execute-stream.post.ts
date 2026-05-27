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
  try {
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

    console.log('[raw-execute-stream] Received request body:', JSON.stringify(body, null, 2));

    if (!body.query || !hasConnectionTarget(body)) {
      console.error('[raw-execute-stream] Validation failed: missing query or connection target');
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: query and a valid connection target',
      });
    }

    console.log('[raw-execute-stream] Creating query adapter for type:', body.type);
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

    console.log('[raw-execute-stream] Executing query on adapter...');
    const result = await adapter.rawExecuteStream(event, body.query, body.params);
    console.log('[raw-execute-stream] Execution done.');
    return result;
  } catch (error: any) {
    console.error('[raw-execute-stream] Error during execution:', error);
    throw error;
  }
});
