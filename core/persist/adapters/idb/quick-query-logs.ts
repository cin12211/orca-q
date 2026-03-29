import dayjs from 'dayjs';
import localforage from 'localforage';
import type { QuickQueryLog } from '../../../stores/useQuickQueryLogs';
import type {
  DeleteQQueryLogsProps,
  GetQQueryLogsProps,
  QuickQueryLogsPersistApi,
} from '../../types';

const store = localforage.createInstance({
  name: 'quickQueryLogsIDB',
  storeName: 'quickQueryLogs',
});

const sortByCreatedAt = (logs: QuickQueryLog[]): QuickQueryLog[] =>
  [...logs].sort(
    (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
  );

export const quickQueryLogsIDBAdapter: QuickQueryLogsPersistApi = {
  getAll: async () => {
    const all: QuickQueryLog[] = [];
    const keys = await store.keys();
    for (const key of keys) {
      const item = await store.getItem<QuickQueryLog>(key);
      if (item) all.push(item);
    }
    return sortByCreatedAt(all);
  },

  getByContext: async ({ connectionId }: GetQQueryLogsProps) => {
    const all = await quickQueryLogsIDBAdapter.getAll();
    return sortByCreatedAt(
      all.filter(log => log.connectionId === connectionId)
    );
  },

  create: async qqLog => {
    const entry: QuickQueryLog = {
      ...qqLog,
      createdAt: qqLog.createdAt || dayjs().toISOString(),
    };
    await store.setItem(entry.id, entry);
    return entry;
  },

  update: async qqLog => {
    const existing = await store.getItem<QuickQueryLog>(qqLog.id);
    if (!existing) return null;

    const updated: QuickQueryLog = { ...existing, ...qqLog };
    await store.setItem(qqLog.id, updated);
    return updated;
  },

  delete: async (props: DeleteQQueryLogsProps) => {
    const all = await quickQueryLogsIDBAdapter.getAll();

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
      if ('connectionId' in props)
        return log.connectionId === props.connectionId;
      return false;
    };

    const toDelete = all.filter(shouldDelete);
    for (const log of toDelete) {
      await store.removeItem(log.id);
    }
  },
};
