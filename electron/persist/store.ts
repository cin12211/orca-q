import Store from 'electron-store';

export type PersistCollection =
  | 'appConfig'
  | 'agentState'
  | 'workspaces'
  | 'workspaceState'
  | 'connections'
  | 'tabViews'
  | 'quickQueryLogs'
  | 'rowQueryFiles'
  | 'rowQueryFileContents';

export type RecordValue = Record<string, unknown>;

export interface PersistFilter {
  field: string;
  value: unknown;
}

export type PersistMatchMode = 'all' | 'any';

const COLLECTION_FILE_NAMES: Record<PersistCollection, string> = {
  appConfig: 'app-config',
  agentState: 'agent-state',
  workspaces: 'workspaces',
  workspaceState: 'workspace-state',
  connections: 'connections',
  tabViews: 'tab-views',
  quickQueryLogs: 'quick-query-logs',
  rowQueryFiles: 'row-query-files',
  rowQueryFileContents: 'row-query-file-contents',
};

type CollectionStore = Store<{ records: RecordValue[] }>;

// Cache store instances to avoid unnecessary re-creation
const storeCache = new Map<PersistCollection, CollectionStore>();

function getStore(collection: PersistCollection): CollectionStore {
  if (!storeCache.has(collection)) {
    // electron-store v11 uses a different constructor approach
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new (Store as any)({
      name: COLLECTION_FILE_NAMES[collection],
      defaults: { records: [] },
    }) as CollectionStore;
    storeCache.set(collection, store);
  }
  return storeCache.get(collection)!;
}

function getRecords(collection: PersistCollection): RecordValue[] {
  const store = getStore(collection);
  // electron-store v11: use store.store.records or store.get('records')
  return (store as unknown as { store: { records: RecordValue[] } }).store.records ?? [];
}

function setRecords(collection: PersistCollection, records: RecordValue[]): void {
  const store = getStore(collection);
  (store as unknown as { store: { records: RecordValue[] } }).store = { records };
}

function matchesFilters(
  record: RecordValue,
  filters: PersistFilter[],
  matchMode: PersistMatchMode
): boolean {
  if (filters.length === 0) return false;

  const results = filters.map(f => {
    const val = record[f.field];
    return JSON.stringify(val) === JSON.stringify(f.value);
  });

  return matchMode === 'all' ? results.every(Boolean) : results.some(Boolean);
}

// ─── Public API (mirrors persist.rs commands exactly) ────────────────────────

export function persistGetAll(collection: PersistCollection): RecordValue[] {
  return getRecords(collection);
}

export function persistGetOne(
  collection: PersistCollection,
  id: string
): RecordValue | null {
  return getRecords(collection).find(r => r['id'] === id) ?? null;
}

export function persistFind(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode
): RecordValue[] {
  return getRecords(collection).filter(r => matchesFilters(r, filters, matchMode));
}

export function persistUpsert(
  collection: PersistCollection,
  id: string,
  value: RecordValue
): RecordValue {
  const records = getRecords(collection);
  const normalized = { ...value, id };
  const index = records.findIndex(r => r['id'] === id);

  if (index >= 0) {
    records[index] = normalized;
  } else {
    records.push(normalized);
  }

  setRecords(collection, records);
  return normalized;
}

export function persistDelete(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode
): RecordValue[] {
  const records = getRecords(collection);
  const deleted: RecordValue[] = [];
  const retained: RecordValue[] = [];

  for (const record of records) {
    if (matchesFilters(record, filters, matchMode)) {
      deleted.push(record);
    } else {
      retained.push(record);
    }
  }

  if (deleted.length > 0) {
    setRecords(collection, retained);
  }

  return deleted;
}

export function persistReplaceAll(
  collection: PersistCollection,
  values: RecordValue[]
): void {
  setRecords(collection, values);
}
