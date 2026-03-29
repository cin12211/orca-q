import dayjs from 'dayjs';
import type { Workspace } from '../../../stores';
import type { WorkspacePersistApi } from '../../types';
import {
  persistDelete,
  persistGetAll,
  persistGetOne,
  persistUpsert,
  sortByCreatedAt,
} from './primitives';
import { quickQueryLogsTauriAdapter } from './quick-query-logs';
import { rowQueryFilesTauriAdapter } from './row-query-files';
import { workspaceStateTauriAdapter } from './workspace-state';

export const workspaceTauriAdapter: WorkspacePersistApi = {
  getAll: async () => {
    return sortByCreatedAt(await persistGetAll<Workspace>('workspaces'));
  },

  getOne: async id => {
    return persistGetOne<Workspace>('workspaces', id);
  },

  create: async workspace => {
    const entry: Workspace = {
      ...workspace,
      id: workspace.id || crypto.randomUUID(),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    return persistUpsert<Workspace>('workspaces', entry.id, entry);
  },

  update: async workspace => {
    const current = await persistGetOne<Workspace>('workspaces', workspace.id);
    if (!current) return null;

    const entry: Workspace = {
      ...workspace,
      updatedAt: dayjs().toISOString(),
    };
    return persistUpsert<Workspace>('workspaces', entry.id, entry);
  },

  delete: async id => {
    const deleted = await persistDelete<Workspace>(
      'workspaces',
      [{ field: 'id', value: id }],
      'all'
    );

    const workspace = deleted[0] || null;
    if (!workspace) return null;

    // Cascade delete related entities
    await persistDelete(
      'connections',
      [{ field: 'workspaceId', value: id }],
      'all'
    );
    await persistDelete(
      'tabViews',
      [{ field: 'workspaceId', value: id }],
      'all'
    );
    await rowQueryFilesTauriAdapter.deleteFileByWorkspaceId({ wsId: id });
    await workspaceStateTauriAdapter.delete(id);
    await quickQueryLogsTauriAdapter.delete({ workspaceId: id });

    return workspace;
  },
};
