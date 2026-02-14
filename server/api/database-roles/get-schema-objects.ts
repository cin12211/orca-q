/**
 * API: Get Schema Objects
 * Fetches tables, views, functions, sequences in a schema
 */
import type { SchemaObjects } from '~/shared/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody {
  dbConnectionString: string;
  schemaName: string;
  dbType?: SupportedDatabaseType;
}

export default defineEventHandler(async (event): Promise<SchemaObjects> => {
  const body: RequestBody = await readBody(event);

  if (!body.dbConnectionString) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection string is required',
    });
  }

  if (!body.schemaName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Schema name is required',
    });
  }

  const adapter = await createRoleAdapter(body.dbType || 'postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return adapter.getSchemaObjects(body.schemaName);
});
