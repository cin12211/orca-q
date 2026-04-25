import localforage from 'localforage';
import { deepUnref } from '~/core/helpers';
import { BaseStorage } from './BaseStorage';

export abstract class IDBStorage<
  T extends { id: string },
> extends BaseStorage<T> {
  protected readonly store: LocalForage;

  constructor(options: { dbName: string; storeName: string }) {
    super();
    this.store = localforage.createInstance({
      name: options.dbName,
      storeName: options.storeName,
      driver: localforage.INDEXEDDB,
    });
  }

  async getOne(id: string): Promise<T | null> {
    return this.store.getItem<T>(id);
  }

  async getMany(filters?: Partial<T>): Promise<T[]> {
    const results: T[] = [];
    await this.store.iterate<T, void>(value => {
      if (!filters || this.matchFilters(value, filters)) {
        results.push(value);
      }
    });
    return results;
  }

  async create(entity: T): Promise<T> {
    const stamped = deepUnref(this.applyTimestamps(entity));
    await this.store.setItem(stamped.id, stamped);
    return stamped;
  }

  async update(entity: Partial<T> & { id: string }): Promise<T | null> {
    const existing = await this.getOne(entity.id);
    if (!existing) return null;
    const merged = deepUnref(
      this.applyTimestamps({ ...existing, ...entity } as T)
    );
    await this.store.setItem(merged.id, merged);
    return merged;
  }

  async delete(id: string): Promise<T | null> {
    const existing = await this.getOne(id);
    if (!existing) return null;
    await this.store.removeItem(id);
    return existing;
  }

  async upsert(entity: T): Promise<T> {
    const plain = deepUnref(entity);
    await this.store.setItem(plain.id, plain);
    return plain;
  }

  protected applyTimestamps(entity: T): T {
    const now = new Date().toISOString();
    return {
      ...entity,
      createdAt: (entity as Record<string, unknown>).createdAt ?? now,
      updatedAt: now,
    };
  }

  protected matchFilters(record: T, filters: Partial<T>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      const recordValue = (record as Record<string, unknown>)[key];
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(recordValue) === JSON.stringify(value);
      }
      return recordValue === value;
    });
  }
}
