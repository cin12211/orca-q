import dayjs from 'dayjs';
import type { Connection } from '../../../stores';
import type { ConnectionPersistApi } from '../../types';
import {
  persistDelete,
  persistFind,
  persistGetAll,
  persistGetOne,
  persistUpsert,
  sortByCreatedAt,
} from './primitives';

export const connectionTauriAdapter: ConnectionPersistApi = {
  getAll: async () => {
    return sortByCreatedAt(await persistGetAll<Connection>('connections'));
  },

  getByWorkspaceId: async workspaceId => {
    return sortByCreatedAt(
      await persistFind<Connection>(
        'connections',
        [{ field: 'workspaceId', value: workspaceId }],
        'all'
      )
    );
  },

  getOne: async id => {
    return persistGetOne<Connection>('connections', id);
  },

  create: async connection => {
    const entry: Connection = {
      ...connection,
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    return persistUpsert<Connection>('connections', entry.id, entry);
  },

  update: async connection => {
    const existing = await persistGetOne<Connection>(
      'connections',
      connection.id
    );
    if (!existing) return null;

    const updated: Connection = {
      ...existing,
      ...connection,
      updatedAt: dayjs().toISOString(),
    };
    return persistUpsert<Connection>('connections', updated.id, updated);
  },

  delete: async id => {
    const deleted = await persistDelete<Connection>(
      'connections',
      [{ field: 'id', value: id }],
      'all'
    );

    if (deleted.length) {
      // Cascade: delete tab views and query logs tied to this connection
      await persistDelete(
        'tabViews',
        [{ field: 'connectionId', value: id }],
        'all'
      );
      await persistDelete(
        'quickQueryLogs',
        [{ field: 'connectionId', value: id }],
        'all'
      );
    }

    return deleted[0] || null;
  },
};
