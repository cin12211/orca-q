import {
  getPlatformStorage,
  type PlatformStorage,
} from '~/core/persist/storage-adapter';
import {
  PERSIST_COLLECTIONS,
  type PersistCollection,
} from '~/core/storage/idbRegistry';

type LocalStorageSnapshot = Record<string, string>;
export type BackupPersistData = Partial<Record<PersistCollection, unknown[]>>;

export interface BackupSummaryItem {
  collection: PersistCollection;
  count: number;
}

export interface BackupSummary {
  collections: BackupSummaryItem[];
  totalCollections: number;
  totalRecords: number;
  localStorageKeys: number;
}

export interface BackupData {
  /** Legacy backup field kept only for importing older JSON files. */
  version?: number;
  exportedAt?: string;
  /** Names of all migrations applied in the exporting app at export time. */
  schemaVersion?: string[];
  localStorage?: LocalStorageSnapshot;
  persist: BackupPersistData;
}

export function createEmptyPersistData(): Record<PersistCollection, unknown[]> {
  // Query Builder UI state is intentionally excluded because it stays in
  // localStorage on both web and Electron renderer.
  return Object.fromEntries(
    PERSIST_COLLECTIONS.map(collection => [collection, []])
  ) as unknown as Record<PersistCollection, unknown[]>;
}

export function normalizeBackupPersistData(
  persist?: BackupPersistData
): Record<PersistCollection, unknown[]> {
  const normalized = createEmptyPersistData();

  if (!persist) {
    return normalized;
  }

  for (const collection of PERSIST_COLLECTIONS) {
    const values = persist[collection];
    normalized[collection] = Array.isArray(values) ? values : [];
  }

  return normalized;
}

export async function collectBackupPersistData(
  loadCollection: (collection: PersistCollection) => Promise<unknown[]>,
  onStep?: (done: number, total: number) => void
): Promise<Record<PersistCollection, unknown[]>> {
  const persist = createEmptyPersistData();

  for (let index = 0; index < PERSIST_COLLECTIONS.length; index++) {
    const collection = PERSIST_COLLECTIONS[index]!;
    persist[collection] = await loadCollection(collection);
    onStep?.(index + 1, PERSIST_COLLECTIONS.length);
  }

  return persist;
}

export function summarizeBackupData(data: BackupData): BackupSummary {
  const persist = normalizeBackupPersistData(data.persist);
  const collections = PERSIST_COLLECTIONS.map(collection => ({
    collection,
    count: persist[collection].length,
  }));

  return {
    collections,
    totalCollections: collections.filter(item => item.count > 0).length,
    totalRecords: collections.reduce((total, item) => total + item.count, 0),
    localStorageKeys: Object.keys(data.localStorage ?? {}).length,
  };
}

export function createBackupData(
  persist: BackupPersistData,
  schemaVersion: Iterable<string>,
  localStorage: LocalStorageSnapshot
): BackupData {
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: [...schemaVersion],
    localStorage,
    persist: normalizeBackupPersistData(persist),
  };
}

export function isBackupData(value: unknown): value is BackupData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'persist' in value &&
    typeof (value as BackupData).persist === 'object' &&
    (value as BackupData).persist !== null
  );
}

export function getBackupSchemaVersion(data: BackupData): string[] {
  const migrationRecord = data.persist.migrationState?.[0] as
    | { names?: string[] }
    | undefined;

  return migrationRecord?.names ?? data.schemaVersion ?? [];
}

function getBrowserStorage(): Storage {
  return localStorage;
}

export function snapshotLocalStorage(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'> = getBrowserStorage()
): LocalStorageSnapshot {
  const snapshot: LocalStorageSnapshot = {};

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;

    const value = storage.getItem(key);
    if (value !== null) {
      snapshot[key] = value;
    }
  }

  return snapshot;
}

export function restoreLocalStorageSnapshot(
  snapshot: LocalStorageSnapshot,
  storage: PlatformStorage = getPlatformStorage()
): void {
  const browserStorage = storage as PlatformStorage & { clear?: () => void };
  browserStorage.clear?.();

  for (const [key, value] of Object.entries(snapshot)) {
    storage.setItem(key, value);
  }
}

export function mergeLocalStorageSnapshot(
  snapshot: LocalStorageSnapshot,
  storage: PlatformStorage = getPlatformStorage()
): void {
  for (const [key, value] of Object.entries(snapshot)) {
    storage.setItem(key, value);
  }
}
