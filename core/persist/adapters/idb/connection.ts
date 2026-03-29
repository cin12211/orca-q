import dayjs from 'dayjs';
import localforage from 'localforage';
import type { Connection } from '../../../stores';
import type { ConnectionPersistApi } from '../../types';
import { quickQueryLogsIDBAdapter } from './quick-query-logs';

const store = localforage.createInstance({
  name: 'connectionStoreIDB',
  storeName: 'connectionStore',
});

export const connectionIDBAdapter: ConnectionPersistApi = {
  getAll: async () => {
    const all: Connection[] = [];
    const keys = await store.keys();
    for (const key of keys) {
      const item = await store.getItem<Connection>(key);
      if (item) all.push(item);
    }
    return all.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
    );
  },

  getByWorkspaceId: async workspaceId => {
    const all = await connectionIDBAdapter.getAll();
    return all.filter(c => c.workspaceId === workspaceId);
  },

  getOne: async id => {
    return store.getItem<Connection>(id);
  },

  create: async connection => {
    const entry: Connection = {
      ...connection,
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    await store.setItem(entry.id, entry);
    return entry;
  },

  update: async connection => {
    const existing = await store.getItem<Connection>(connection.id);
    if (!existing) return null;

    const updated: Connection = {
      ...existing,
      ...connection,
      updatedAt: dayjs().toISOString(),
    };
    await store.setItem(updated.id, updated);
    return updated;
  },

  delete: async id => {
    await store.removeItem(id);
    await quickQueryLogsIDBAdapter.delete({ connectionId: id });
  },
};
