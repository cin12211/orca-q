// Schema-version migration
export { runSchemaMigrations } from './migrationRunner';
export type {
  VersionedMigration,
  MigrationStep, // deprecated alias
  MigrationRegistry, // deprecated alias
  MigrationStepInfo,
} from './types';
