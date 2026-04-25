import { ALL_MIGRATIONS } from '~/core/persist/migration';

export type ImportCompatibilityResult =
  | { compatible: true }
  | { compatible: false; unknownMigrations: string[] };

/**
 * Checks whether a backup's recorded schema version is compatible with the
 * current app's known migration set.
 *
 * - compatible: true  → backup is from the same or an older app version; safe to import
 * - compatible: false → backup contains migration names the app doesn't know; block import
 */
export function checkImportCompatibility(
  backupSchemaVersion: string[]
): ImportCompatibilityResult {
  const appKnownNames = new Set(ALL_MIGRATIONS.map(m => m.name));
  const unknownMigrations = backupSchemaVersion.filter(
    name => !appKnownNames.has(name)
  );

  if (unknownMigrations.length > 0) {
    return { compatible: false, unknownMigrations };
  }

  return { compatible: true };
}
