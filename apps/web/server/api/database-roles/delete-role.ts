/**
 * API: Delete Role
 * Deletes a PostgreSQL role/user
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DeleteRoleRequest, GrantRevokeResponse, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends DeleteRoleRequest, DatabaseMetadataRequestParams {
  dbType?: DatabaseClientType;
}

export default defineEventHandler(
  async (event): Promise<GrantRevokeResponse> => {
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

    return adapter.deleteRole(body.roleName);
  }
);
