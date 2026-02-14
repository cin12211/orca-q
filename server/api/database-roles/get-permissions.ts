/**
 * API: Get Role Permissions
 * Fetches permissions for a specific role
 * Supports multiple database types via adapter pattern
 */
import type {
  GetRolePermissionsRequest,
  RolePermissions,
} from '~/shared/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody extends GetRolePermissionsRequest {
  dbType?: SupportedDatabaseType;
}

export default defineEventHandler(async (event): Promise<RolePermissions> => {
  const body: RequestBody = await readBody(event);

  if (!body.roleName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role name is required',
    });
  }

  const adapter = await createRoleAdapter(body.dbType || 'postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return adapter.getRolePermissions(body.roleName);
});
