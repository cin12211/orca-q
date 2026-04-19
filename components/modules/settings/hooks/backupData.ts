import type { PersistCollection } from '~/core/persist/adapters/idb/primitives';
import {
  getPlatformStorage,
  type PlatformStorage,
} from '~/core/persist/storage-adapter';

type LocalStorageSnapshot = Record<string, string>;

export interface BackupData {
  /** Legacy backup field kept only for importing older JSON files. */
  version?: number;
  exportedAt?: string;
  /** Names of all migrations applied in the exporting app at export time. */
  schemaVersion?: string[];
  localStorage?: LocalStorageSnapshot;
  persist: Partial<Record<PersistCollection, unknown[]>>;
}

export function createBackupData(
  persist: Record<PersistCollection, unknown[]>,
  schemaVersion: Iterable<string>,
  localStorage: LocalStorageSnapshot
): BackupData {
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: [...schemaVersion],
    localStorage,
    persist,
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
