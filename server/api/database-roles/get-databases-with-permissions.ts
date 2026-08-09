/**
 * API: Get Databases with Permissions
 * Fetches all databases and the role's permissions on each
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabasePermission, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends DatabaseMetadataRequestParams {
  roleName: string;
  dbType?: DatabaseClientType;
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

    const adapter = await createRoleAdapter(
      body.type || body.dbType,
      body
    );

    return adapter.getDatabasePermissions(body.roleName);
  }
);
