import { DatabaseClientType } from '#shared/constants/database-client-type';
import type {
  RawQueryResultWithMetadata,
  DatabaseMetadataRequestParams,
} from '#shared/types';
import { defineEventHandler, readBody } from 'h3';
import { createQueryAdapter } from '~~/server/infrastructure/database/adapters/query';
import { createDatabaseHttpError } from '~~/server/infrastructure/database/adapters/shared/error';

interface RequestBody extends DatabaseMetadataRequestParams {
  query: string;
  params: any[] | Record<string, any>;
}

export default defineEventHandler(
  async (event): Promise<RawQueryResultWithMetadata> => {
    try {
      const body = await readBody<RequestBody>(event);

      const adapter = await createQueryAdapter(body.type, body);

      return await adapter.rawExecute(body.query, body.params);
    } catch (error: any) {
      throw createDatabaseHttpError(
        error?.dbType || DatabaseClientType.POSTGRES,
        error
      );
    }
  }
);
