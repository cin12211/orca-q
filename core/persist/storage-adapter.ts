/**
 * Platform-aware key-value storage backed by @tauri-apps/plugin-store on
 * desktop and localStorage on web.
 *
 * Used as a custom storage adapter for:
 * - pinia-plugin-persistedstate
 * - @vueuse/core useStorage
 */
import { load, type Store } from '@tauri-apps/plugin-store';
import { isTauri } from '~/core/helpers/environment';

const STORE_FILE = 'settings.json';

// In-memory cache — keeps getItem() synchronous after warm-up
const cache = new Map<string, string | null>();
let _store: Store | null = null;

async function getStore(): Promise<Store> {
  if (_store === null) {
    _store = await load(STORE_FILE, { autoSave: true, defaults: {} });
  }
  return _store;
}

// ── Public interface ─────────────────────────────────────────────────

export interface PlatformStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createTauriStorage(): PlatformStorage {
  return {
    getItem(key: string): string | null {
      return cache.has(key) ? (cache.get(key) ?? null) : null;
    },
    setItem(key: string, value: string): void {
      cache.set(key, value);
      getStore().then(async s => {
        await s.set(key, value);
        await s.save();
      });
    },
    removeItem(key: string): void {
      cache.delete(key);
      getStore().then(async s => {
        await s.delete(key);
        await s.save();
      });
    },
  };
}

let _storage: PlatformStorage | null = null;

/** Returns the platform storage singleton (lazy init). */
export function getPlatformStorage(): PlatformStorage {
  if (_storage === null) {
    _storage = isTauri()
      ? createTauriStorage()
      : (localStorage as PlatformStorage);
  }
  return _storage;
}

/**
 * Call once at app startup to pre-warm the cache from the Tauri store
 * so that getItem() reads are synchronous for the rest of the session.
 * No-op on web.
 */
export async function initPlatformStorage(): Promise<void> {
  if (!isTauri()) return;
  const store = await getStore();
  const entries = await store.entries<string>();
  for (const [key, value] of entries) {
    cache.set(key, value);
  }
  getPlatformStorage();
}
