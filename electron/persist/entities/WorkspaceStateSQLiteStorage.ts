import type { WorkspaceState } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { WorkspaceStateRow } from '../schema';

class WorkspaceStateSQLiteStorage extends SQLite3Storage<WorkspaceState> {
  readonly name = 'workspaceStateSQLite';
  readonly tableName = 'workspace_states';

  toRow(ws: WorkspaceState): Record<string, unknown> {
    return {
      id: ws.id,
      connection_id: ws.connectionId ?? null,
      connection_states: ws.connectionStates
        ? JSON.stringify(ws.connectionStates)
        : null,
      opened_at: ws.openedAt ?? null,
      updated_at: ws.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): WorkspaceState {
    const r = row as unknown as WorkspaceStateRow;
    return {
      id: r.id,
      connectionId: r.connection_id ?? undefined,
      connectionStates: r.connection_states
        ? JSON.parse(r.connection_states)
        : undefined,
      openedAt: r.opened_at ?? undefined,
      updatedAt: r.updated_at ?? undefined,
    };
  }

  // workspace_states has no created_at column
  protected override addDefaultOrder(sql: string): string {
    return `${sql} ORDER BY updated_at ASC`;
  }

  async getAll(): Promise<WorkspaceState[]> {
    return this.getMany();
  }
}

export const workspaceStateSQLiteStorage = new WorkspaceStateSQLiteStorage(
  getDB()
);
