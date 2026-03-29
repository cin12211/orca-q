import localforage from 'localforage';
import type { TabView } from '../../../stores';
import type {
  DeleteTabViewProps,
  GetTabViewsByContextProps,
  TabViewsPersistApi,
} from '../../types';

const store = localforage.createInstance({
  name: 'tabViewsIDB',
  storeName: 'tabViews',
});

export const tabViewsIDBAdapter: TabViewsPersistApi = {
  getAll: async () => {
    const all: TabView[] = [];
    const keys = await store.keys();
    for (const key of keys) {
      const item = await store.getItem<TabView>(key);
      if (item) all.push(item);
    }
    return all;
  },

  getByContext: async ({
    workspaceId,
    connectionId,
  }: GetTabViewsByContextProps) => {
    const all = await tabViewsIDBAdapter.getAll();
    return all.filter(
      tv => tv.workspaceId === workspaceId && tv.connectionId === connectionId
    );
  },

  create: async tabView => {
    await store.setItem(tabView.id, tabView);
    return tabView;
  },

  update: async tabView => {
    const existing = await store.getItem<TabView>(tabView.id);
    if (!existing) return null;
    const updated = { ...existing, ...tabView };
    await store.setItem(tabView.id, updated);
    return updated;
  },

  delete: async (props: DeleteTabViewProps) => {
    const all = await tabViewsIDBAdapter.getAll();

    const shouldDelete = (tv: TabView) => {
      if (props.id) return tv.id === props.id;
      if (props.connectionId && props.schemaId) {
        return (
          tv.connectionId === props.connectionId &&
          tv.schemaId === props.schemaId
        );
      }
      if (props.connectionId) return tv.connectionId === props.connectionId;
      return false;
    };

    const toDelete = all.filter(shouldDelete);
    for (const tv of toDelete) {
      await store.removeItem(tv.id);
    }
  },

  bulkDelete: async propsArray => {
    await Promise.all(
      propsArray.map(props => tabViewsIDBAdapter.delete(props))
    );
  },
};
