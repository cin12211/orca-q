import { Migration } from './MigrationInterface';
import {
  executeMigrations,
  type RunMigrationsOptions,
  type MigrationStepInfo,
} from './MigrationRunner';
import { AddTagIdsToConnections1740477873001 } from './versions/AddTagIdsToConnections1740477873001';
import { AddVariablesToRowQueryFiles1740477873003 } from './versions/AddVariablesToRowQueryFiles1740477873003';
import { MigrateLegacyAppConfig1740477873005 } from './versions/MigrateLegacyAppConfig1740477873005';
import { MigrateRowQueryVariablesToFileMetadata1740477873007 } from './versions/MigrateRowQueryVariablesToFileMetadata1740477873007';
import { RemoveConnectionIdFromRowQueryFiles1740477873002 } from './versions/RemoveConnectionIdFromRowQueryFiles1740477873002';
import { RemoveVariablesFromRowQueryFileContents1740477873004 } from './versions/RemoveVariablesFromRowQueryFileContents1740477873004';

export const ALL_MIGRATIONS: Migration[] = [
  new AddTagIdsToConnections1740477873001(),
  new RemoveConnectionIdFromRowQueryFiles1740477873002(),
  new AddVariablesToRowQueryFiles1740477873003(),
  new RemoveVariablesFromRowQueryFileContents1740477873004(),
  new MigrateLegacyAppConfig1740477873005(),
  new MigrateRowQueryVariablesToFileMetadata1740477873007(),
];

export async function runMigrations(
  options?: RunMigrationsOptions
): Promise<void> {
  await executeMigrations(ALL_MIGRATIONS, options);
}

export { Migration, executeMigrations };
export type { RunMigrationsOptions, MigrationStepInfo };
export { checkImportCompatibility } from './compatibility';
export type { ImportCompatibilityResult } from './compatibility';
export { getApplied } from './MigrationRunner';
