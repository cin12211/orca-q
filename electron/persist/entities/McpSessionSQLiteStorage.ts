import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { McpSessionRow } from '../schema';
// Runtime import must be relative: the `~` alias only resolves for types here.
import { normalizeMcpSession, type McpSession } from '../utils/normalizeState';

class McpSessionSQLiteStorage extends SQLite3Storage<McpSession> {
  readonly name = 'mcpSessionSQLite';
  readonly tableName = 'mcp_sessions';

  toRow(session: McpSession): Record<string, unknown> {
    return {
      id: session.id,
      name: session.name,
      token: session.token,
      requireToken: session.requireToken ? 1 : 0,
      workspaceAccess: JSON.stringify(session.workspaceAccess ?? {}),
      connectionAccess: JSON.stringify(session.connectionAccess ?? {}),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): McpSession {
    const r = row as unknown as McpSessionRow;
    return normalizeMcpSession({
      id: r.id,
      name: r.name,
      token: r.token,
      requireToken: Boolean(r.requireToken),
      workspaceAccess: JSON.parse(r.workspaceAccess || '{}'),
      connectionAccess: JSON.parse(r.connectionAccess || '{}'),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? undefined,
    }) as McpSession;
  }

  async getAll(): Promise<McpSession[]> {
    return this.getMany();
  }
}

export const mcpSessionSQLiteStorage = new McpSessionSQLiteStorage(getKnex());
