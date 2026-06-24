/**
 * API: Revoke Permission
 * Revokes permissions from a role
 * Supports multiple database types via adapter pattern
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { GrantRevokeRequest, GrantRevokeResponse, DatabaseMetadataRequestParams } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends GrantRevokeRequest, DatabaseMetadataRequestParams {
  dbType?: DatabaseClientType;
}

export default defineEventHandler(
  async (event): Promise<GrantRevokeResponse> => {
    const body: RequestBody = await readBody(event);

    if (!body.roleName || !body.objectType || !body.privileges?.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Role name, object type, and privileges are required',
      });
    }

    const adapter = await createRoleAdapter(
      body.type || body.dbType,
      body
    );

    return adapter.revokePermission({
      roleName: body.roleName,
      objectType: body.objectType,
      schemaName: body.schemaName,
      objectName: body.objectName,
      privileges: body.privileges,
    });
  }
);
