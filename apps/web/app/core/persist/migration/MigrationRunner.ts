import { migrationStateStorage } from '~/core/storage/entities/MigrationStateStorage';
import { Migration } from './MigrationInterface';

export async function getApplied(): Promise<Set<string>> {
  const record = await migrationStateStorage.get();
  if (record) return new Set(record.names);
  return new Set();
}

async function saveApplied(names: Set<string>): Promise<void> {
  await migrationStateStorage.save([...names]);
}

/** Progress event shape used by useMigrationState for the migration overlay UI. */
export interface MigrationStepInfo {
  collection: string;
  version: number;
  description: string;
}

export interface RunMigrationsOptions {
  /** Called after each migration is successfully applied. */
  onStep?: (name: string) => void;
}

/**
 * Runs all pending migrations in name-sorted (ascending) order.
 * Safe to call multiple times — already-applied migrations are skipped.
 *
 * If `up()` throws, the migration name is NOT added to the applied list
 * so it will be retried on the next boot.
 */
export async function executeMigrations(
  migrations: Migration[],
  options?: RunMigrationsOptions
): Promise<void> {
  // Sort by name ascending (timestamp-suffix ensures chronological order)
  const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name));

  const applied = await getApplied();

  for (const migration of sorted) {
    if (applied.has(migration.name)) continue;

    await migration.up();

    applied.add(migration.name);
    await saveApplied(applied);
    options?.onStep?.(migration.name);
  }
}
