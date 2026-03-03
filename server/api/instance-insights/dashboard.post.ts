import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { InstanceInsightsDashboard } from '~/core/types';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

export default defineEventHandler(
  async (event): Promise<InstanceInsightsDashboard> => {
    try {
      const body = await readBody<{ dbConnectionString: string }>(event);

      if (!body?.dbConnectionString) {
        throw createError({
          statusCode: 400,
          statusMessage: 'dbConnectionString is required',
        });
      }

      const adapter = await createInstanceInsightsAdapter(
        DatabaseClientType.POSTGRES,
        {
          dbConnectionString: body.dbConnectionString,
        }
      );

      return await adapter.getDashboard();
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage:
          error.statusMessage || 'Failed to fetch instance insights dashboard',
        message: error.message,
      });
    }
  }
);
