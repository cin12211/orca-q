import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetrics } from '~/core/types';
import { createMetricsAdapter } from '~/server/infrastructure/database/adapters/metrics';

export default defineEventHandler(async (event): Promise<DatabaseMetrics> => {
  try {
    const body: {
      dbConnectionString: string;
    } = await readBody(event);

    if (!body?.dbConnectionString) {
      throw createError({
        statusCode: 400,
        statusMessage: 'dbConnectionString is required',
      });
    }

    const adapter = await createMetricsAdapter(DatabaseClientType.POSTGRES, {
      dbConnectionString: body.dbConnectionString,
    });

    return await adapter.getMetrics();
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error',
      message: error.message,
    });
  }
});
