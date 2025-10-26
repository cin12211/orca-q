import dayjs from 'dayjs';
import localforage from 'localforage';
import type { AppState } from '../services/useWsStateStore';
import { createLocalforageGateway } from './localforageGateway';

const workspaceStateIDBStore = localforage.createInstance({
  name: 'workspaceStateIDB',
  storeName: 'workspaceState',
});

const appStateGateway = createLocalforageGateway<AppState>(
  workspaceStateIDBStore
);

export const workspaceStateIDBApi = {
  getAll: async (): Promise<AppState[]> => {
    return await appStateGateway.getAll();
  },

  async create(state: AppState): Promise<AppState> {
    const data: AppState = {
      ...state,
      updatedAt: dayjs().toISOString(),
    };

    return await appStateGateway.setOne(data.id, data);
  },

  update: async (wsState: AppState): Promise<AppState | null> => {
    return await appStateGateway.update(wsState.id, {
      ...wsState,
      updatedAt: dayjs().toISOString(),
    });
  },

  delete: async (id: string): Promise<void> => {
    await appStateGateway.deleteOne(id);
  },
};
