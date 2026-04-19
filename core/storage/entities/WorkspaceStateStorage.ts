import type { WorkspaceState } from '~/core/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class WorkspaceStateStorage extends IDBStorage<WorkspaceState> {
  readonly name = 'workspaceState';

  constructor() {
    super({ dbName: 'workspaceStateIDB', storeName: 'workspace_states' });
  }

  async getAll(): Promise<WorkspaceState[]> {
    return this.getMany();
  }
}

export const workspaceStateStorage = new WorkspaceStateStorage();
