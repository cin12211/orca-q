/**
 * API: Get Database Roles
 * Fetches all database roles/users with metadata
 * Supports multiple database types via adapter pattern
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseRole, GetDatabaseRolesRequest, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends GetDatabaseRolesRequest, DatabaseMetadataRequestParams {
  dbType?: DatabaseClientType;
  roleName: string;
}

export default defineEventHandler(async (event): Promise<DatabaseRole> => {
  const body: RequestBody = await readBody(event);

  const adapter = await createRoleAdapter(
    body.type || body.dbType,
    body
  );

  return adapter.getRole(body.roleName);
});
