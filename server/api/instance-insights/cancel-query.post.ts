import { createError, defineEventHandler, readBody } from 'h3';
import type { InstanceActionResponse } from '~/core/types';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

interface RequestBody {
  dbConnectionString: string;
  pid: number;
}

export default defineEventHandler(
  async (event): Promise<InstanceActionResponse> => {
    try {
      const body = await readBody<RequestBody>(event);

      if (!body?.dbConnectionString) {
        throw createError({
          statusCode: 400,
          statusMessage: 'dbConnectionString is required',
        });
      }

      const adapter = await createInstanceInsightsAdapter('postgres', {
        dbConnectionString: body.dbConnectionString,
      });

      return await adapter.cancelQuery(Number(body.pid));
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Failed to cancel query',
        message: error.message,
      });
    }
  }
);
