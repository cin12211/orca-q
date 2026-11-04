/**
 * API: Create Role
 * Creates a new PostgreSQL role/user
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { CreateRoleRequest, GrantRevokeResponse, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends CreateRoleRequest, DatabaseMetadataRequestParams {
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
