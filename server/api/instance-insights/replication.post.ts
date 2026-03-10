import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { InstanceInsightsReplication } from '~/core/types';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

export default defineEventHandler(
  async (event): Promise<InstanceInsightsReplication> => {
    try {
      const body = await readBody<{
        dbConnectionString: string;
        host?: string;
        port?: string;
        username?: string;
        password?: string;
        database?: string;
        type?: DatabaseClientType;
      }>(event);

      if (!body?.dbConnectionString && !body?.host) {
        throw createError({
          statusCode: 400,
          statusMessage: 'dbConnectionString or host is required',
        });
      }

      const adapter = await createInstanceInsightsAdapter(
        body.type || DatabaseClientType.POSTGRES,
        {
          dbConnectionString: body.dbConnectionString,
          host: body.host,
          port: body.port,
          username: body.username,
          password: body.password,
          database: body.database,
        }
      );

      return await adapter.getReplication();
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage:
          error.statusMessage || 'Failed to fetch replication data',
        message: error.message,
      });
    }
  }
);
