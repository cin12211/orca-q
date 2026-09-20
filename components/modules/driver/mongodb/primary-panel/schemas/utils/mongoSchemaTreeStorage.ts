import { LocalStorageManager } from '~/core/persist/LocalStorageManager';

/**
 * Storage key passed to FileTree for MongoDB schemas tree.
 * Format: `${connectionId}-mongo-schemas-tree`
 */
export function getMongoSchemasTreeStorageKey(connectionId?: string): string {
  return `${connectionId || ''}-mongo-schemas-tree`;
}

/**
 * Reads persisted expanded node IDs for the MongoDB schemas tree from localStorage.
 */
export function getMongoSchemasTreeExpandedIds(
  connectionId: string | undefined
): string[] {
  if (!connectionId) return [];
  const storageKey = getMongoSchemasTreeStorageKey(connectionId);
  return LocalStorageManager.getTreeExpandedIds(storageKey);
}
