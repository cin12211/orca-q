import type { WorkspaceState } from '~/core/types/entities';
import { WORKSPACE_STATE_IDB } from '../idbRegistry';
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
