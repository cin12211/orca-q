/**
 * API: Get Schemas
 * Fetches all schemas in the connected database
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { SchemaInfo, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends DatabaseMetadataRequestParams {
  dbType?: DatabaseClientType;
}

export default defineEventHandler(async (event): Promise<SchemaInfo[]> => {
  const body: RequestBody = await readBody(event);

  if (!body.dbConnectionString && !body.host) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection details are required',
    });
  }

  const adapter = await createRoleAdapter(
    body.type || body.dbType,
    body
  );

  return adapter.getSchemas();
});
