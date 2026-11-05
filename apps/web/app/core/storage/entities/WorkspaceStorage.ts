import { WORKSPACE_IDB } from '#shared/storage/idbRegistry';
import type { Workspace } from '#shared/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class WorkspaceStorage extends IDBStorage<Workspace> {
  readonly name = 'workspace';

  constructor() {
    super(WORKSPACE_IDB);
  }

  async getAll(): Promise<Workspace[]> {
    return this.getMany();
  }
}

export const workspaceStorage = new WorkspaceStorage();
