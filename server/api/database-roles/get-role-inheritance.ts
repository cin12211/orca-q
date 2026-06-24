/**
 * API: Get Role Inheritance Tree
 * Fetches inherited roles using recursive query
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { RoleInheritanceNode, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends DatabaseMetadataRequestParams {
  roleName: string;
  dbType?: DatabaseClientType;
}

export default defineEventHandler(
  async (event): Promise<RoleInheritanceNode[]> => {
    const body: RequestBody = await readBody(event);

    if (!body.dbConnectionString && !body.host) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Database connection details are required',
      });
    }

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

    return adapter.getRoleInheritance(body.roleName);
  }
);
