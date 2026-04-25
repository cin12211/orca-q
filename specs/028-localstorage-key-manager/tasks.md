# Tasks: LocalStorage Key Manager

**Feature**: `028-localstorage-key-manager`
**Priority**: P2 — DX/maintainability improvement. No runtime behavior changes.

## Context

localStorage keys are currently scattered as raw strings across multiple files:
- `'orcaq-last-seen-version'` — `core/contexts/useChangelogModal.ts:11`
- `'orcaq-has-seen-tour'` — `components/modules/workspace/hooks/useWorkspaceTour.ts` (via `useStorage`)
- `'agent-history-tree'` — `components/modules/management/agent/hooks/useManagementAgentHistoryTree.ts:22`
- QB state composite key `${wsId}-${connId}-${schema}-${table}` — `core/composables/useTableQueryBuilder.ts` (after feature 027)
- Tree folder `${storageKey}_expanded` — `components/base/tree-folder/plugins/tree-persistence.ts` (dynamic, not a fixed key — keep as-is, documented in class)

**Decision**: Create a `LocalStorageManager` class in `core/persist/` that:
1. Defines all static keys as a `LocalStorageKey` enum
2. Provides typed `get`/`set`/`remove`/`has` methods using those keys
3. Supports dynamic key builders (QB state composite key, tree expanded key) as static factory methods
4. Wraps `getPlatformStorage()` so it stays platform-aware

## Format: `[ID] [P?] [Story] Description`

---

## Scope of Changes

| File | Action |
|---|---|
| `core/persist/LocalStorageManager.ts` | **Create** — enum + class |
| `core/persist/index.ts` | Export `LocalStorageManager`, `LocalStorageKey` |
| `core/contexts/useChangelogModal.ts` | Replace raw string with `LocalStorageKey.LAST_SEEN_VERSION` |
| `components/modules/workspace/hooks/useWorkspaceTour.ts` | Replace raw string with `LocalStorageKey.HAS_SEEN_TOUR` |
| `components/modules/management/agent/hooks/useManagementAgentHistoryTree.ts` | Replace raw string with `LocalStorageKey.AGENT_HISTORY_TREE` |
| `core/composables/useTableQueryBuilder.ts` | Use `LocalStorageManager.queryBuilderKey(...)` for key generation |

---

## Phase 1: Setup

- [X] T001 Check if `core/persist/index.ts` exists; if not, create it as a barrel exporting from `storage-adapter.ts` and the new `LocalStorageManager.ts`

---

## Phase 2: Foundational

**Purpose**: Create the `LocalStorageManager` — all consumer updates depend on this.

- [X] T002 Create `core/persist/LocalStorageManager.ts` with:

  ```ts
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
  ```

---

## Phase 3: User Story 1 — Migrate Consumers to `LocalStorageManager` (P1) 🎯

**Goal**: Replace all raw string key literals with enum references. No behavior changes.

**Independent Test**: `bun typecheck` exits 0; `grep -rn "orcaq-last-seen-version\|orcaq-has-seen-tour\|agent-history-tree" core/ components/` returns zero hits from non-`LocalStorageManager.ts` files.

### US1 — Static key consumers

- [X] T003 [P] [US1] Update `core/contexts/useChangelogModal.ts` — import `{ LocalStorageManager, LocalStorageKey }` from `~/core/persist/LocalStorageManager`; replace `const LAST_SEEN_VERSION_KEY = 'orcaq-last-seen-version'` constant and all `getPlatformStorage().getItem/setItem(LAST_SEEN_VERSION_KEY, ...)` calls with `LocalStorageManager.get(LocalStorageKey.LAST_SEEN_VERSION)` / `LocalStorageManager.set(LocalStorageKey.LAST_SEEN_VERSION, currentVersion)`; remove `getPlatformStorage` import if no longer used

- [X] T004 [P] [US1] Update `components/modules/workspace/hooks/useWorkspaceTour.ts` — replace the raw string `'orcaq-has-seen-tour'` in the `useStorage(...)` call with `LocalStorageKey.HAS_SEEN_TOUR`; import `{ LocalStorageKey }` from `~/core/persist/LocalStorageManager`; keep `getPlatformStorage()` as-is (still passed to `useStorage`)

- [X] T005 [P] [US1] Update `components/modules/management/agent/hooks/useManagementAgentHistoryTree.ts` — replace `const HISTORY_TREE_STORAGE_KEY = 'agent-history-tree'` with import of `LocalStorageKey` and use `LocalStorageKey.AGENT_HISTORY_TREE` in its place; remove the local const

### US1 — Dynamic key consumer (QB state — after feature 027)

- [X] T006 [P] [US1] Update `core/composables/useTableQueryBuilder.ts` — import `{ LocalStorageManager }` from `~/core/persist/LocalStorageManager`; replace `getPersistedKey()` body with `return LocalStorageManager.queryBuilderKey(workspaceId?.value ?? '', connectionId?.value ?? '', schemaName, tableName);`; keep the `getPersistedKey` helper function shape

### US1 — Export from barrel

- [X] T007 [P] [US1] Update/create `core/persist/index.ts` — add exports: `export { LocalStorageManager, LocalStorageKey } from './LocalStorageManager';`

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T008 Run `bun typecheck` — verify exit 0
- [X] T009 [P] Verify no raw string key literals remain outside `LocalStorageManager.ts`: run `grep -rn "orcaq-last-seen-version\|orcaq-has-seen-tour\|agent-history-tree" core/ components/ --include="*.ts" --include="*.vue"` — expect only 0 results outside the manager file

---

## Dependencies

- T002 MUST complete before T003–T007 (consumers import from the new file)
- T003, T004, T005, T006, T007 are all independent (different files)
- T001 is standalone prep
- T008, T009 must be last

## Parallel Example

```
# After T002 is done, all consumer updates can run in parallel:
T003: core/contexts/useChangelogModal.ts
T004: components/modules/workspace/hooks/useWorkspaceTour.ts
T005: components/modules/management/agent/hooks/useManagementAgentHistoryTree.ts
T006: core/composables/useTableQueryBuilder.ts (depends on feature 027 T002)
T007: core/persist/index.ts barrel update
```

## Implementation Notes

- `useWorkspaceTour.ts` uses `useStorage` from `@vueuse/core` which accepts a string key as the first argument — `LocalStorageKey.HAS_SEEN_TOUR` is a string enum so this is type-safe
- `useChangelogModal.ts` uses `getPlatformStorage()` directly — replaced with `LocalStorageManager.get/set` which calls it internally
- Tree-folder `${storageKey}_expanded` is a **dynamic** key where `storageKey` is a runtime value (workspaceId, connection path, etc.) — it cannot be an enum entry. It is documented in `LocalStorageManager.treeExpandedKey()` as a static builder for discoverability
- `LocalStorageManager` uses `getPlatformStorage()` internally → remains platform-aware (works in both web and Electron renderer)
- Enum values are the exact same strings as before — zero migration needed, existing data is intact
