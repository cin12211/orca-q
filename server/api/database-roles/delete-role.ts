/**
 * API: Delete Role
 * Deletes a PostgreSQL role/user
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DeleteRoleRequest, GrantRevokeResponse } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends DeleteRoleRequest {
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
      body.dbType || DatabaseClientType.POSTGRES,
      {
        dbConnectionString: body.dbConnectionString,
      }
    );

    return adapter.deleteRole(body.roleName);
  }
);
