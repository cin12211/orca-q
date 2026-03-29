/**
 * Schema-version migration runner.
 *
 * Accepts a flat list of `VersionedMigration` objects (one per version step,
 * each self-describing its target collection). The runner:
 *
 *   1. Groups migrations by collection.
 *   2. Sorts each group by version (ascending).
 *   3. Skips steps whose version ≤ the stored schema version.
 *   4. Applies pending steps in order, writing upgraded docs back to storage.
 *   5. Saves the new version and calls `onStep` after each applied step.
 *
 * Works on both platforms:
 *  - Web  → reads/writes via IDB primitives (`idbGetAll` / `idbReplaceAll`)
 *  - Tauri → reads/writes via native persist commands (`persistGetAll` / `persistReplaceAll`)
 */
import { isTauri } from '../../../helpers/environment';
import { idbGetAll, idbReplaceAll } from '../idb/primitives';
import { persistGetAll, persistReplaceAll } from '../tauri/primitives';
import type { PersistCollection } from '../tauri/primitives';
import { getSchemaVersion, setSchemaVersion } from './schemaVersionStore';
import type { MigrationStepInfo, VersionedMigration } from './types';

// ── Platform-agnostic read / write ───────────────────────────────────

type GetAll = <T>(collection: PersistCollection) => Promise<T[]>;
type ReplaceAll = <T extends { id: string }>(
  collection: PersistCollection,
  values: T[]
) => Promise<void>;

function getPlatformOps(): { getAll: GetAll; replaceAll: ReplaceAll } {
  if (isTauri()) {
    return {
      getAll: persistGetAll as GetAll,
      replaceAll: persistReplaceAll as unknown as ReplaceAll,
    };
  }
  return { getAll: idbGetAll, replaceAll: idbReplaceAll };
}

// ── Runner ───────────────────────────────────────────────────────────

export interface RunSchemaMigrationsOptions {
  /**
   * Called after each step is successfully applied.
   * Use this to update a progress indicator in the UI.
   */
  onStep?: (info: MigrationStepInfo) => void;
}

/**
 * Runs all pending schema migrations.
 * Safe to call multiple times — already-applied steps are skipped instantly.
 *
 * @param migrations - Flat list of all defined migration steps (any order; runner sorts them).
 * @param options.onStep - Optional progress callback fired after each applied step.
 */
export async function runSchemaMigrations(
  migrations: VersionedMigration[],
  options: RunSchemaMigrationsOptions = {}
): Promise<void> {
  if (migrations.length === 0) return;

  const { getAll, replaceAll } = getPlatformOps();
  const { onStep } = options;

  // Group by collection
  const byCollection = new Map<PersistCollection, VersionedMigration[]>();
  for (const m of migrations) {
    const group = byCollection.get(m.collection) ?? [];
    group.push(m);
    byCollection.set(m.collection, group);
  }

  // Sort each group ascending, then run
  await Promise.all(
    [...byCollection.entries()].map(async ([collection, steps]) => {
      const sorted = [...steps].sort((a, b) => a.version - b.version);
      const currentVersion = getSchemaVersion(collection);
      const latestVersion = sorted[sorted.length - 1]!.version;

      if (currentVersion >= latestVersion) return; // already up-to-date

      let docs = await getAll<Record<string, unknown>>(collection);

      const pending = sorted.filter(s => s.version > currentVersion);
      for (const step of pending) {
        docs = docs.map(doc => step.up(doc) as Record<string, unknown>);

        const info: MigrationStepInfo = {
          collection,
          version: step.version,
          description: step.description,
        };
        console.info(
          `[Migration] ${collection} v${step.version}: ${step.description}`
        );
        onStep?.(info);
      }

      await replaceAll(collection, docs as { id: string }[]);
      setSchemaVersion(collection, latestVersion);
    })
  );
}
