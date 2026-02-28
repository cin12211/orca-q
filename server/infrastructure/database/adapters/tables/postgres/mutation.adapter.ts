import type { BulkUpdateResponse } from '~/core/types';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { toDatabaseHttpError } from '../../shared';

export class PostgresTableMutationAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  private async executeBulkStatements(
    statements: string[]
  ): Promise<BulkUpdateResponse> {
    const startTime = performance.now();
    const client = await this.adapter.acquireRawConnection();
    try {
      await client.query('BEGIN');
      const results: {
        query: string;
        affectedRows: number;
        results: Record<string, unknown>[];
      }[] = [];

      for (const statement of statements) {
        const queryResult = await client.query({ text: statement });
        results.push({
          query: statement,
          affectedRows: queryResult.rowCount || 0,
          results: queryResult.rows || [],
        });
      }
      await client.query('COMMIT');

      const endTime = performance.now();
      return {
        success: true,
        data: results,
        queryTime: Number((endTime - startTime).toFixed(2)),
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw toDatabaseHttpError(e);
    } finally {
      await this.adapter.releaseRawConnection(client);
    }
  }

  async executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeBulkStatements(statements);
  }

  async executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeBulkStatements(statements);
  }
}
