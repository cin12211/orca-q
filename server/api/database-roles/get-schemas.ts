/**
 * API: Get Schemas
 * Fetches all schemas in the connected database
 */
import type { SchemaInfo } from '~/core/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody {
  dbConnectionString: string;
  dbType?: SupportedDatabaseType;
}

export default defineEventHandler(async (event): Promise<SchemaInfo[]> => {
  const body: RequestBody = await readBody(event);

  if (!body.dbConnectionString) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection string is required',
    });
  }

  const adapter = await createRoleAdapter(body.dbType || 'postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return adapter.getSchemas();
});
