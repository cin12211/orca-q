import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { buildDeleteStatements } from '~/core/helpers/sql-mutation-statements';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

interface RequestBody extends DatabaseMetadataRequestParams {
  tableName: string;
  schemaName: string;
  pKeys: string[];
  pKeyValues: Record<string, unknown>[];
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

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
    body.type,
    body
  );
  return await adapter.executeBulkDelete(sqlDeleteStatements);
});
