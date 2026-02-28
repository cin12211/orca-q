import { defineEventHandler, readBody, createError } from 'h3';
import { type QueryFailedError } from 'typeorm';
import type { RawQueryResultWithMetadata } from '~/core/types';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';

export default defineEventHandler(
  async (event): Promise<RawQueryResultWithMetadata> => {
    try {
      const body: {
        query: string;
        dbConnectionString: string;
        params: any[] | Record<string, any>;
      } = await readBody(event);

      const adapter = await createQueryAdapter('postgres', {
        dbConnectionString: body.dbConnectionString,
      });

      return await adapter.rawExecute(body.query, body.params);
    } catch (error) {
      const queryError: QueryFailedError = error as any;

      console.log('🚀 ~ queryError:', queryError);
      throw createError({
        statusCode: 500,
        cause: queryError.cause,
        data: JSON.stringify(error, null, 2),
        message: queryError.message,
      });
    }
  }
);
