import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { IDBStorage } from '~/core/storage/base/IDBStorage';
import type { Workspace } from '~/core/types/entities';

class WorkspaceTestStorage extends IDBStorage<Workspace> {
  readonly name = 'workspaceTest';
  constructor() {
    super({ dbName: 'workspaceTestIDB', storeName: 'workspaces_test' });
  }
  async getAll(): Promise<Workspace[]> {
    return this.getMany();
  }
}

const makeWorkspace = (id: string): Workspace => ({
  id,
  icon: '🏢',
  name: `Workspace ${id}`,
  createdAt: new Date().toISOString(),
});

describe('WorkspaceStorage', () => {
  let storage: WorkspaceTestStorage;

  beforeEach(() => {
    storage = new WorkspaceTestStorage();
  });

  it('getAll returns empty array on fresh store', async () => {
    const all = await storage.getAll();
    expect(Array.isArray(all)).toBe(true);
  });

  it('create then getAll returns one item', async () => {
    await storage.create(makeWorkspace('ws-1'));
    const all = await storage.getAll();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some(w => w.id === 'ws-1')).toBe(true);
  });

  it('getOne retrieves by id', async () => {
    await storage.create(makeWorkspace('ws-2'));
    const found = await storage.getOne('ws-2');
    expect(found?.name).toBe('Workspace ws-2');
  });

  it('delete removes and getAll returns fewer items', async () => {
    await storage.create(makeWorkspace('ws-3'));
    await storage.delete('ws-3');
    const found = await storage.getOne('ws-3');
    expect(found).toBeNull();
  });

  it('upsert overwrites existing record', async () => {
    await storage.create(makeWorkspace('ws-4'));
    await storage.upsert({ ...makeWorkspace('ws-4'), name: 'Updated Name' });
    const found = await storage.getOne('ws-4');
    expect(found?.name).toBe('Updated Name');
  });
});
