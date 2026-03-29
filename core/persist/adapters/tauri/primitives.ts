/**
 * Shared Tauri persist primitives used by all domain adapters.
 */
import dayjs from 'dayjs';
import { toRawJSON } from '~/core/helpers';
import { invokeTauri } from '~/core/platform/tauri';

export type PersistCollection =
  | 'appConfig'
  | 'agentState'
  | 'workspaces'
  | 'workspaceState'
  | 'connections'
  | 'tabViews'
  | 'quickQueryLogs'
  | 'rowQueryFiles'
  | 'rowQueryFileContents';

export interface PersistFilter {
  field: string;
  value: unknown;
}

export type PersistMatchMode = 'all' | 'any';

export const PERSIST_COLLECTIONS: PersistCollection[] = [
  'appConfig',
  'agentState',
  'workspaces',
  'workspaceState',
  'connections',
  'tabViews',
  'quickQueryLogs',
  'rowQueryFiles',
  'rowQueryFileContents',
];

export const persistGetAll = async <T>(
  collection: PersistCollection
): Promise<T[]> => {
  return await invokeTauri<T[]>('persist_get_all', { collection });
};

export const persistGetOne = async <T>(
  collection: PersistCollection,
  id: string
): Promise<T | null> => {
  return await invokeTauri<T | null>('persist_get_one', { collection, id });
};

export const persistFind = async <T>(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode = 'all'
): Promise<T[]> => {
  return await invokeTauri<T[]>('persist_find', {
    collection,
    filters,
    matchMode,
  });
};

export const persistUpsert = async <T>(
  collection: PersistCollection,
  id: string,
  value: T
): Promise<T> => {
  return await invokeTauri<T>('persist_upsert', {
    collection,
    id,
    value: toRawJSON(value),
  });
};

export const persistDelete = async <T>(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode = 'all'
): Promise<T[]> => {
  return await invokeTauri<T[]>('persist_delete', {
    collection,
    filters,
    matchMode,
  });
};

export const persistReplaceAll = async <T>(
  collection: PersistCollection,
  values: T[]
): Promise<void> => {
  await invokeTauri('persist_replace_all', {
    collection,
    values: values.map(value => toRawJSON(value)),
  });
};

export const sortByCreatedAt = <T extends { createdAt?: string }>(
  values: T[]
): T[] => {
  return [...values].sort(
    (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
  );
};
