import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { buildUpdateStatements } from '~/core/helpers/sql-mutation-statements';
import type { BulkUpdateResponse } from '~/core/types';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

const BULK_CHUNK_SIZE = 500;

type UpdateItem = {
  pKeyValue: Record<string, any>;
  update: Record<string, any>;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default defineEventHandler(async event => {
  const body = await readBody<{
    tableName: string;
    schemaName: string;
    pKeys: string[];
    updates: UpdateItem[];
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

  const { tableName, schemaName, pKeys, updates } = body;

  if (!tableName || !schemaName) {
    throw createError({
      statusCode: 400,
      message: 'tableName and schemaName are required',
    });
  }

  if (!updates?.length || !Array.isArray(updates)) {
    throw createError({
      statusCode: 400,
      message: 'updates must be a non-empty array',
    });
  }

  const allStatements = updates.map(item => {
    if (!item.pKeyValue || !item.update) {
      throw createError({
        statusCode: 400,
        message: 'Each update item requires pKeyValue and update fields',
      });
    }
    return buildUpdateStatements({
      tableName,
      schemaName,
      pKeys: pKeys ?? [],
      pKeyValue: item.pKeyValue,
      update: item.update,
      dbType: body.type,
    }).sql;
  });

  const adapter = await createTableAdapter(
    body.type || DatabaseClientType.POSTGRES,
    body
  );

  const chunks = chunkArray(allStatements, BULK_CHUNK_SIZE);

  if (chunks.length === 1) {
    return await adapter.executeBulkUpdate(chunks[0]);
  }

  const startTime = performance.now();
  const aggregatedData: NonNullable<BulkUpdateResponse['data']> = [];

  for (const chunk of chunks) {
    const result = await adapter.executeBulkUpdate(chunk);
    if (!result.success) {
      return result;
    }
    if (result.data) {
      aggregatedData.push(...result.data);
    }
  }

  return {
    success: true,
    data: aggregatedData,
    queryTime: Number((performance.now() - startTime).toFixed(2)),
  } satisfies BulkUpdateResponse;
});
