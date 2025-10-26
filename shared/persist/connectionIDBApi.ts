import dayjs from 'dayjs';
import localforage from 'localforage';
import type { Connection } from '../stores';
import { createLocalforageGateway } from './localforageGateway';
import { quickQueryLogsIDBApi } from './quickQueryLogsIDBApi';

const connectionsIDBStore = localforage.createInstance({
  name: 'connectionStoreIDB',
  storeName: 'connectionStore',
});

const gateway = createLocalforageGateway<Connection>(connectionsIDBStore);

const sortByCreatedAtAsc = (a: Connection, b: Connection) =>
  (a.createdAt ?? '').localeCompare(b.createdAt ?? '');

export const connectionIDBApi = {
  /** Lấy tất cả, sort theo createdAt */
  getAll: async (): Promise<Connection[]> => {
    const all = await gateway.getAll();
    return all.sort(sortByCreatedAtAsc);
  },

  /** Lấy theo workspaceId (dùng find để không phải load rồi filter ở ngoài) */
  getByWorkspaceId: async (workspaceId: string): Promise<Connection[]> => {
    const list = await gateway.find(c => c.workspaceId === workspaceId);
    return list.sort(sortByCreatedAtAsc);
  },

  /** Lấy 1 connection */
  getOne: async (id: string): Promise<Connection | null> => {
    return gateway.getOne(id);
  },

  /** Tạo mới (đảm bảo id + timestamps) */
  create: async (connection: Connection): Promise<Connection> => {
    const now = dayjs().toISOString();
    const data: Connection = {
      ...connection,
      id: connection.id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await gateway.setOne(data.id, data);
    return data;
  },

  /** Cập nhật merge theo id */
  update: async (connection: Connection): Promise<Connection | null> => {
    if (!connection?.id) return null;
    return gateway.update(connection.id, {
      ...connection,
      updatedAt: dayjs().toISOString(),
    });
  },

  /** Patch một phần theo id (tiện dùng trong UI) */
  patch: async (
    id: string,
    patch: Partial<Connection>
  ): Promise<Connection | null> => {
    return gateway.update(id, {
      ...patch,
      updatedAt: dayjs().toISOString(),
    });
  },

  /** Upsert: có thì merge, chưa có thì tạo */
  upsert: async (conn: Connection): Promise<Connection> => {
    const now = dayjs().toISOString();
    const base: Connection = {
      ...conn,
      id: conn.id || crypto.randomUUID(),
      createdAt: conn.createdAt || now,
      updatedAt: now,
    };
    return gateway.upsert(base, v => v.id);
  },

  /** Xoá 1 connection + dọn quickQueryLogs theo connectionId */
  delete: async (id: string): Promise<void> => {
    await gateway.deleteOne(id);
    await quickQueryLogsIDBApi.delete({ connectionId: id });
  },

  /** Xoá tất cả theo workspaceId (và dọn log từng cái) */
  deleteAllByWorkspaceId: async (workspaceId: string): Promise<void> => {
    const list = await connectionIDBApi.getByWorkspaceId(workspaceId);
    if (!list.length) return;

    // Xoá logs theo từng connection song song (không chặn nếu fail)
    await Promise.allSettled(
      list.map(c => quickQueryLogsIDBApi.delete({ connectionId: c.id }))
    );

    await gateway.deleteMany(list.map(c => c.id));
  },

  /** Xoá nhiều theo danh sách id (tuỳ nhu cầu UI) */
  deleteMany: async (ids: string[]): Promise<void> => {
    if (!ids?.length) return;
    await Promise.allSettled(
      ids.map(id => quickQueryLogsIDBApi.delete({ connectionId: id }))
    );
    await gateway.deleteMany(ids);
  },

  /** Dọn sạch store */
  clearAll: async (): Promise<void> => {
    await gateway.clear();
  },
};
