// Schema-version migration
export { runSchemaMigrations } from './migrationRunner';
export type {
  VersionedMigration,
  MigrationStep, // deprecated alias
  MigrationRegistry, // deprecated alias
  MigrationStepInfo,
} from './types';

// Platform migration (IDB → Tauri, one-time — desktop only)
export { runMigration as runPlatformMigration } from './platformMigrationService';
export {
  isMigrationDone as isPlatformMigrationDone,
  markMigrationDone as markPlatformMigrationDone,
} from './platformMigrationFlag';
