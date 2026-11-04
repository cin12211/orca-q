/**
 * Generic read-all / write-all helpers for IDB that mirror the
 * `persistGetAll` / `persistReplaceAll` primitives.
 *
 * Each entry maps to the same registry used by browser entity storages,
 * so IDB collection names live in exactly one place.
 */
import localforage from 'localforage';
import {
  PERSIST_COLLECTIONS,
  PERSIST_IDB_STORES,
  type PersistCollection,
} from '~/core/storage/idbRegistry';

const IDB_STORES = Object.fromEntries(
  PERSIST_COLLECTIONS.map(collection => [
    collection,
    localforage.createInstance({
      name: PERSIST_IDB_STORES[collection].dbName,
      storeName: PERSIST_IDB_STORES[collection].storeName,
      driver: localforage.INDEXEDDB,
    }),
  ])
) as Record<PersistCollection, LocalForage>;

/** Read all records from an IDB collection. */
export async function idbGetAll<T>(
  collection: PersistCollection
): Promise<T[]> {
  const store = IDB_STORES[collection];
  const keys = await store.keys();

  const results: T[] = [];
  for (const key of keys) {
    const item = await store.getItem<T>(key.toString());

    if (item !== null) results.push(item);
  }

  return results;
}

/**
 * Replace all records in an IDB collection.
 * Each record must have an `id` property used as the store key.
 */
export async function idbReplaceAll<T extends { id: string }>(
  collection: PersistCollection,
  values: T[]
): Promise<void> {
  const store = IDB_STORES[collection];
  await store.clear();
  for (const item of values) {
    await store.setItem(item.id, item);
  }
}

/** Merge records into an IDB collection without deleting unrelated entries. */
export async function idbMergeAll<T extends { id: string }>(
  collection: PersistCollection,
  values: T[]
): Promise<void> {
  const store = IDB_STORES[collection];
  for (const item of values) {
    await store.setItem(item.id, item);
  }
}
