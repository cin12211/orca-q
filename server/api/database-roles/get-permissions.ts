/**
 * API: Get Role Permissions
 * Fetches permissions for a specific role
 * Supports multiple database types via adapter pattern
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { GetRolePermissionsRequest, RolePermissions, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends GetRolePermissionsRequest, DatabaseMetadataRequestParams {
  dbType?: DatabaseClientType;
}

export default defineEventHandler(async (event): Promise<RolePermissions> => {
  const body: RequestBody = await readBody(event);

  if (!body.roleName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role name is required',
    });
  }

  const adapter = await createRoleAdapter(
    body.type || body.dbType,
    body
  );

  return adapter.getRolePermissions(body.roleName);
});
