import type { Connection } from '~/core/types/entities/connection.entity';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { ConnectionRow } from '../schema';

class ConnectionSQLiteStorage extends SQLite3Storage<Connection> {
  readonly name = 'connectionSQLite';
  readonly tableName = 'connections';

  toRow(c: Connection): Record<string, unknown> {
    return {
      id: c.id,
      workspaceId: c.workspaceId,
      name: c.name,
      type: c.type,
      method: c.method,
      connectionString: c.connectionString ?? null,
      host: c.host ?? null,
      port: c.port ?? null,
      username: c.username ?? null,
      password: c.password ?? null,
      database: c.database ?? null,
      ssl: c.ssl ? JSON.stringify(c.ssl) : null,
      ssh: c.ssh ? JSON.stringify(c.ssh) : null,
      tagIds: c.tagIds ? JSON.stringify(c.tagIds) : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): Connection {
    const r = row as unknown as ConnectionRow;
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      type: r.type as Connection['type'],
      method: r.method as Connection['method'],
      connectionString: r.connectionString ?? undefined,
      host: r.host ?? undefined,
      port: r.port ?? undefined,
      username: r.username ?? undefined,
      password: r.password ?? undefined,
      database: r.database ?? undefined,
      ssl: r.ssl ? JSON.parse(r.ssl) : undefined,
      ssh: r.ssh ? JSON.parse(r.ssh) : undefined,
      tagIds: r.tagIds ? JSON.parse(r.tagIds) : undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? undefined,
    };
  }

  async getAll(): Promise<Connection[]> {
    return this.getMany();
  }

  async getByWorkspaceId(wsId: string): Promise<Connection[]> {
    const rows = (await this.db(this.tableName)
      .where({ workspaceId: wsId })
      .orderBy('createdAt', 'asc')) as Record<string, unknown>[];
    return rows.map(r => this.fromRow(r));
  }
}

export const connectionSQLiteStorage = new ConnectionSQLiteStorage(getKnex());
