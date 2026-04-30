import { defineEventHandler, readBody } from 'h3';
import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { QueryResult } from '~/core/types';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';
import { createDatabaseHttpError } from '~/server/infrastructure/database/adapters/shared/error';

export default defineEventHandler(async (event): Promise<QueryResult> => {
  try {
    const body: {
      query: string;
      dbConnectionString: string;
      host?: string;
      port?: string;
      username?: string;
      password?: string;
      database?: string;
      type?: DatabaseClientType;
      providerKind?: EConnectionProviderKind;
      managedSqlite?: IManagedSqliteConfig;
      ssl?: ISSLConfig;
      ssh?: ISSHConfig;
    } = await readBody(event);

    const adapter = await createQueryAdapter(
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
        ssl: body.ssl,
        ssh: body.ssh,
      }
    );

    return await adapter.execute(body.query);
  } catch (error: any) {
    throw createDatabaseHttpError(
      error?.dbType || DatabaseClientType.POSTGRES,
      error
    );
  }
});
