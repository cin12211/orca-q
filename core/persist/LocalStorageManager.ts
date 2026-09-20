import { getPlatformStorage } from './storage-adapter';

/** All fixed localStorage keys used in this application. */
export enum LocalStorageKey {
  /** Last changelog version seen by the user. Value: version string. */
  LAST_SEEN_VERSION = 'orcaq-last-seen-version',
  /** Whether the user has completed the onboarding tour. Value: 'true'|'false'. */
  HAS_SEEN_TOUR = 'orcaq-has-seen-tour',
  /** Expanded node IDs for the agent history sidebar tree. Value: JSON string[]. */
  AGENT_HISTORY_TREE = 'agent-history-tree',
  /** Whether the download banner has been dismissed. Value: 'true'|'false'. */
  DOWNLOAD_BANNER_DISMISSED = 'orcaq_download_banner_dismissed',
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
   * Format: `${storageKey}_expanded_expanded`
   */
  static treeExpandedKey(storageKey: string): string {
    return `${storageKey}_expanded_expanded`;
  }

  /** Read a raw string value from localStorage by arbitrary key. */
  static getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return getPlatformStorage().getItem(key);
    } catch {
      return null;
    }
  }

  /** Write a raw string value to localStorage by arbitrary key. */
  static setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      getPlatformStorage().setItem(key, value);
    } catch {
      // no-op
    }
  }

  /** Remove a raw key from localStorage. */
  static removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      getPlatformStorage().removeItem(key);
    } catch {
      // no-op
    }
  }

  /**
   * Reads persisted expanded node IDs for any FileTree storage key.
   */
  static getTreeExpandedIds(storageKey: string): string[] {
    if (!storageKey || typeof window === 'undefined') return [];
    try {
      const raw = this.getItem(this.treeExpandedKey(storageKey));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
