/**
 * API: Get Role Inheritance Tree
 * Fetches inherited roles using recursive query
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { RoleInheritanceNode } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody {
  dbConnectionString: string;
  roleName: string;
  dbType?: DatabaseClientType;
}

export default defineEventHandler(
  async (event): Promise<RoleInheritanceNode[]> => {
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

    return adapter.getRoleInheritance(body.roleName);
  }
);
