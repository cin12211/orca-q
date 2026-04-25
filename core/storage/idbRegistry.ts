export interface IDBStoreConfig {
  dbName: string;
  storeName: string;
}

export const APP_CONFIG_IDB = {
  dbName: 'appConfigIDB',
  storeName: 'appConfig',
} as const satisfies IDBStoreConfig;

export const AGENT_STATE_IDB = {
  dbName: 'agentStateIDB',
  storeName: 'agentState',
} as const satisfies IDBStoreConfig;

export const WORKSPACE_IDB = {
  dbName: 'workspaceIDB',
  storeName: 'workspaces',
} as const satisfies IDBStoreConfig;

export const WORKSPACE_STATE_IDB = {
  dbName: 'workspaceStateIDB',
  storeName: 'workspaceState',
} as const satisfies IDBStoreConfig;

export const CONNECTION_IDB = {
  dbName: 'connectionStoreIDB',
  storeName: 'connectionStore',
} as const satisfies IDBStoreConfig;

export const TAB_VIEW_IDB = {
  dbName: 'tabViewsIDB',
  storeName: 'tabViews',
} as const satisfies IDBStoreConfig;

export const QUICK_QUERY_LOG_IDB = {
  dbName: 'quickQueryLogsIDB',
  storeName: 'quickQueryLogs',
} as const satisfies IDBStoreConfig;

export const ROW_QUERY_FILE_IDB = {
  dbName: 'rowQueryFileIDBStore',
  storeName: 'rowQueryFiles',
} as const satisfies IDBStoreConfig;

export const ROW_QUERY_FILE_CONTENT_IDB = {
  dbName: 'rowQueryFileContentIDBStore',
  storeName: 'rowQueryFileContents',
} as const satisfies IDBStoreConfig;

export const ENVIRONMENT_TAG_IDB = {
  dbName: 'environmentTagIDB',
  storeName: 'environmentTags',
} as const satisfies IDBStoreConfig;

export const MIGRATION_STATE_IDB = {
  dbName: 'migrationStateIDB',
  storeName: 'migrationState',
} as const satisfies IDBStoreConfig;

export const PERSIST_COLLECTIONS = [
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
  'migrationState',
] as const;

export type PersistCollection = (typeof PERSIST_COLLECTIONS)[number];

// Query Builder state stays in localStorage for both web and Electron renderer,
// so Electron persist collections are the same set used by backup/import flows.
export type ElectronPersistCollection = PersistCollection;

export const PERSIST_IDB_STORES = {
  appConfig: APP_CONFIG_IDB,
  agentState: AGENT_STATE_IDB,
  workspaces: WORKSPACE_IDB,
  workspaceState: WORKSPACE_STATE_IDB,
  connections: CONNECTION_IDB,
  tabViews: TAB_VIEW_IDB,
  quickQueryLogs: QUICK_QUERY_LOG_IDB,
  rowQueryFiles: ROW_QUERY_FILE_IDB,
  rowQueryFileContents: ROW_QUERY_FILE_CONTENT_IDB,
  'environment-tags': ENVIRONMENT_TAG_IDB,
  migrationState: MIGRATION_STATE_IDB,
} as const satisfies Record<PersistCollection, IDBStoreConfig>;
