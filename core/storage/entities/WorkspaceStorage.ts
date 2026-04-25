import type { Workspace } from '~/core/types/entities';
import { WORKSPACE_IDB } from '../idbRegistry';
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
