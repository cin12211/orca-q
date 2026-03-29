import dayjs from 'dayjs';
import localforage from 'localforage';
import type { Workspace } from '../../../stores';
import type { WorkspacePersistApi } from '../../types';
import { connectionIDBAdapter } from './connection';
import { quickQueryLogsIDBAdapter } from './quick-query-logs';
import { rowQueryFilesIDBAdapter } from './row-query-files';
import { workspaceStateIDBAdapter } from './workspace-state';

const store = localforage.createInstance({
  name: 'workspaceIDB',
  storeName: 'workspaces',
});

export const workspaceIDBAdapter: WorkspacePersistApi = {
  getAll: async () => {
    const workspaces: Workspace[] = [];
    await store.iterate<Workspace, void>(value => {
      workspaces.push(value);
    });
    return workspaces.sort((a, b) =>
      (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    );
  },

  getOne: async id => {
    return store.getItem<Workspace>(id);
  },

  create: async workspace => {
    const entry: Workspace = {
      ...workspace,
      id: workspace.id || crypto.randomUUID(),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    await store.setItem(entry.id, entry);
    return entry;
  },

  update: async workspace => {
    const current = await store.getItem<Workspace>(workspace.id);
    if (!current) return null;

    const entry: Workspace = {
      ...workspace,
      updatedAt: dayjs().toISOString(),
    };
    await store.setItem(entry.id, entry);
    return entry;
  },

  delete: async id => {
    const workspace = await store.getItem<Workspace>(id);
    if (!workspace) return null;

    await store.removeItem(id);

    // Cascade delete related entities
    const connections = await connectionIDBAdapter.getByWorkspaceId(id);
    for (const conn of connections) {
      await connectionIDBAdapter.delete(conn.id);
    }
    await workspaceStateIDBAdapter.delete(id);
    await quickQueryLogsIDBAdapter.delete({ workspaceId: id });
    await rowQueryFilesIDBAdapter.deleteFileByWorkspaceId({ wsId: id });

    return workspace;
  },
};
