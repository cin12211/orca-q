import type { TabView } from '../../../stores';
import type {
  DeleteTabViewProps,
  GetTabViewsByContextProps,
  TabViewsPersistApi,
} from '../../types';
import {
  persistDelete,
  persistFind,
  persistGetAll,
  persistGetOne,
  persistUpsert,
  type PersistFilter,
} from './primitives';

export const tabViewsTauriAdapter: TabViewsPersistApi = {
  getAll: async () => {
    return persistGetAll<TabView>('tabViews');
  },

  getByContext: async ({
    workspaceId,
    connectionId,
  }: GetTabViewsByContextProps) => {
    return persistFind<TabView>(
      'tabViews',
      [
        { field: 'workspaceId', value: workspaceId },
        { field: 'connectionId', value: connectionId },
      ],
      'all'
    );
  },

  create: async tabView => {
    return persistUpsert<TabView>('tabViews', tabView.id, tabView);
  },

  update: async tabView => {
    const existing = await persistGetOne<TabView>('tabViews', tabView.id);
    if (!existing) return null;

    const updated = { ...existing, ...tabView };
    return persistUpsert<TabView>('tabViews', tabView.id, updated);
  },

  delete: async (props: DeleteTabViewProps) => {
    const filters: PersistFilter[] = [];
    if (props.id) filters.push({ field: 'id', value: props.id });
    if (props.connectionId)
      filters.push({ field: 'connectionId', value: props.connectionId });
    if (props.schemaId)
      filters.push({ field: 'schemaId', value: props.schemaId });

    const deleted = await persistDelete<TabView>('tabViews', filters, 'all');
    return deleted[0] || null;
  },

  bulkDelete: async propsArray => {
    const groups = await Promise.all(
      propsArray.map(props => tabViewsTauriAdapter.delete(props))
    );
    return groups.filter(Boolean) as TabView[];
  },
};
