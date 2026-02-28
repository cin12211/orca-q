import { defineEventHandler, readBody, createError } from 'h3';
import { type QueryFailedError } from 'typeorm';
import type { QueryResult } from '~/core/types';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';

export default defineEventHandler(async (event): Promise<QueryResult> => {
  try {
    const body: {
      query: string;
      dbConnectionString: string;
    } = await readBody(event);

    const adapter = await createQueryAdapter('postgres', {
      dbConnectionString: body.dbConnectionString,
    });

    return await adapter.execute(body.query);
  } catch (error) {
    const queryError: QueryFailedError = error as unknown as QueryFailedError;

    throw createError({
      statusCode: 500,
      statusMessage: queryError.message,
      cause: queryError.cause,
      data: queryError.driverError,
      message: queryError.message,
    });
  }
});
