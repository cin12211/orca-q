import type { DeleteQQueryLogsProps } from '../../../core/persist/types';
import type { QuickQueryLog } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { QuickQueryLogRow } from '../schema';

class QuickQueryLogSQLiteStorage extends SQLite3Storage<QuickQueryLog> {
  readonly name = 'quickQueryLogSQLite';
  readonly tableName = 'quick_query_logs';

  toRow(log: QuickQueryLog): Record<string, unknown> {
    return {
      id: log.id,
      connection_id: log.connectionId,
      workspace_id: log.workspaceId,
      schema_name: log.schemaName,
      table_name: log.tableName,
      logs: log.logs,
      query_time: log.queryTime,
      error: log.error ? JSON.stringify(log.error) : null,
      error_message: log.errorMessage ?? null,
      created_at: log.createdAt,
      updated_at: log.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): QuickQueryLog {
    const r = row as unknown as QuickQueryLogRow;
    return {
      id: r.id,
      connectionId: r.connection_id,
      workspaceId: r.workspace_id,
      schemaName: r.schema_name,
      tableName: r.table_name,
      logs: r.logs,
      queryTime: Number(r.query_time),
      error: r.error ? JSON.parse(r.error) : undefined,
      errorMessage: r.error_message ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at ?? undefined,
    };
  }

  async getAll(): Promise<QuickQueryLog[]> {
    return this.getMany();
  }

  async getByContext(ctx: { connectionId: string }): Promise<QuickQueryLog[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM quick_query_logs WHERE connection_id = ? ORDER BY created_at ASC`
      )
      .all(ctx.connectionId) as Record<string, unknown>[];
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
  getDB()
);
