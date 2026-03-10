import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { InstanceActionResponse } from '~/core/types';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

interface RequestBody {
  dbConnectionString: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  type?: DatabaseClientType;
  pid: number;
}

export default defineEventHandler(
  async (event): Promise<InstanceActionResponse> => {
    try {
      const body = await readBody<RequestBody>(event);

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

      return await adapter.terminateConnection(Number(body.pid));
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Failed to terminate connection',
        message: error.message,
      });
    }
  }
);
