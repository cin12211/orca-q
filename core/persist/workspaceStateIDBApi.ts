import dayjs from 'dayjs';
import localforage from 'localforage';
import type { WorkspaceState } from '../stores';

const workspaceStateIDBStore = localforage.createInstance({
  name: 'workspaceStateIDB',
  storeName: 'workspaceState',
});

export const workspaceStateIDBApi = {
  getAll: async (): Promise<WorkspaceState[]> => {
    const keys = await workspaceStateIDBStore.keys();
    const results: WorkspaceState[] = [];
    for (const key of keys) {
      const item = await workspaceStateIDBStore.getItem<WorkspaceState>(key);
      if (item) results.push(item);
    }
    return results;
  },

  create: async (wsState: WorkspaceState): Promise<WorkspaceState> => {
    const id = wsState.id;
    const wsStateTmp: WorkspaceState = {
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };
    await workspaceStateIDBStore.setItem(id, wsStateTmp);
    return wsStateTmp;
  },

  update: async (wsState: WorkspaceState): Promise<WorkspaceState | null> => {
    const current = await workspaceStateIDBStore.getItem<WorkspaceState>(
      wsState.id
    );
    if (!current) return null;

    const wsStateTmp: WorkspaceState = {
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };

    await workspaceStateIDBStore.setItem(wsState.id, wsStateTmp);
    return wsStateTmp;
  },

  delete: async (id: string): Promise<void> => {
    await workspaceStateIDBStore.removeItem(id);
  },
};
