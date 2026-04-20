import { app } from 'electron';
import knexLib from 'knex';
import type { Knex } from 'knex';
import fs from 'node:fs';
import path from 'node:path';

let _knex: Knex | null = null;

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) =>
    letter.toUpperCase()
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function camelizeResult<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => camelizeResult(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      toCamelCase(key),
      camelizeResult(entryValue),
    ])
  ) as T;
}

export function getKnex(): Knex {
  if (_knex) return _knex;

  const IS_DEV = process.env.NODE_ENV === 'development';
  const dir = IS_DEV
    ? path.join(process.cwd(), '.sqlite3')
    : app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, 'orcaq.db');

  _knex = knexLib({
    client: 'better-sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
    // Transform logical TS camelCase identifiers to DB snake_case identifiers.
    wrapIdentifier: (value, origImpl, _queryContext) => {
      if (typeof value !== 'string') {
        return origImpl(value);
      }
      return origImpl(toSnakeCase(value));
    },
    postProcessResponse: result => camelizeResult(result),
  });

  // Mirror the same PRAGMAs as the raw better-sqlite3 setup in db.ts
  _knex.raw('PRAGMA journal_mode = WAL').then(() => {});
  _knex.raw('PRAGMA foreign_keys = ON').then(() => {});

  return _knex;
}
