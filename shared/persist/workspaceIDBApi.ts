import dayjs from 'dayjs';
import localforage from 'localforage';
import type { Workspace } from '../stores';
import { createLocalforageGateway } from './localforageGateway';

const workspaceIDB = localforage.createInstance({
  name: 'workspaceIDB',
  storeName: 'workspaces',
});

const workspaceGateway = createLocalforageGateway<Workspace>(workspaceIDB);

export const workspaceIDBApi: Window['workspaceApi'] = {
  async getAll() {
    const workspaces = await workspaceGateway.getAll();
    return workspaces.sort((a, b) => a.createdAt!.localeCompare(b.createdAt!));
  },

  async getOne(id: string) {
    return await workspaceGateway.getOne(id);
  },

  async create(workspace: Workspace) {
    const data: Workspace = {
      ...workspace,
      id: workspace.id || crypto.randomUUID(),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    await workspaceGateway.setOne(data.id, data);
    return data;
  },

  async update(workspace: Workspace) {
    return await workspaceGateway.update(workspace.id, {
      ...workspace,
      updatedAt: dayjs().toISOString(),
    });
  },

  async delete(id: string) {
    const ws = await workspaceGateway.getOne(id);
    if (!ws) return null;
    await workspaceGateway.deleteOne(id);
    // await connectionIDBApi.deleteAllByWorkspaceId(id);
    // await quickQueryLogsIDBApi.delete({ workspaceId: id });
    return ws;
  },
};

// export const workspaceIDBApi: Window['workspaceApi'] = {
//   getAll: async () => await handleGets(),
//   getOne: async (id: string) => await handleGetOne(id),
//   create: async (workspace: Workspace) => await handleCreate(workspace),
//   update: async (workspace: Workspace) => await handleUpdate(workspace),
//   delete: async (id: string) => await handleDelete(id),
// };
