/**
 * API: Create Role
 * Creates a new PostgreSQL role/user
 */
import type { CreateRoleRequest, GrantRevokeResponse } from '~/shared/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody extends CreateRoleRequest {
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

    return adapter.createRole({
      roleName: body.roleName,
      password: body.password,
      canLogin: body.canLogin ?? false,
      canCreateDb: body.canCreateDb ?? false,
      canCreateRole: body.canCreateRole ?? false,
      isReplication: body.isReplication ?? false,
      connectionLimit: body.connectionLimit,
      validUntil: body.validUntil,
      memberOf: body.memberOf,
      comment: body.comment,
    });
  }
);
