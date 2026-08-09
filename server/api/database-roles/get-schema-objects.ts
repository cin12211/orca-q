/**
 * API: Get Schema Objects
 * Fetches tables, views, functions, sequences in a schema
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { SchemaObjects, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends DatabaseMetadataRequestParams {
  schemaName: string;
  dbType?: DatabaseClientType;
}

export default defineEventHandler(async (event): Promise<SchemaObjects> => {
  const body: RequestBody = await readBody(event);

  if (!body.dbConnectionString && !body.host) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection details are required',
    });
  }

  if (!body.schemaName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Schema name is required',
    });
  }

  const adapter = await createRoleAdapter(
    body.type || body.dbType,
    body
  );

  return adapter.getSchemaObjects(body.schemaName);
});
