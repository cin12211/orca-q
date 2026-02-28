/**
 * API: Get Databases
 * Fetches all databases (no role-specific permissions)
 */
import type { DatabaseInfo } from '~/core/types';
import {
  createRoleAdapter,
  type SupportedDatabaseType,
} from '~/server/infrastructure/database/adapters/database-roles';

interface RequestBody {
  dbConnectionString: string;
  dbType?: SupportedDatabaseType;
}

export default defineEventHandler(async (event): Promise<DatabaseInfo[]> => {
  const body: RequestBody = await readBody(event);

  if (!body.dbConnectionString) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection string is required',
    });
  }

  const adapter = await createRoleAdapter(body.dbType || 'postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return adapter.getDatabases();
});
