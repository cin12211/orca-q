import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { InstanceInsightsView } from '~/core/types';
import type { InstanceInsightsAdapterParams } from '~/server/infrastructure/database/adapters/instance-insights';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

interface RequestBody extends InstanceInsightsAdapterParams {
  type?: DatabaseClientType;
}

export default defineEventHandler(
  async (event): Promise<InstanceInsightsView> => {
    try {
      const body = await readBody<RequestBody>(event);

      if (
        !body?.dbConnectionString &&
        !body?.host &&
        !body?.filePath &&
        !body?.managedSqlite
      ) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'dbConnectionString, host, filePath, or managedSqlite is required',
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
          serviceName: body.serviceName,
          filePath: body.filePath,
          providerKind: body.providerKind,
          managedSqlite: body.managedSqlite,
          ssl: body.ssl,
          ssh: body.ssh,
        }
      );

      return await adapter.getView();
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage:
          error.statusMessage || 'Failed to fetch instance insights view',
        message: error.message,
      });
    }
  }
);
