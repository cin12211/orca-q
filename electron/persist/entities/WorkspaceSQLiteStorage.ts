import type { Workspace } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { WorkspaceRow } from '../schema';

class WorkspaceSQLiteStorage extends SQLite3Storage<Workspace> {
  readonly name = 'workspaceSQLite';
  readonly tableName = 'workspaces';

  toRow(w: Workspace): Record<string, unknown> {
    return {
      id: w.id,
      icon: w.icon,
      name: w.name,
      desc: w.desc ?? null,
      last_opened: w.lastOpened ?? null,
      created_at: w.createdAt,
      updated_at: w.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): Workspace {
    const r = row as unknown as WorkspaceRow;
    return {
      id: r.id,
      icon: r.icon,
      name: r.name,
      desc: r.desc ?? undefined,
      lastOpened: r.last_opened ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at ?? undefined,
    };
  }

  async getAll(): Promise<Workspace[]> {
    return this.getMany();
  }
}

export const workspaceSQLiteStorage = new WorkspaceSQLiteStorage(getDB());
