/**
 * API: Get Database Roles
 * Fetches all database roles/users with metadata
 * Supports multiple database types via adapter pattern
 */
import type { DatabaseRole, GetDatabaseRolesRequest } from '~/core/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody extends GetDatabaseRolesRequest {
  dbType?: SupportedDatabaseType;
  roleName: string;
}

export default defineEventHandler(async (event): Promise<DatabaseRole> => {
  const body: RequestBody = await readBody(event);

  const adapter = await createRoleAdapter(body.dbType || 'postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return adapter.getRole(body.roleName);
});
