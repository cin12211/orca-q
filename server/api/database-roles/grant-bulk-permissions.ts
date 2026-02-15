/**
 * API: Grant Bulk Permissions
 * Executes multiple permission grants in sequence (for wizard)
 */
import type { BulkGrantRequest, BulkGrantResponse } from '~/core/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody extends BulkGrantRequest {
  dbType?: SupportedDatabaseType;
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

  const adapter = await createRoleAdapter(body.dbType || 'postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return adapter.grantBulkPermissions({
    roleName: body.roleName,
    databaseGrants: body.databaseGrants || [],
    schemaGrants: body.schemaGrants || [],
    objectGrants: body.objectGrants || [],
  });
});
