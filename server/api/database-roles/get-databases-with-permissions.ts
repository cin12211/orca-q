/**
 * API: Get Databases with Permissions
 * Fetches all databases and the role's permissions on each
 */
import type { DatabasePermission } from '~/core/types';
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
  async (event): Promise<DatabasePermission[]> => {
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

    return adapter.getDatabasePermissions(body.roleName);
  }
);
