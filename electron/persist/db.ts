import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let _db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (_db) return _db;

  const IS_DEV = process.env.NODE_ENV === 'development';
  let dbPath: string;

  if (IS_DEV) {
    const dir = path.join(process.cwd(), '.sqlite3');
    fs.mkdirSync(dir, { recursive: true });
    dbPath = path.join(dir, 'orcaq.db');
  } else {
    dbPath = path.join(app.getPath('userData'), 'orcaq.db');
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  _db = db;
  return db;
}
