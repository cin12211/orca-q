import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { BulkUpdateResponse } from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { createDatabaseHttpError } from '../../shared';

const BULK_CHUNK_SIZE = 500;

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
    statements: string[]
  ): Promise<{ data: NonNullable<BulkUpdateResponse['data']> }> {
    const client = await this.adapter.acquireRawConnection();
    try {
      await client.query('BEGIN');
      const results: NonNullable<BulkUpdateResponse['data']> = [];

      for (const statement of statements) {
        const queryResult = await client.query({ text: statement });
        results.push({
          query: statement,
          affectedRows: queryResult.rowCount || 0,
          results: queryResult.rows || [],
        });
      }
      await client.query('COMMIT');
      return { data: results };
    } catch (e) {
      await client.query('ROLLBACK');
      throw createDatabaseHttpError(DatabaseClientType.POSTGRES, e);
    } finally {
      await this.adapter.releaseRawConnection(client);
    }
  }

  private async executeBulkStatements(
    statements: string[]
  ): Promise<BulkUpdateResponse> {
    const startTime = performance.now();
    const chunks = chunkArray(statements, BULK_CHUNK_SIZE);
    const aggregatedData: NonNullable<BulkUpdateResponse['data']> = [];

    for (const chunk of chunks) {
      const { data } = await this.executeChunk(chunk);
      aggregatedData.push(...data);
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
