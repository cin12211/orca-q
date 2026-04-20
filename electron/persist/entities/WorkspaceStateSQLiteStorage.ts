import type { WorkspaceState } from '~/core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { WorkspaceStateRow } from '../schema';

class WorkspaceStateSQLiteStorage extends SQLite3Storage<WorkspaceState> {
  readonly name = 'workspaceStateSQLite';
  readonly tableName = 'workspace_states';

  toRow(ws: WorkspaceState): Record<string, unknown> {
    return {
      id: ws.id,
      connectionId: ws.connectionId ?? null,
      connectionStates: ws.connectionStates
        ? JSON.stringify(ws.connectionStates)
        : null,
      openedAt: ws.openedAt ?? null,
      updatedAt: ws.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): WorkspaceState {
    const r = row as unknown as WorkspaceStateRow;
    return {
      id: r.id,
      connectionId: r.connectionId ?? undefined,
      connectionStates: r.connectionStates
        ? JSON.parse(r.connectionStates)
        : undefined,
      openedAt: r.openedAt ?? undefined,
      updatedAt: r.updatedAt ?? undefined,
    };
  }

  // workspace_states has no createdAt field
  protected override getOrderByColumn(): string | null {
    return 'updatedAt';
  }

  async getAll(): Promise<WorkspaceState[]> {
    return this.getMany();
  }
}

export const workspaceStateSQLiteStorage = new WorkspaceStateSQLiteStorage(
  getKnex()
);
