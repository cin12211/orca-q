/**
 * API: Grant Permission
 * Grants permissions to a role
 * Supports multiple database types via adapter pattern
 */
import type { GrantRevokeRequest, GrantRevokeResponse } from '~/shared/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from './adapters/index';

interface RequestBody extends GrantRevokeRequest {
  dbType?: SupportedDatabaseType;
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

    const adapter = await createRoleAdapter(body.dbType || 'postgres', {
      dbConnectionString: body.dbConnectionString,
    });

    return adapter.grantPermission({
      roleName: body.roleName,
      objectType: body.objectType,
      schemaName: body.schemaName,
      objectName: body.objectName,
      privileges: body.privileges,
    });
  }
);
