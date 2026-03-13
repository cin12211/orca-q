import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { RawQueryResultWithMetadata } from '~/core/types';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';
import { createDatabaseHttpError } from '~/server/infrastructure/database/adapters/shared/error';

import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';

export default defineEventHandler(
  async (event): Promise<RawQueryResultWithMetadata> => {
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
        params: any[] | Record<string, any>;
        ssl?: ISSLConfig;
        ssh?: ISSHConfig;
      } = await readBody(event);

      const adapter = await createQueryAdapter(body.type || DatabaseClientType.POSTGRES, {
        dbConnectionString: body.dbConnectionString,
        host: body.host,
        port: body.port,
        username: body.username,
        password: body.password,
        database: body.database,
        ssl: body.ssl,
        ssh: body.ssh,
      });

      return await adapter.rawExecute(body.query, body.params);
    } catch (error: any) {
      throw createDatabaseHttpError(
        error?.dbType || DatabaseClientType.POSTGRES,
        error
      );
    }
  }
);
