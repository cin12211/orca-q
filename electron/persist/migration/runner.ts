import type Database from 'better-sqlite3';
import { up as v001 } from './versions/v001-initial-schema';

interface Migration {
  version: number;
  up: (db: Database.Database) => void | Promise<void>;
}

const MIGRATIONS: Migration[] = [{ version: 1, up: v001 }];

export async function runMigrations(db: Database.Database): Promise<void> {
  // Ensure migration tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_versions (
      table_name TEXT PRIMARY KEY,
      version    INTEGER NOT NULL DEFAULT 0,
      applied_at TEXT NOT NULL
    )
  `);

  const row = db
    .prepare(`SELECT version FROM _schema_versions WHERE table_name = 'app'`)
    .get() as { version: number } | undefined;

  const currentVersion = row?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    const runMigration = db.transaction(async () => {
      await migration.up(db);
      db.prepare(
        `INSERT OR REPLACE INTO _schema_versions (table_name, version, applied_at) VALUES ('app', ?, ?)`
      ).run(migration.version, new Date().toISOString());
    });

    await runMigration();
  }
}
