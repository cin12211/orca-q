import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LocalStorageKey,
  LocalStorageManager,
} from '~/core/persist/LocalStorageManager';

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

describe('LocalStorageManager', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', { localStorage: mockStorage });
  });

  describe('enum keys', () => {
    it('sets, gets, checks has, and removes enum keys', () => {
      expect(
        LocalStorageManager.get(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED)
      ).toBeNull();
      expect(
        LocalStorageManager.has(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED)
      ).toBe(false);

      LocalStorageManager.set(
        LocalStorageKey.DOWNLOAD_BANNER_DISMISSED,
        'true'
      );
      expect(
        LocalStorageManager.get(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED)
      ).toBe('true');
      expect(
        LocalStorageManager.has(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED)
      ).toBe(true);

      LocalStorageManager.remove(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED);
      expect(
        LocalStorageManager.get(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED)
      ).toBeNull();
      expect(
        LocalStorageManager.has(LocalStorageKey.DOWNLOAD_BANNER_DISMISSED)
      ).toBe(false);
    });
  });

  describe('dynamic key builders', () => {
    it('builds queryBuilderKey correctly', () => {
      const key = LocalStorageManager.queryBuilderKey(
        'ws1',
        'c1',
        'public',
        'users'
      );
      expect(key).toBe('ws1-c1-public-users');
    });

    it('builds treeExpandedKey correctly', () => {
      const key = LocalStorageManager.treeExpandedKey('my-tree');
      expect(key).toBe('my-tree_expanded_expanded');
    });
  });

  describe('raw storage methods', () => {
    it('gets, sets, and removes arbitrary keys', () => {
      LocalStorageManager.setItem('custom-key', 'custom-value');
      expect(LocalStorageManager.getItem('custom-key')).toBe('custom-value');

      LocalStorageManager.removeItem('custom-key');
      expect(LocalStorageManager.getItem('custom-key')).toBeNull();
    });
  });

  describe('tree expanded IDs', () => {
    it('returns empty array when no persisted key or invalid json', () => {
      expect(LocalStorageManager.getTreeExpandedIds('test-tree')).toEqual([]);

      mockStorage.setItem('test-tree_expanded_expanded', 'invalid-json');
      expect(LocalStorageManager.getTreeExpandedIds('test-tree')).toEqual([]);
    });

    it('reads expanded IDs from expanded key', () => {
      mockStorage.setItem(
        'test-tree_expanded_expanded',
        JSON.stringify(['node-1', 'node-2'])
      );

      expect(LocalStorageManager.getTreeExpandedIds('test-tree')).toEqual([
        'node-1',
        'node-2',
      ]);
    });
  });
});
