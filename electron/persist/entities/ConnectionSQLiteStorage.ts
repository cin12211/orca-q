import type { Connection } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { ConnectionRow } from '../schema';

class ConnectionSQLiteStorage extends SQLite3Storage<Connection> {
  readonly name = 'connectionSQLite';
  readonly tableName = 'connections';

  toRow(c: Connection): Record<string, unknown> {
    return {
      id: c.id,
      workspace_id: c.workspaceId,
      name: c.name,
      type: c.type,
      method: c.method,
      connection_string: c.connectionString ?? null,
      host: c.host ?? null,
      port: c.port ?? null,
      username: c.username ?? null,
      password: c.password ?? null,
      database_name: c.database ?? null,
      ssl_config: c.ssl ? JSON.stringify(c.ssl) : null,
      ssh_config: c.ssh ? JSON.stringify(c.ssh) : null,
      tag_ids: c.tagIds ? JSON.stringify(c.tagIds) : null,
      created_at: c.createdAt,
      updated_at: c.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): Connection {
    const r = row as unknown as ConnectionRow;
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      type: r.type as Connection['type'],
      method: r.method as Connection['method'],
      connectionString: r.connection_string ?? undefined,
      host: r.host ?? undefined,
      port: r.port ?? undefined,
      username: r.username ?? undefined,
      password: r.password ?? undefined,
      database: r.database_name ?? undefined,
      ssl: r.ssl_config ? JSON.parse(r.ssl_config) : undefined,
      ssh: r.ssh_config ? JSON.parse(r.ssh_config) : undefined,
      tagIds: r.tag_ids ? JSON.parse(r.tag_ids) : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at ?? undefined,
    };
  }

  async getAll(): Promise<Connection[]> {
    return this.getMany();
  }

  async getByWorkspaceId(wsId: string): Promise<Connection[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM connections WHERE workspace_id = ? ORDER BY created_at ASC`
      )
      .all(wsId) as Record<string, unknown>[];
    return rows.map(r => this.fromRow(r));
  }
}

export const connectionSQLiteStorage = new ConnectionSQLiteStorage(getDB());
