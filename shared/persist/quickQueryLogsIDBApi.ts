import dayjs from 'dayjs';
import localforage from 'localforage';
import type {
  DeleteQQueryLogsProps,
  GetQQueryLogsProps,
} from '~/electron/src/main/ipc/quickQueryLogs';
import type { QuickQueryLog } from '../stores';

const quickQueryLogsIDBStore = localforage.createInstance({
  name: 'quickQueryLogsIDB',
  storeName: 'quickQueryLogs',
});

export const quickQueryLogsIDBApi = {
  getAll: async (): Promise<QuickQueryLog[]> => {
    const keys = await quickQueryLogsIDBStore.keys();
    const all: QuickQueryLog[] = [];
    for (const key of keys) {
      const item = await quickQueryLogsIDBStore.getItem<QuickQueryLog>(key);
      if (item) all.push(item);
    }
    return all.sort(
      (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
    );
  },

  getByContext: async ({
    connectionId,
  }: GetQQueryLogsProps): Promise<QuickQueryLog[]> => {
    const logs = await quickQueryLogsIDBApi.getAll();
    return logs
      .filter(log => log.connectionId === connectionId)
      .sort(
        (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
      );
  },

  create: async (qqLog: QuickQueryLog): Promise<QuickQueryLog> => {
    const log: QuickQueryLog = {
      ...qqLog,
      createdAt: qqLog.createdAt || dayjs().toISOString(),
    };
    await quickQueryLogsIDBStore.setItem(log.id, log);
    return log;
  },

  update: async (qqLog: QuickQueryLog): Promise<QuickQueryLog | null> => {
    const existing = await quickQueryLogsIDBStore.getItem<QuickQueryLog>(
      qqLog.id
    );
    if (!existing) return null;

    const updated: QuickQueryLog = {
      ...existing,
      ...qqLog,
    };
    await quickQueryLogsIDBStore.setItem(qqLog.id, updated);
    return updated;
  },

  delete: async (props: DeleteQQueryLogsProps): Promise<void> => {
    const logs = await quickQueryLogsIDBApi.getAll();

    const shouldDelete = (log: QuickQueryLog) => {
      if ('workspaceId' in props) return log.workspaceId === props.workspaceId;

      if (
        'connectionId' in props &&
        'schemaName' in props &&
        'tableName' in props
      ) {
        return (
          log.connectionId === props.connectionId &&
          log.schemaName === props.schemaName &&
          log.tableName === props.tableName
        );
      }

      if ('connectionId' in props) {
        return log.connectionId === props.connectionId;
      }

      return false;
    };

    const toDelete = logs.filter(shouldDelete);
    for (const log of toDelete) {
      await quickQueryLogsIDBStore.removeItem(log.id);
    }
  },
};
