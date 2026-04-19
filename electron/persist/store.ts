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
  queryBuilderStateSQLiteStorage,
  migrationStateSQLiteStorage,
} from './entities';

export type PersistCollection =
  | 'appConfig'
  | 'agentState'
  | 'workspaces'
  | 'workspaceState'
  | 'connections'
  | 'tabViews'
  | 'quickQueryLogs'
  | 'rowQueryFiles'
  | 'rowQueryFileContents'
  | 'environment-tags'
  | 'query_builder_states'
  | 'migrationState';

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
    case 'query_builder_states':
      return queryBuilderStateSQLiteStorage as unknown as StorageAdapter;
    case 'migrationState':
      return migrationStateSQLiteStorage as unknown as StorageAdapter;
    default:
      return null;
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
  return getAdapter(collection)!.getMany();
}

export async function persistGetOne(
  collection: PersistCollection,
  id: string
): Promise<RecordValue | null> {
  if (collection === 'appConfig')
    return appConfigSQLiteStorage.get() as unknown as Promise<RecordValue>;
  if (collection === 'agentState')
    return agentStateSQLiteStorage.get() as unknown as Promise<RecordValue>;
  return getAdapter(collection)!.getOne(id);
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
  return getAdapter(collection)!.upsert({ ...value, id });
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

  const adapter = getAdapter(collection)!;
  await Promise.all(matching.map(r => adapter.delete(r['id'] as string)));
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

  // Generic: clear all, then upsert each
  const adapter = getAdapter(collection)!;
  const existing = await adapter.getMany();
  await Promise.all(existing.map(r => adapter.delete(r['id'] as string)));
  await Promise.all(values.map(v => adapter.upsert(v)));
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
