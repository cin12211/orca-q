/**
 * API: Grant Bulk Permissions
 * Executes multiple permission grants in sequence (for wizard)
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { BulkGrantRequest, BulkGrantResponse } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends BulkGrantRequest {
  dbType?: DatabaseClientType;
}

export default defineEventHandler(async (event): Promise<BulkGrantResponse> => {
  const body: RequestBody = await readBody(event);

  if (!body.dbConnectionString) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection string is required',
    });
  }

  if (!body.roleName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role name is required',
    });
  }

  const adapter = await createRoleAdapter(
    body.dbType || DatabaseClientType.POSTGRES,
    {
      dbConnectionString: body.dbConnectionString,
    }
  );

  return adapter.grantBulkPermissions({
    roleName: body.roleName,
    databaseGrants: body.databaseGrants || [],
    schemaGrants: body.schemaGrants || [],
    objectGrants: body.objectGrants || [],
  });
});
