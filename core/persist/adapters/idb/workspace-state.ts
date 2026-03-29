import dayjs from 'dayjs';
import localforage from 'localforage';
import type { WorkspaceState } from '../../../stores/useWSStateStore';
import type { WorkspaceStatePersistApi } from '../../types';

const store = localforage.createInstance({
  name: 'workspaceStateIDB',
  storeName: 'workspaceState',
});

export const workspaceStateIDBAdapter: WorkspaceStatePersistApi = {
  getAll: async () => {
    const results: WorkspaceState[] = [];
    const keys = await store.keys();
    for (const key of keys) {
      const item = await store.getItem<WorkspaceState>(key);
      if (item) results.push(item);
    }
    return results;
  },

  create: async wsState => {
    const entry: WorkspaceState = {
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };
    await store.setItem(entry.id, entry);
    return entry;
  },

  update: async wsState => {
    const current = await store.getItem<WorkspaceState>(wsState.id);
    if (!current) return null;

    const entry: WorkspaceState = {
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };
    await store.setItem(wsState.id, entry);
    return entry;
  },

  delete: async id => {
    await store.removeItem(id);
  },
};
