import { describe, expect, it } from 'vitest';
import {
  createBackupData,
  getBackupSchemaVersion,
  isBackupData,
  restoreLocalStorageSnapshot,
  snapshotLocalStorage,
} from '~/components/modules/settings/hooks/backupData';
import type { PersistCollection } from '~/core/persist/adapters/idb/primitives';

function createPersist(): Record<PersistCollection, unknown[]> {
  return {
    appConfig: [],
    agentState: [],
    workspaces: [],
    workspaceState: [],
    connections: [],
    tabViews: [],
    quickQueryLogs: [],
    rowQueryFiles: [],
    rowQueryFileContents: [],
    'environment-tags': [],
    migrationState: [],
  };
}

describe('backupData helpers', () => {
  it('creates new backups without the legacy top-level agent payload', () => {
    const backup = createBackupData(createPersist(), ['v1'], {
      foo: 'bar',
    });

    expect(backup.version).toBeUndefined();
    expect(backup.localStorage).toEqual({ foo: 'bar' });
    expect(backup.schemaVersion).toEqual(['v1']);
  });

  it('accepts both new backups without version and old backups with version', () => {
    expect(isBackupData({ persist: createPersist() })).toBe(true);
    expect(isBackupData({ version: 1, persist: createPersist() })).toBe(true);
    expect(isBackupData({ version: 1 })).toBe(false);
  });

  it('prefers persisted migrationState over schemaVersion', () => {
    const backup = createBackupData(createPersist(), ['old-name'], {});
    backup.persist.migrationState = [
      { id: 'applied-migrations', names: ['new-name'] },
    ];

    expect(getBackupSchemaVersion(backup)).toEqual(['new-name']);
  });

  it('falls back to schemaVersion for older backups without migrationState', () => {
    const backup = createBackupData(createPersist(), ['legacy-name'], {});

    expect(getBackupSchemaVersion(backup)).toEqual(['legacy-name']);
  });

  it('snapshots every localStorage key/value pair', () => {
    const storage = {
      length: 2,
      key: (index: number) => ['alpha', 'beta'][index] ?? null,
      getItem: (key: string) => ({ alpha: '1', beta: '2' })[key] ?? null,
    };

    expect(snapshotLocalStorage(storage)).toEqual({
      alpha: '1',
      beta: '2',
    });
  });

  it('clears and restores localStorage from a snapshot', () => {
    const calls: string[] = [];
    const storage = {
      clear: () => {
        calls.push('clear');
      },
      setItem: (key: string, value: string) => {
        calls.push(`set:${key}=${value}`);
      },
      getItem: () => null,
      removeItem: () => {},
    };

    restoreLocalStorageSnapshot({ alpha: '1', beta: '2' }, storage);

    expect(calls).toEqual(['clear', 'set:alpha=1', 'set:beta=2']);
  });
});
