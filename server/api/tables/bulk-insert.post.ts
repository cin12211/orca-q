import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { buildInsertStatements } from '~/core/helpers/sql-mutation-statements';
import type { BulkUpdateResponse } from '~/core/types';
import type {
  EConnectionProviderKind,
  IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

const BULK_CHUNK_SIZE = 500;

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
    insertItems: Record<string, any>[];
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

  const { tableName, schemaName, insertItems } = body;

  if (!tableName || !schemaName) {
    throw createError({
      statusCode: 400,
      message: 'tableName and schemaName are required',
    });
  }

  if (!insertItems?.length || !Array.isArray(insertItems)) {
    throw createError({
      statusCode: 400,
      message: 'insertItems must be a non-empty array',
    });
  }

  const allStatements = insertItems.map(item =>
    buildInsertStatements({
      tableName,
      schemaName,
      insertData: item,
      dbType: body.type,
    })
  );

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
