import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMongoSchemasTreeExpandedIds,
  getMongoSchemasTreeStorageKey,
} from '~/components/modules/driver/mongodb/primary-panel/schemas/utils';

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('mongoSchemaTreeStorage', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', { localStorage: mockStorage });
  });

  describe('getMongoSchemasTreeStorageKey', () => {
    it('returns the correct storage key format for a given connection id', () => {
      expect(getMongoSchemasTreeStorageKey('conn-123')).toBe(
        'conn-123-mongo-schemas-tree'
      );
    });

    it('handles undefined connection id gracefully', () => {
      expect(getMongoSchemasTreeStorageKey(undefined)).toBe(
        '-mongo-schemas-tree'
      );
    });
  });

  describe('getMongoSchemasTreeExpandedIds', () => {
    it('returns empty array when connectionId is undefined', () => {
      expect(getMongoSchemasTreeExpandedIds(undefined)).toEqual([]);
    });

    it('returns empty array when nothing is stored', () => {
      expect(getMongoSchemasTreeExpandedIds('conn-123')).toEqual([]);
    });

    it('reads expanded node IDs correctly from persisted storage', () => {
      const connId = 'conn-mongo-999';
      const treeKey = getMongoSchemasTreeStorageKey(connId);
      mockStorage.setItem(
        `${treeKey}_expanded_expanded`,
        JSON.stringify(['db_app', 'db_logs'])
      );

      expect(getMongoSchemasTreeExpandedIds(connId)).toEqual([
        'db_app',
        'db_logs',
      ]);
    });
  });
});
