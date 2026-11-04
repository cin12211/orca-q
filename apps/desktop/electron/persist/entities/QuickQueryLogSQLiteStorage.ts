import type { QuickQueryLog } from '~/core/types/entities/quick-query-log.entity';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { QuickQueryLogRow } from '../schema';
import type { DeleteQQueryLogsProps } from '../types';

class QuickQueryLogSQLiteStorage extends SQLite3Storage<QuickQueryLog> {
  readonly name = 'quickQueryLogSQLite';
  readonly tableName = 'quick_query_logs';

  toRow(log: QuickQueryLog): Record<string, unknown> {
    return {
      id: log.id,
      connectionId: log.connectionId,
      workspaceId: log.workspaceId,
      schemaName: log.schemaName,
      tableName: log.tableName,
      logs: log.logs,
      queryTime: log.queryTime,
      error: log.error ? JSON.stringify(log.error) : null,
      errorMessage: log.errorMessage ?? null,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): QuickQueryLog {
    const r = row as unknown as QuickQueryLogRow;
    return {
      id: r.id,
      connectionId: r.connectionId,
      workspaceId: r.workspaceId,
      schemaName: r.schemaName,
      tableName: r.tableName,
      logs: r.logs,
      queryTime: Number(r.queryTime),
      error: r.error ? JSON.parse(r.error) : undefined,
      errorMessage: r.errorMessage ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? undefined,
    };
  }

  async getAll(): Promise<QuickQueryLog[]> {
    return this.getMany();
  }

  async getByContext(ctx: { connectionId: string }): Promise<QuickQueryLog[]> {
    const rows = (await this.db(this.tableName)
      .where({ connectionId: ctx.connectionId })
      .orderBy('createdAt', 'asc')) as Record<string, unknown>[];
    return rows.map(r => this.fromRow(r));
  }

  async deleteByProps(props: DeleteQQueryLogsProps): Promise<void> {
    const all = await this.getMany();
    const toDelete = all.filter(log => {
      if ('workspaceId' in props) return log.workspaceId === props.workspaceId;
      if ('schemaName' in props) {
        return (
          log.connectionId === props.connectionId &&
          log.schemaName === props.schemaName &&
          log.tableName === props.tableName
        );
      }
      return log.connectionId === props.connectionId;
    });
    await Promise.all(toDelete.map(log => this.delete(log.id)));
  }
}

export const quickQueryLogSQLiteStorage = new QuickQueryLogSQLiteStorage(
  getKnex()
);
