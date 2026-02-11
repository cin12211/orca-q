import localforage from 'localforage';
import type {
  DeleteTabViewProps,
  GetTabViewsByContextProps,
} from '~/electron/src/main/ipc/tabViews';
import type { TabView } from '../stores';

const tabViewsIDBStore = localforage.createInstance({
  name: 'tabViewsIDB',
  storeName: 'tabViews',
});

export const tabViewsIDBApi = {
  getAll: async (): Promise<TabView[]> => {
    const keys = await tabViewsIDBStore.keys();
    const all: TabView[] = [];
    for (const key of keys) {
      const item = await tabViewsIDBStore.getItem<TabView>(key);
      if (item) all.push(item);
    }
    return all;
  },

  getByContext: async ({
    workspaceId,
    connectionId,
  }: GetTabViewsByContextProps): Promise<TabView[]> => {
    const all = await tabViewsIDBApi.getAll();
    return all.filter(
      tv => tv.workspaceId === workspaceId && tv.connectionId === connectionId
    );
  },

  create: async (tabView: TabView): Promise<TabView> => {
    await tabViewsIDBStore.setItem(tabView.id, tabView);
    return tabView;
  },

  update: async (tabView: TabView): Promise<TabView | null> => {
    const existing = await tabViewsIDBStore.getItem<TabView>(tabView.id);
    if (!existing) return null;
    const updated = { ...existing, ...tabView };
    await tabViewsIDBStore.setItem(tabView.id, updated);
    return updated;
  },

  delete: async (props: DeleteTabViewProps): Promise<void> => {
    const all = await tabViewsIDBApi.getAll();

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
      await tabViewsIDBStore.removeItem(tv.id);
    }
  },

  bulkDelete: async (propsArray: DeleteTabViewProps[]): Promise<void> => {
    const promises = propsArray.map(props => tabViewsIDBApi.delete(props));
    await Promise.all(promises);
  },
};
