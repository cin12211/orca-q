/**
 * Electron persist primitives.
 * All calls go through window.electronAPI.persist (contextBridge).
 */
import dayjs from 'dayjs';
import { toRawJSON } from '~/core/helpers/jsonFormat';

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
  | 'migrationState';

export interface PersistFilter {
  field: string;
  value: unknown;
}

export type PersistMatchMode = 'all' | 'any';

function api() {
  const electronAPI = (
    window as Window & { electronAPI?: { persist: unknown } }
  ).electronAPI;
  if (!electronAPI?.persist) {
    throw new Error('Electron persist API is not available');
  }
  return electronAPI.persist as {
    getAll: <T>(collection: PersistCollection) => Promise<T[]>;
    getOne: <T>(collection: PersistCollection, id: string) => Promise<T | null>;
    find: <T>(
      collection: PersistCollection,
      filters: PersistFilter[],
      matchMode?: PersistMatchMode
    ) => Promise<T[]>;
    upsert: <T>(
      collection: PersistCollection,
      id: string,
      value: T
    ) => Promise<T>;
    delete: <T>(
      collection: PersistCollection,
      filters: PersistFilter[],
      matchMode?: PersistMatchMode
    ) => Promise<T[]>;
    replaceAll: <T>(
      collection: PersistCollection,
      values: T[]
    ) => Promise<void>;
  };
}

export const persistGetAll = <T>(collection: PersistCollection): Promise<T[]> =>
  api().getAll<T>(collection);

export const persistGetOne = <T>(
  collection: PersistCollection,
  id: string
): Promise<T | null> => api().getOne<T>(collection, id);

export const persistFind = <T>(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode = 'all'
): Promise<T[]> => api().find<T>(collection, filters, matchMode);

export const persistUpsert = <T>(
  collection: PersistCollection,
  id: string,
  value: T
): Promise<T> => api().upsert<T>(collection, id, toRawJSON(value) as T);

export const persistDelete = <T>(
  collection: PersistCollection,
  filters: PersistFilter[],
  matchMode: PersistMatchMode = 'all'
): Promise<T[]> => api().delete<T>(collection, filters, matchMode);

export const persistReplaceAll = <T>(
  collection: PersistCollection,
  values: T[]
): Promise<void> =>
  api().replaceAll<T>(collection, values.map(v => toRawJSON(v)) as T[]);

export const sortByCreatedAt = <T extends { createdAt?: string }>(
  values: T[]
): T[] =>
  [...values].sort(
    (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
  );
