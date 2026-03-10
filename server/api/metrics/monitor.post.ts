import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetrics } from '~/core/types';
import { createMetricsAdapter } from '~/server/infrastructure/database/adapters/metrics';

export default defineEventHandler(async (event): Promise<DatabaseMetrics> => {
  try {
    const body: {
      dbConnectionString: string;
      host?: string;
      port?: string;
      username?: string;
      password?: string;
      database?: string;
      type?: DatabaseClientType;
    } = await readBody(event);

    if (!body?.dbConnectionString && !body?.host) {
      throw createError({
        statusCode: 400,
        statusMessage: 'dbConnectionString or host is required',
      });
    }

    const adapter = await createMetricsAdapter(body.type || DatabaseClientType.POSTGRES, {
      dbConnectionString: body.dbConnectionString,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
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
