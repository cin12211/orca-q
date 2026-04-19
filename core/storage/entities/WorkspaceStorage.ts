import type { Workspace } from '~/core/types/entities';
import { IDBStorage } from '../base/IDBStorage';

class WorkspaceStorage extends IDBStorage<Workspace> {
  readonly name = 'workspace';

  constructor() {
    super({ dbName: 'workspaceIDB', storeName: 'workspaces' });
  }

  async getAll(): Promise<Workspace[]> {
    return this.getMany();
  }
}

export const workspaceStorage = new WorkspaceStorage();
