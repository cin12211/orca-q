import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { buildDeleteStatements } from '~/core/helpers/sql-mutation-statements';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

export default defineEventHandler(async event => {
  const body = await readBody<{
    tableName: string;
    schemaName: string;
    pKeys: string[];
    pKeyValues: Record<string, unknown>[];
    dbConnectionString?: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    type?: DatabaseClientType;
    providerKind?: EConnectionProviderKind;
    managedSqlite?: IManagedSqliteConfig;
  }>(event);

  const { tableName, schemaName, pKeys, pKeyValues } = body;

  if (!tableName || !schemaName) {
    throw createError({
      statusCode: 400,
      message: 'tableName and schemaName are required',
    });
  }

  if (!pKeyValues?.length || !Array.isArray(pKeyValues)) {
    throw createError({
      statusCode: 400,
      message: 'pKeyValues must be a non-empty array',
    });
  }

  // Build one DELETE SQL statement per row
  const sqlDeleteStatements = pKeyValues.map(
    row =>
      buildDeleteStatements({
        tableName,
        schemaName,
        pKeys: pKeys ?? [],
        pKeyValue: row,
        dbType: body.type,
      }).sql
  );

  const adapter = await createTableAdapter(
    body.type || DatabaseClientType.POSTGRES,
    body
  );
  return await adapter.executeBulkDelete(sqlDeleteStatements);
});
