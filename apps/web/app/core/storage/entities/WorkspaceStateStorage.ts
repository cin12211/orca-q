import { WORKSPACE_STATE_IDB } from '#shared/storage/idbRegistry';
import type { WorkspaceState } from '#shared/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class WorkspaceStateStorage extends IDBStorage<WorkspaceState> {
  readonly name = 'workspaceState';

  constructor() {
    super(WORKSPACE_STATE_IDB);
  }

  async getAll(): Promise<WorkspaceState[]> {
    return this.getMany();
  }
}

export const workspaceStateStorage = new WorkspaceStateStorage();
