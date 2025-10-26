import { toRawJSON } from '~/utils/common';

/**
 * Generic gateway interface mở rộng từ localforage
 */
export interface LocalforageGateway<T> {
  getOne(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
  setOne(id: string, value: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  deleteOne(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  clear(): Promise<void>;
  find(predicate: (value: T) => boolean): Promise<T[]>;
  upsert(value: T, getId: (v: T) => string): Promise<T>;
}

/**
 * Factory tạo ra instance gateway
 */
export const createLocalforageGateway = <T>(
  instance: LocalForage
): LocalforageGateway<T> => {
  const getOne = async (id: string) => instance.getItem<T>(id);

  const getAll = async () => {
    const items: T[] = [];
    await instance.iterate((value: T) => {
      items.push(value);
    });
    return items;
  };

  const setOne = async (id: string, value: T) => {
    await instance.setItem(id, toRawJSON(value));
    return value;
  };

  const update = async (id: string, patch: Partial<T>) => {
    const current = await instance.getItem<T>(id);
    if (!current) return null;
    const updated = { ...current, ...patch };
    await setOne(id, updated);
    return updated;
  };

  const deleteOne = async (id: string) => {
    await instance.removeItem(id);
  };

  const deleteMany = async (ids: string[]) => {
    await Promise.all(ids.map(id => instance.removeItem(id)));
  };

  const clear = async () => {
    await instance.clear();
  };

  const find = async (predicate: (value: T) => boolean) => {
    const all = await getAll();
    return all.filter(predicate);
  };

  const upsert = async (value: T, getId: (v: T) => string) => {
    const id = getId(value);
    const existing = await instance.getItem<T>(id);
    if (existing) {
      const merged = { ...existing, ...value };
      await setOne(id, merged);

      return merged;
    }
    await setOne(id, value);

    return value;
  };

  return {
    getOne,
    getAll,
    setOne,
    update,
    deleteOne,
    deleteMany,
    clear,
    find,
    upsert,
  };
};
