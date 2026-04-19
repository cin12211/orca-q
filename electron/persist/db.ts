import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';

let _db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (_db) return _db;
  const dbPath = path.join(app.getPath('userData'), 'orcaq.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  _db = db;
  return db;
}
