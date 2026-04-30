import knex, { type Knex } from 'knex';
import type { DatabaseField } from '~/core/types';
import {
  EConnectionProviderKind,
  type IManagedSqliteConfig,
} from '~/core/types/entities/connection.entity';
import type { IDatabaseAdapter } from '../types';
import { D1Adapter } from './d1.adapter';
import { TursoAdapter } from './turso.adapter';

export interface ManagedSqliteAdapterOptions {
  providerKind?: EConnectionProviderKind;
  managedSqlite?: IManagedSqliteConfig;
}

export function isManagedSqliteProviderKind(
  providerKind?: EConnectionProviderKind
) {
  return (
    providerKind === EConnectionProviderKind.CLOUDFLARE_D1 ||
    providerKind === EConnectionProviderKind.TURSO
  );
}

export function createManagedSqliteConnectionString(
  providerKind: EConnectionProviderKind,
  managedSqlite: IManagedSqliteConfig
) {
  if (providerKind === EConnectionProviderKind.CLOUDFLARE_D1) {
    return `d1://${managedSqlite.accountId || ''}/${managedSqlite.databaseId || ''}`;
  }

  return buildTursoUrl(managedSqlite.url || '', managedSqlite.branchName);
}

export function createManagedSqliteAdapter(
  options: ManagedSqliteAdapterOptions
): IDatabaseAdapter {
  if (
    !options.providerKind ||
    !isManagedSqliteProviderKind(options.providerKind)
  ) {
    throw new Error('Managed SQLite adapters require a managed provider kind.');
  }

  if (!options.managedSqlite) {
    throw new Error('Managed SQLite adapters require provider credentials.');
  }

  if (options.providerKind === EConnectionProviderKind.CLOUDFLARE_D1) {
    return new D1Adapter(options.managedSqlite);
  }

  if (options.providerKind === EConnectionProviderKind.TURSO) {
    return new TursoAdapter(options.managedSqlite);
  }

  throw new Error(
    `Unsupported managed SQLite provider: ${options.providerKind}`
  );
}

export function createManagedSqliteKnex(): Knex {
  return knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
    },
  });
}

export function createSyntheticFields(columnNames: string[]): DatabaseField[] {
  return columnNames.map((name, index) => ({
    name,
    tableID: 0,
    columnID: index,
    dataTypeID: 0,
    dataTypeSize: 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

export function inferSqliteCommand(sql: string) {
  return sql.trim().split(/\s+/, 1)[0]?.toUpperCase() || '';
}

export function rowsToArray<T = unknown[]>(
  rows: Record<string, unknown>[],
  fields: DatabaseField[]
) {
  return rows.map(row => fields.map(field => row[field.name])) as T[];
}

export function normalizeRecordRows(
  rows: Array<Record<string, unknown> | null | undefined>
) {
  return rows
    .filter(Boolean)
    .map(row => ({ ...(row as Record<string, unknown>) }));
}

function buildTursoUrl(url: string, branchName?: string) {
  if (!branchName || !url) {
    return url;
  }

  const nextUrl = new URL(url);

  if (!nextUrl.searchParams.has('branch')) {
    nextUrl.searchParams.set('branch', branchName);
  }

  return nextUrl.toString();
}
