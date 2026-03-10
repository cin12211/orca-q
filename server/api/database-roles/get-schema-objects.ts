/**
 * API: Get Schema Objects
 * Fetches tables, views, functions, sequences in a schema
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { SchemaObjects } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody {
  dbConnectionString: string;
  schemaName: string;
  dbType?: DatabaseClientType;
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

  const adapter = await createRoleAdapter(
    body.dbType || DatabaseClientType.POSTGRES,
    {
      dbConnectionString: body.dbConnectionString,
    }
  );

  return adapter.getSchemaObjects(body.schemaName);
});
