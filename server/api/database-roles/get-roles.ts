/**
 * API: Get Database Roles
 * Fetches all database roles/users with metadata
 * Supports multiple database types via adapter pattern
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseRole, GetDatabaseRolesRequest } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends GetDatabaseRolesRequest {
  dbType?: DatabaseClientType;
}

export default defineEventHandler(async (event): Promise<DatabaseRole[]> => {
  const body: RequestBody = await readBody(event);

  const adapter = await createRoleAdapter(
    body.dbType || DatabaseClientType.POSTGRES,
    {
      dbConnectionString: body.dbConnectionString,
    }
  );

  return adapter.getRoles();
});
