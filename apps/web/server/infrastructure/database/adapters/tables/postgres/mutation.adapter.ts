import type { PoolClient, QueryResult } from 'pg';
import { DatabaseClientType, BULK_CHUNK_SIZE } from '~/core/constants';
import type { BulkUpdateResponse } from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { createDatabaseHttpError } from '../../shared';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export class PostgresTableMutationAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  private async executeChunk(
    client: PoolClient,
    statements: string[]
  ): Promise<NonNullable<BulkUpdateResponse['data']>[number]> {
    const batchQuery = statements.join(';\n');
    const queryResult = (await client.query({
      text: batchQuery,
    })) as unknown as
      | QueryResult<Record<string, unknown>>
      | QueryResult<Record<string, unknown>>[];

    let affectedRows = 0;
    let results: Record<string, unknown>[] = [];

    if (Array.isArray(queryResult)) {
      affectedRows = queryResult.reduce(
        (sum: number, r) => sum + (r.rowCount || 0),
        0
      );
      results = queryResult.flatMap(r => r.rows || []);
    } else {
      const singleResult = queryResult as QueryResult<Record<string, unknown>>;
      affectedRows = singleResult.rowCount || 0;
      results = singleResult.rows || [];
    }

    return {
      query: batchQuery,
      affectedRows,
      results,
    };
  }

  private async executeBulkStatements(
    statements: string[]
  ): Promise<BulkUpdateResponse> {
    const startTime = performance.now();
    const chunks = chunkArray(statements, BULK_CHUNK_SIZE);
    const aggregatedData: NonNullable<BulkUpdateResponse['data']> = [];
    const client = await this.adapter.acquireRawConnection();

    try {
      await client.query('BEGIN');

      for (const chunk of chunks) {
        const result = await this.executeChunk(client, chunk);
        aggregatedData.push(result);
      }

      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Silent catch
      }
      throw createDatabaseHttpError(DatabaseClientType.POSTGRES, e);
    } finally {
      await this.adapter.releaseRawConnection(client);
    }

    return {
      success: true,
      data: aggregatedData,
      queryTime: Number((performance.now() - startTime).toFixed(2)),
    };
  }

  async executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeBulkStatements(statements);
  }

  async executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeBulkStatements(statements);
  }
}
