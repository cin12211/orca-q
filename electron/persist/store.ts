import type { ElectronPersistCollection } from '~/core/storage/idbRegistry';
import {
  workspaceSQLiteStorage,
  connectionSQLiteStorage,
  workspaceStateSQLiteStorage,
  tabViewSQLiteStorage,
  quickQueryLogSQLiteStorage,
  rowQueryFileSQLiteFileAdapter,
  rowQueryFileSQLiteContentAdapter,
  environmentTagSQLiteStorage,
  appConfigSQLiteStorage,
  agentStateSQLiteStorage,
  migrationStateSQLiteStorage,
} from './entities';
import { getKnex } from './knex-db';

export type PersistCollection = ElectronPersistCollection;

export type RecordValue = Record<string, unknown>;

export interface PersistFilter {
  field: string;
  value: unknown;
}

export type PersistMatchMode = 'all' | 'any';

// Minimal adapter interface used internally by generic store functions
interface StorageAdapter {
  getMany(): Promise<RecordValue[]>;
  getOne(id: string): Promise<RecordValue | null>;
  upsert(entity: RecordValue): Promise<RecordValue>;
  delete(id: string): Promise<RecordValue | null>;
}

function getAdapter(collection: PersistCollection): StorageAdapter | null {
  switch (collection) {
    case 'workspaces':
      return workspaceSQLiteStorage as unknown as StorageAdapter;
    case 'workspaceState':
      return workspaceStateSQLiteStorage as unknown as StorageAdapter;
    case 'connections':
      return connectionSQLiteStorage as unknown as StorageAdapter;
    case 'tabViews':
      return tabViewSQLiteStorage as unknown as StorageAdapter;
    case 'quickQueryLogs':
      return quickQueryLogSQLiteStorage as unknown as StorageAdapter;
    case 'rowQueryFiles':
      return rowQueryFileSQLiteFileAdapter as unknown as StorageAdapter;
    case 'rowQueryFileContents':
      return rowQueryFileSQLiteContentAdapter as unknown as StorageAdapter;
    case 'environment-tags':
      return environmentTagSQLiteStorage as unknown as StorageAdapter;
    case 'migrationState':
      return migrationStateSQLiteStorage as unknown as StorageAdapter;
    default:
      return null;
  }
}

function requireAdapter(collection: PersistCollection): StorageAdapter {
  const adapter = getAdapter(collection);
  if (adapter) return adapter;
  throw new Error(
    `No SQLite adapter registered for collection "${collection}"`
  );
}

function getRecordId(record: RecordValue): string {
  return String(record['id']);
}

async function withForeignKeysDisabled<T>(
  adapter: StorageAdapter,
  run: (adapter: StorageAdapter) => Promise<T>
): Promise<T> {
  const knex = getKnex();
  await knex.raw('PRAGMA foreign_keys = OFF');
  try {
    return await run(adapter);
  } finally {
    await knex.raw('PRAGMA foreign_keys = ON');
  }
}

function matchesFilters(
  record: RecordValue,
  filters: PersistFilter[],
  matchMode: PersistMatchMode
): boolean {
  if (filters.length === 0) return false;
  const results = filters.map(
    f => JSON.stringify(record[f.field]) === JSON.stringify(f.value)
  );
  return matchMode === 'all' ? results.every(Boolean) : results.some(Boolean);
}

// ─── Public API (mirrors existing function signatures exactly) ────────────────

export async function persistGetAll(
  collection: PersistCollection
): Promise<RecordValue[]> {
  if (collection === 'appConfig')
    return [(await appConfigSQLiteStorage.get()) as unknown as RecordValue];
  if (collection === 'agentState')
    return [(await agentStateSQLiteStorage.get()) as unknown as RecordValue];
  if (collection === 'migrationState') {
    const record = await migrationStateSQLiteStorage.get();
    return record ? [record as unknown as RecordValue] : [];
  }
  return requireAdapter(collection).getMany();
}

export async function persistGetOne(
  collection: PersistCollection,
  id: string
): Promise<RecordValue | null> {
  if (collection === 'appConfig')
    return appConfigSQLiteStorage.get() as unknown as Promise<RecordValue>;
  if (collection === 'agentState')
    return agentStateSQLiteStorage.get() as unknown as Promise<RecordValue>;
  return requireAdapter(collection).getOne(id);
}

export async function persistFind(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode
): Promise<RecordValue[]> {
  const all = await persistGetAll(collection);
  return all.filter(r => matchesFilters(r, filters, matchMode));
}

export async function persistUpsert(
  collection: PersistCollection,
  id: string,
  value: RecordValue
): Promise<RecordValue> {
  if (collection === 'appConfig') {
    await appConfigSQLiteStorage.save(value as never);
    return { ...value, id };
  }
  if (collection === 'agentState') {
    await agentStateSQLiteStorage.save(value as never);
    return { ...value, id };
  }
  return requireAdapter(collection).upsert({ ...value, id });
}

export async function persistDelete(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode
): Promise<RecordValue[]> {
  const all = await persistGetAll(collection);
  const matching = all.filter(r => matchesFilters(r, filters, matchMode));
  if (matching.length === 0) return [];

  if (collection === 'appConfig') {
    await appConfigSQLiteStorage.deleteConfig();
    return matching;
  }
  if (collection === 'agentState') {
    await agentStateSQLiteStorage.deleteState();
    return matching;
  }

  const adapter = requireAdapter(collection);
  await Promise.all(
    matching.map(record => adapter.delete(getRecordId(record)))
  );
  return matching;
}

export async function persistReplaceAll(
  collection: PersistCollection,
  values: RecordValue[]
): Promise<void> {
  if (collection === 'appConfig') {
    if (values.length > 0)
      await appConfigSQLiteStorage.save(values[0] as never);
    return;
  }
  if (collection === 'agentState') {
    if (values.length > 0)
      await agentStateSQLiteStorage.save(values[0] as never);
    return;
  }
  if (collection === 'migrationState') {
    if (values.length > 0)
      await migrationStateSQLiteStorage.save(
        ((values[0] as Record<string, unknown>)['names'] as string[]) ?? []
      );
    else await migrationStateSQLiteStorage.clear();
    return;
  }
  if (collection === 'environment-tags') {
    await environmentTagSQLiteStorage.replaceAll(values as never);
    return;
  }

  // Generic: clear all, then upsert each.
  // FK constraints are temporarily disabled because collections are restored
  // one at a time (e.g. workspaces before connections). Deleting parent rows
  // while child rows still exist would fail with FOREIGN KEY constraint failed.
  const adapter = requireAdapter(collection);
  await withForeignKeysDisabled(adapter, async currentAdapter => {
    const existing = await currentAdapter.getMany();
    await Promise.all(
      existing.map(record => currentAdapter.delete(getRecordId(record)))
    );
    await Promise.all(values.map(value => currentAdapter.upsert(value)));
  });
}

export async function persistMergeAll(
  collection: PersistCollection,
  values: RecordValue[]
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  if (collection === 'appConfig') {
    await appConfigSQLiteStorage.save(values[0] as never);
    return;
  }
  if (collection === 'agentState') {
    await agentStateSQLiteStorage.save(values[0] as never);
    return;
  }
  if (collection === 'migrationState') {
    await migrationStateSQLiteStorage.save(
      ((values[0] as Record<string, unknown>)['names'] as string[]) ?? []
    );
    return;
  }

  const adapter = requireAdapter(collection);
  await Promise.all(values.map(value => adapter.upsert(value)));
}

export async function persistGetAllPaginated(
  collection: PersistCollection,
  page: number,
  pageSize: number
): Promise<{
  data: RecordValue[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const all = await persistGetAll(collection);
  const total = all.length;
  const start = (page - 1) * pageSize;
  const data = all.slice(start, start + pageSize);
  return { data, total, page, pageSize };
}
