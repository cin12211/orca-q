import type { QuickQueryLog } from '../../../stores/useQuickQueryLogs';
import type {
  DeleteQQueryLogsProps,
  GetQQueryLogsProps,
  QuickQueryLogsPersistApi,
} from '../../types';
import {
  persistDelete,
  persistFind,
  persistGetAll,
  persistGetOne,
  persistUpsert,
  sortByCreatedAt,
  type PersistFilter,
} from './primitives';

export const quickQueryLogsTauriAdapter: QuickQueryLogsPersistApi = {
  getAll: async () => {
    return sortByCreatedAt(
      await persistGetAll<QuickQueryLog>('quickQueryLogs')
    );
  },

  getByContext: async ({ connectionId }: GetQQueryLogsProps) => {
    return sortByCreatedAt(
      await persistFind<QuickQueryLog>(
        'quickQueryLogs',
        [{ field: 'connectionId', value: connectionId }],
        'all'
      )
    );
  },

  create: async qqLog => {
    return persistUpsert<QuickQueryLog>('quickQueryLogs', qqLog.id, qqLog);
  },

  update: async qqLog => {
    const existing = await persistGetOne<QuickQueryLog>(
      'quickQueryLogs',
      qqLog.id
    );
    if (!existing) return null;

    const updated: QuickQueryLog = { ...existing, ...qqLog };
    return persistUpsert<QuickQueryLog>('quickQueryLogs', qqLog.id, updated);
  },

  delete: async (props: DeleteQQueryLogsProps) => {
    const filters: PersistFilter[] = [];

    if ('workspaceId' in props)
      filters.push({ field: 'workspaceId', value: props.workspaceId });
    if ('connectionId' in props)
      filters.push({ field: 'connectionId', value: props.connectionId });
    if ('schemaName' in props)
      filters.push({ field: 'schemaName', value: props.schemaName });
    if ('tableName' in props)
      filters.push({ field: 'tableName', value: props.tableName });

    await persistDelete<QuickQueryLog>('quickQueryLogs', filters, 'all');
  },
};
