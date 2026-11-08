import { execSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const FIXTURES_DIR = resolve(process.cwd(), 'test/fixtures/datasets/sqlite');
const SCHEMA_SQL = join(FIXTURES_DIR, 'sqlite-sakila-schema.sql');
const DATA_SQL = join(FIXTURES_DIR, 'sqlite-sakila-insert-data-optimized.sql');

let tempDir: string | undefined;
let dbPath: string | undefined;

/**
 * Create a temporary Sakila SQLite database using the sqlite3 CLI.
 * Call once in a top-level `beforeAll`; pair with `destroySqliteFixture`.
 */
export async function createSqliteFixture(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'orcaq-sqlite-e2e-'));
  dbPath = join(tempDir, 'sakila.sqlite');

  // Create an empty file to ensure sqlite3 CLI creates the database
  await writeFile(dbPath, '');

  // Use sqlite3 CLI for fast bulk import (handles multi-statement SQL natively)
  execSync(`sqlite3 "${dbPath}" < "${SCHEMA_SQL}"`, { stdio: 'pipe' });
  execSync(`sqlite3 "${dbPath}" < "${DATA_SQL}"`, { stdio: 'pipe' });

  return dbPath;
}

/**
 * Remove the temporary SQLite database directory.
 */
export async function destroySqliteFixture(): Promise<void> {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
    dbPath = undefined;
  }
}

/**
 * Body fragment for routes that accept `filePath` (raw-execute, tables, metadata, etc.).
 * Spread it into `$fetch` body.
 */
export function sqliteBody(
  filePath: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    type: 'sqlite3',
    filePath,
    ...overrides,
  };
}

/**
 * Connection-string variant using `dbConnectionString`.
 * Works with routes that only accept `dbConnectionString` (e.g. execute.post).
 */
export function sqliteStringBody(
  filePath: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    type: 'sqlite3',
    dbConnectionString: filePath,
    ...overrides,
  };
}
