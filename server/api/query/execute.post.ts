import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { QueryResult, DatabaseMetadataRequestParams } from '~/core/types';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';
import { createDatabaseHttpError } from '~/server/infrastructure/database/adapters/shared/error';

interface RequestBody extends DatabaseMetadataRequestParams {
  query: string;
}

export default defineEventHandler(async (event): Promise<QueryResult> => {
  try {
    const body = await readBody<RequestBody>(event);

    const adapter = await createQueryAdapter(
      body.type,
      body
    );

    return await adapter.execute(body.query);
  } catch (error: any) {
    throw createDatabaseHttpError(
      error?.dbType || DatabaseClientType.POSTGRES,
      error
    );
  }
});
