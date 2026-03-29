/**
 * One-time migration: copies all IndexedDB data into the Tauri native
 * persist store the first time a user runs the desktop app.
 *
 * Only executed when:
 *  1. Runtime is Tauri
 *  2. The migration flag has NOT been set yet
 *  3. There is actual data in IndexedDB to migrate
 */
import type { RowQueryFileContent } from '../../../stores/useExplorerFileStore';
import { idbGetAll } from '../idb/primitives';
import {
  PERSIST_COLLECTIONS,
  persistGetAll,
  persistReplaceAll,
  type PersistCollection,
} from '../tauri/primitives';
import { isMigrationDone, markMigrationDone } from './platformMigrationFlag';

type IdbSnapshot = Record<PersistCollection, unknown[]>;

async function getTauriSnapshot(): Promise<IdbSnapshot> {
  const entries = await Promise.all(
    PERSIST_COLLECTIONS.map(async collection => {
      const values = await persistGetAll<unknown>(collection);
      return [collection, values] as const;
    })
  );
  return Object.fromEntries(entries) as IdbSnapshot;
}

async function getIdbSnapshot(): Promise<IdbSnapshot> {
  const entries = await Promise.all(
    PERSIST_COLLECTIONS.map(async collection => {
      const values =
        collection === 'rowQueryFileContents'
          ? await idbGetAll<RowQueryFileContent>(collection)
          : await idbGetAll<unknown>(collection);

      return [collection, values] as const;
    })
  );

  return Object.fromEntries(entries) as IdbSnapshot;
}

let _promise: Promise<void> | null = null;

export async function runMigration(): Promise<void> {
  if (_promise) return _promise;

  _promise = (async () => {
    if (isMigrationDone()) return;

    // Skip if the Tauri store already has data (user already migrated or was
    // always on desktop from day one)
    const tauriSnapshot = await getTauriSnapshot();
    const hasTauriData = Object.values(tauriSnapshot).some(v => v.length > 0);
    if (hasTauriData) {
      markMigrationDone();
      return;
    }

    const idbSnapshot = await getIdbSnapshot();
    const hasIdbData = Object.values(idbSnapshot).some(v => v.length > 0);
    if (!hasIdbData) {
      // Nothing to migrate — mark done so we never run again
      markMigrationDone();
      return;
    }

    await Promise.all(
      PERSIST_COLLECTIONS.map(collection =>
        persistReplaceAll(collection, idbSnapshot[collection])
      )
    );

    markMigrationDone();
    console.info('[Persist] IDB → Tauri migration complete.');
  })().catch(err => {
    // Don't crash the app — migration can be retried next launch
    _promise = null;
    console.error('[Persist] Migration failed:', err);
    throw err;
  });

  return _promise;
}
