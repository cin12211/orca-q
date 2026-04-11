/**
 * Generic read-all / write-all helpers for IDB that mirror the
 * `persistGetAll` / `persistReplaceAll` primitives.
 *
 * Each entry maps to the exact same localforage instance as the individual
 * adapter files, so both paths read/write the same IndexedDB stores.
 */
import localforage from 'localforage';

export type PersistCollection =
  | 'appConfig'
  | 'agentState'
  | 'workspaces'
  | 'workspaceState'
  | 'connections'
  | 'tabViews'
  | 'quickQueryLogs'
  | 'rowQueryFiles'
  | 'rowQueryFileContents'
  | 'environment-tags';

export const PERSIST_COLLECTIONS: PersistCollection[] = [
  'appConfig',
  'agentState',
  'workspaces',
  'workspaceState',
  'connections',
  'tabViews',
  'quickQueryLogs',
  'rowQueryFiles',
  'rowQueryFileContents',
  'environment-tags',
];

// Mirror the storeName/name pairs from each individual adapter
const IDB_STORES: Record<PersistCollection, LocalForage> = {
  appConfig: localforage.createInstance({
    name: 'appConfigIDB',
    storeName: 'appConfig',
  }),
  agentState: localforage.createInstance({
    name: 'agentStateIDB',
    storeName: 'agentState',
  }),
  workspaces: localforage.createInstance({
    name: 'workspaceIDB',
    storeName: 'workspaces',
  }),
  workspaceState: localforage.createInstance({
    name: 'workspaceStateIDB',
    storeName: 'workspaceState',
  }),
  connections: localforage.createInstance({
    name: 'connectionStoreIDB',
    storeName: 'connectionStore',
  }),
  tabViews: localforage.createInstance({
    name: 'tabViewsIDB',
    storeName: 'tabViews',
  }),
  quickQueryLogs: localforage.createInstance({
    name: 'quickQueryLogsIDB',
    storeName: 'quickQueryLogs',
  }),
  rowQueryFiles: localforage.createInstance({
    name: 'rowQueryFileIDBStore',
    storeName: 'rowQueryFiles',
  }),
  rowQueryFileContents: localforage.createInstance({
    name: 'rowQueryFileContentIDBStore',
    storeName: 'rowQueryFileContents',
  }),
  'environment-tags': localforage.createInstance({
    name: 'environmentTagIDB',
    storeName: 'environmentTags',
  }),
};

/** Read all records from an IDB collection. */
export async function idbGetAll<T>(
  collection: PersistCollection
): Promise<T[]> {
  const store = IDB_STORES[collection];
  const keys = await store.keys();
  const results: T[] = [];
  for (const key of keys) {
    const item = await store.getItem<T>(key);
    if (item !== null) results.push(item);
  }
  return results;
}

/**
 * Replace all records in an IDB collection.
 * Each record must have an `id` property used as the store key.
 */
export async function idbReplaceAll<T extends { id: string }>(
  collection: PersistCollection,
  values: T[]
): Promise<void> {
  const store = IDB_STORES[collection];
  await store.clear();
  for (const item of values) {
    await store.setItem(item.id, item);
  }
}
