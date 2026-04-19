import { getPlatformStorage } from './storage-adapter';

/** All fixed localStorage keys used in this application. */
export enum LocalStorageKey {
  /** Last changelog version seen by the user. Value: version string. */
  LAST_SEEN_VERSION = 'orcaq-last-seen-version',
  /** Whether the user has completed the onboarding tour. Value: 'true'|'false'. */
  HAS_SEEN_TOUR = 'orcaq-has-seen-tour',
  /** Expanded node IDs for the agent history sidebar tree. Value: JSON string[]. */
  AGENT_HISTORY_TREE = 'agent-history-tree',
}

/** Manages all localStorage interactions with typed keys and dynamic key builders. */
export class LocalStorageManager {
  /** Read a value by enum key. Returns null if not set. */
  static get(key: LocalStorageKey): string | null {
    return getPlatformStorage().getItem(key);
  }

  /** Write a string value. */
  static set(key: LocalStorageKey, value: string): void {
    getPlatformStorage().setItem(key, value);
  }

  /** Remove a key. */
  static remove(key: LocalStorageKey): void {
    getPlatformStorage().removeItem(key);
  }

  /** True if key is present (not null). */
  static has(key: LocalStorageKey): boolean {
    return getPlatformStorage().getItem(key) !== null;
  }

  // ── Dynamic key builders ─────────────────────────────────────────

  /**
   * Composite key for QueryBuilder persisted state.
   * Format: `${workspaceId}-${connectionId}-${schemaName}-${tableName}`
   */
  static queryBuilderKey(
    workspaceId: string,
    connectionId: string,
    schemaName: string,
    tableName: string
  ): string {
    return `${workspaceId}-${connectionId}-${schemaName}-${tableName}`;
  }

  /**
   * Expanded-node key for tree-folder persistence plugin.
   * Format: `${storageKey}_expanded`
   * Note: tree-persistence.ts uses this format directly via its own adapter;
   * listed here for documentation only.
   */
  static treeExpandedKey(storageKey: string): string {
    return `${storageKey}_expanded`;
  }
}
