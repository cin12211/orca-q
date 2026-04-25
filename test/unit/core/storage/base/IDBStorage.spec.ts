import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { IDBStorage } from '~/core/storage/base/IDBStorage';

interface TestEntity {
  id: string;
  name: string;
  value?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Concrete subclass for testing
class TestStorage extends IDBStorage<TestEntity> {
  readonly name = 'test';

  constructor() {
    super({ dbName: 'TestIDB', storeName: 'test_items' });
  }
}

describe('IDBStorage', () => {
  let storage: TestStorage;

  beforeEach(() => {
    // Create a fresh instance per test to avoid cross-test contamination
    storage = new TestStorage();
  });

  it('getOne returns null for missing id', async () => {
    const result = await storage.getOne('nonexistent');
    expect(result).toBeNull();
  });

  it('create stores and returns entity with timestamps', async () => {
    const entity: TestEntity = { id: 'e1', name: 'Alice' };
    const created = await storage.create(entity);
    expect(created.id).toBe('e1');
    expect(created.name).toBe('Alice');
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();
  });

  it('getOne retrieves a stored entity', async () => {
    await storage.create({ id: 'e2', name: 'Bob' });
    const found = await storage.getOne('e2');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Bob');
  });

  it('create stamps createdAt and updatedAt', async () => {
    const created = await storage.create({ id: 'e3', name: 'Carol' });
    expect(typeof created.createdAt).toBe('string');
    expect(typeof created.updatedAt).toBe('string');
  });

  it('update merges partial fields and stamps updatedAt', async () => {
    await storage.create({ id: 'e4', name: 'Dave', value: 10 });
    const updated = await storage.update({ id: 'e4', value: 99 });
    expect(updated?.name).toBe('Dave');
    expect(updated?.value).toBe(99);
    expect(typeof updated?.updatedAt).toBe('string');
  });

  it('update returns null for missing id', async () => {
    const result = await storage.update({ id: 'no-such-id', name: 'Ghost' });
    expect(result).toBeNull();
  });

  it('delete removes and returns old entity', async () => {
    await storage.create({ id: 'e5', name: 'Eve' });
    const deleted = await storage.delete('e5');
    expect(deleted?.name).toBe('Eve');
    const gone = await storage.getOne('e5');
    expect(gone).toBeNull();
  });

  it('delete returns null for missing id', async () => {
    const result = await storage.delete('no-such-id');
    expect(result).toBeNull();
  });

  it('upsert overwrites existing record', async () => {
    await storage.create({ id: 'e6', name: 'Frank', value: 1 });
    await storage.upsert({ id: 'e6', name: 'Frank V2', value: 2 });
    const found = await storage.getOne('e6');
    expect(found?.name).toBe('Frank V2');
    expect(found?.value).toBe(2);
  });

  it('getMany with no args returns all records', async () => {
    await storage.create({ id: 'e7', name: 'Gina' });
    await storage.create({ id: 'e8', name: 'Hank' });
    const all = await storage.getMany();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('getMany with filter returns only matching records', async () => {
    await storage.create({ id: 'e9', name: 'Iris', value: 42 });
    await storage.create({ id: 'e10', name: 'Jake', value: 99 });
    const filtered = await storage.getMany({
      value: 42,
    } as Partial<TestEntity>);
    expect(filtered.every(r => r.value === 42)).toBe(true);
    expect(filtered.some(r => r.name === 'Iris')).toBe(true);
  });
});
