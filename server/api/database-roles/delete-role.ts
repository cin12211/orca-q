/**
 * API: Delete Role
 * Deletes a PostgreSQL role/user
 */
import type { DeleteRoleRequest, GrantRevokeResponse } from '~/shared/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody extends DeleteRoleRequest {
  dbType?: SupportedDatabaseType;
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

    const adapter = await createRoleAdapter(body.dbType || 'postgres', {
      dbConnectionString: body.dbConnectionString,
    });

    return adapter.deleteRole(body.roleName);
  }
);
