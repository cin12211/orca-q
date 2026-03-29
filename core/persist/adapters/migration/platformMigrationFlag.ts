const MIGRATION_FLAG_KEY = 'orcaq-idb-migrated-v1';

export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

export function markMigrationDone(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}
