import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { InstanceInsightsState, DatabaseMetadataRequestParams } from '~/core/types';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

export default defineEventHandler(
  async (event): Promise<InstanceInsightsState> => {
    try {
      const body = await readBody<DatabaseMetadataRequestParams>(event);

      if (!body?.dbConnectionString && !body?.host) {
        throw createError({
          statusCode: 400,
          statusMessage: 'dbConnectionString or host is required',
        });
      }

      const adapter = await createInstanceInsightsAdapter(
        body.type,
        body
      );

      return await adapter.getState();
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Failed to fetch instance state',
        message: error.message,
      });
    }
  }
);
