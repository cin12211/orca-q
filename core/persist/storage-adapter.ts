/**
 * Platform-aware key-value storage backed by localStorage.
 *
 * Used as a custom storage adapter for:
 * - pinia-plugin-persistedstate
 * - @vueuse/core useStorage
 */

// ── Public interface ─────────────────────────────────────────────────

export interface PlatformStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Returns the platform storage singleton (lazy init). */
export function getPlatformStorage(): PlatformStorage {
  return localStorage as PlatformStorage;
}

/**
 * No-op kept for interface compatibility.
 * Previously warmed the Tauri store cache; now a no-op on all platforms.
 */
export async function initPlatformStorage(): Promise<void> {
  // no-op
}
