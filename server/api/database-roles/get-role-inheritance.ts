/**
 * API: Get Role Inheritance Tree
 * Fetches inherited roles using recursive query
 */
import type { RoleInheritanceNode } from '~/core/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody {
  dbConnectionString: string;
  roleName: string;
  dbType?: SupportedDatabaseType;
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

    const adapter = await createRoleAdapter(body.dbType || 'postgres', {
      dbConnectionString: body.dbConnectionString,
    });

    return adapter.getRoleInheritance(body.roleName);
  }
);
