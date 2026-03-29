/**
 * Persists the current schema version number for each collection.
 *
 * Uses localStorage on web, or the Tauri KV store on desktop
 * (via the same getPlatformStorage() adapter used by Pinia persist).
 *
 * Key pattern: `orcaq-schema-version-{collection}`
 */
import { getPlatformStorage } from '../../storage-adapter';
import type { PersistCollection } from '../tauri/primitives';

const prefix = 'orcaq-schema-version-';

function keyFor(collection: PersistCollection): string {
  return `${prefix}${collection}`;
}

/** Returns the currently stored schema version (0 if never set). */
export function getSchemaVersion(collection: PersistCollection): number {
  const raw = getPlatformStorage().getItem(keyFor(collection));
  if (raw === null) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Saves the schema version after a successful migration. */
export function setSchemaVersion(
  collection: PersistCollection,
  version: number
): void {
  getPlatformStorage().setItem(keyFor(collection), String(version));
}
