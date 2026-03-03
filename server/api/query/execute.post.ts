import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { QueryResult } from '~/core/types';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';
import { createDatabaseHttpError } from '~/server/infrastructure/database/adapters/shared/error';

export default defineEventHandler(async (event): Promise<QueryResult> => {
  try {
    const body: {
      query: string;
      dbConnectionString: string;
    } = await readBody(event);

    const adapter = await createQueryAdapter(DatabaseClientType.POSTGRES, {
      dbConnectionString: body.dbConnectionString,
    });

    return await adapter.execute(body.query);
  } catch (error: any) {
    throw createDatabaseHttpError(
      error?.dbType || DatabaseClientType.POSTGRES,
      error
    );
  }
});
