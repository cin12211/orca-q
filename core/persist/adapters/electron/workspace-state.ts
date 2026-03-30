import dayjs from 'dayjs';
import type { WorkspaceState } from '../../../stores/useWSStateStore';
import type { WorkspaceStatePersistApi } from '../../types';
import {
  persistDelete,
  persistGetAll,
  persistGetOne,
  persistUpsert,
} from './primitives';

export const workspaceStateElectronAdapter: WorkspaceStatePersistApi = {
  getAll: async () => {
    return persistGetAll<WorkspaceState>('workspaceState');
  },

  create: async wsState => {
    const entry: WorkspaceState = {
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };
    return persistUpsert<WorkspaceState>('workspaceState', entry.id, entry);
  },

  update: async wsState => {
    const current = await persistGetOne<WorkspaceState>('workspaceState', wsState.id);
    if (!current) return null;

    const entry: WorkspaceState = {
      ...current,
      ...wsState,
      updatedAt: dayjs().toISOString(),
    };
    return persistUpsert<WorkspaceState>('workspaceState', wsState.id, entry);
  },

  delete: async id => {
    const deleted = await persistDelete<WorkspaceState>(
      'workspaceState',
      [{ field: 'id', value: id }],
      'all'
    );
    return deleted[0] || null;
  },
};
