import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

export default defineEventHandler(async event => {
  const body = await readBody<{
    sqlUpdateStatements: string[];
    dbConnectionString: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    type?: DatabaseClientType;
    providerKind?: EConnectionProviderKind;
    managedSqlite?: IManagedSqliteConfig;
  }>(event);
  const { sqlUpdateStatements } = body;

  if (!sqlUpdateStatements?.length || !Array.isArray(sqlUpdateStatements)) {
    throw createError({
      statusCode: 400,
      message: 'No valid UPDATE or INSERT statements provided',
    });
  }

  for (const statement of sqlUpdateStatements) {
    const isInsertOrUpdate =
      statement.trim().toUpperCase().startsWith('UPDATE') ||
      statement.trim().toUpperCase().startsWith('INSERT');
    if (typeof statement !== 'string' || !isInsertOrUpdate) {
      throw createError({
        statusCode: 400,
        message: 'All statements must be valid UPDATE or INSERT statements',
      });
    }
  }

  const adapter = await createTableAdapter(
    body.type || DatabaseClientType.POSTGRES,
    body
  );
  return await adapter.executeBulkUpdate(sqlUpdateStatements);
});
