import dayjs from 'dayjs';
import localforage from 'localforage';
import type { Connection } from '../stores';
import { quickQueryLogsIDBApi } from './quickQueryLogsIDBApi';

const connectionsIDBStore = localforage.createInstance({
  name: 'connectionStoreIDB',
  storeName: 'connectionStore',
});

export const connectionIDBApi = {
  getAll: async (): Promise<Connection[]> => {
    const keys = await connectionsIDBStore.keys();
    const all: Connection[] = [];
    for (const key of keys) {
      const item = await connectionsIDBStore.getItem<Connection>(key);
      if (item) all.push(item);
    }
    return all.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
    );
  },

  getByWorkspaceId: async (workspaceId: string): Promise<Connection[]> => {
    const all = await connectionIDBApi.getAll();
    return all.filter(c => c.workspaceId === workspaceId);
  },

  getOne: async (id: string): Promise<Connection | null> => {
    return connectionsIDBStore.getItem<Connection>(id);
  },

  create: async (connection: Connection): Promise<Connection> => {
    const connectionTmp: Connection = {
      ...connection,
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    await connectionsIDBStore.setItem(connectionTmp.id, connectionTmp);
    return connectionTmp;
  },

  update: async (connection: Connection): Promise<Connection | null> => {
    const existing = await connectionsIDBStore.getItem<Connection>(
      connection.id
    );
    if (!existing) return null;

    const updated: Connection = {
      ...existing,
      ...connection,
      updatedAt: dayjs().toISOString(),
    };
    await connectionsIDBStore.setItem(updated.id, updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await connectionsIDBStore.removeItem(id);
    await quickQueryLogsIDBApi.delete({ connectionId: id });
  },

  deleteAllByWorkspaceId: async (workspaceId: string): Promise<void> => {
    const all = await connectionIDBApi.getAll();
    const toDelete = all.filter(c => c.workspaceId === workspaceId);
    for (const conn of toDelete) {
      await connectionsIDBStore.removeItem(conn.id);
    }
  },
};
