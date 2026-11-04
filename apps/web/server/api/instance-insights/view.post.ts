import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { InstanceInsightsView, DatabaseMetadataRequestParams } from '~/core/types';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

export default defineEventHandler(
  async (event): Promise<InstanceInsightsView> => {
    try {
      const body = await readBody<DatabaseMetadataRequestParams>(event);

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
        body.type,
        body
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
