/**
 * API: Grant Permission
 * Grants permissions to a role
 * Supports multiple database types via adapter pattern
 */
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { GrantRevokeRequest, GrantRevokeResponse } from '~/core/types';
import { createRoleAdapter } from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody extends GrantRevokeRequest {
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
      body.dbType || DatabaseClientType.POSTGRES,
      {
        dbConnectionString: body.dbConnectionString,
      }
    );

    return adapter.grantPermission({
      roleName: body.roleName,
      objectType: body.objectType,
      schemaName: body.schemaName,
      objectName: body.objectName,
      privileges: body.privileges,
    });
  }
);
