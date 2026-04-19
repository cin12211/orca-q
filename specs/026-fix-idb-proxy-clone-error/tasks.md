# Tasks: Fix IDB Proxy Clone Error (DataCloneError)

**Feature**: `026-fix-idb-proxy-clone-error`
**Input**: Bug report — `DataCloneError: Failed to execute 'put' on 'IDBObjectStore': [object Array] could not be cloned.`
**Priority**: CRITICAL — data loss bug, all IDB writes through the unified storage layer and QueryBuilder state fail silently

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)

---

## Root Cause

Vue 3's `reactive()` and `ref()` wrap objects in ES6 `Proxy`. The Structured Clone Algorithm
(used internally by `localforage.setItem()`) cannot serialize Proxy objects, throwing a `DataCloneError`.

**Affected write paths (confirmed by grep — `core/storage/` has ZERO `toRawJSON` calls):**

| File | Method | Passed-in Vue Proxy source |
|---|---|---|
| `core/storage/base/IDBStorage.ts` | `create`, `update`, `upsert` | Pinia store reactive entities |
| `core/persist/adapters/idb/primitives.ts` | `idbReplaceAll` | Import flow data |
| `core/persist/adapters/idb/query-builder-state.ts` | `save` | `pagination = reactive({})`, `orderBy = reactive({})` from `useTableQueryBuilder.ts:52,59` |

**Fix pattern** (from old adapters that already work correctly — `connection.ts`, `row-query-files.ts`):
```ts
import { toRawJSON } from '~/core/helpers';

// Before setItem, strip Vue Proxy via JSON round-trip
await store.setItem(id, toRawJSON(entity));
```

**`toRawJSON` definition** (`core/helpers/jsonFormat.ts:104`):
```ts
export function toRawJSON<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
```

---

## Phase 1: Setup

**Purpose**: Confirm `toRawJSON` import path and helper availability

- [X] T001 Verify `toRawJSON` is exported from `core/helpers/index.ts` and its alias `~/core/helpers` resolves correctly in `tsconfig.json`

---

## Phase 2: Foundational — No foundational blockers

All three fixes can be implemented independently in parallel (different files).

---

## Phase 3: User Story 1 — Fix All Active IDB Write Paths (Priority: P1) 🎯 MVP

**Goal**: Every write to `localforage.setItem()` across all active IDB paths must pass a plain-object
copy of the data, never a Vue Proxy directly.

**Independent Test**: Open the app in web mode, create a workspace + connection, reload the page —
data should persist and reload correctly. Previously this would fail silently with a `DataCloneError`
in the browser DevTools console.

### US1 — IDBStorage Base Class

- [X] T002 [P] [US1] Fix `core/storage/base/IDBStorage.ts` — add `import { deepUnref } from '~/core/helpers'`; in `create()` wrap stamped before setItem: `const stamped = deepUnref(this.applyTimestamps(entity)); await this.store.setItem(stamped.id, stamped); return stamped;`; same pattern for `update()` and `upsert()`

### US1 — QueryBuilder State Adapter (CRITICAL — confirmed DataCloneError)

- [X] T003 [P] [US1] Fix `core/persist/adapters/idb/query-builder-state.ts` — add `import { deepUnref } from '~/core/helpers'`; in `save()` change to `await store.setItem(key, deepUnref(state));`; in `load()` migration path change to `await store.setItem(key, deepUnref(parsed));`

### US1 — idbReplaceAll Primitive (Import Flow)

- [X] T004 [P] [US1] Fix `core/persist/adapters/idb/primitives.ts` — AUDIT RESULT: `idbReplaceAll` is only called from `useDataImport.ts` which passes `JSON.parse(raw)` plain objects — no Proxy risk. No code change needed.

---

## Phase 4: User Story 2 — Double-wrap Audit (Priority: P2)

**Goal**: Confirm that old IDB adapters that already use `toRawJSON` (`connection.ts`,
`row-query-files.ts`) are dead code in the new unified factory and are not being double-wrapped
(i.e., a new `IDBStorage` entity does NOT call these old adapters under the hood).

**Independent Test**: `grep -rn "connectionIDBAdapter\|rowQueryFilesIDBAdapter" core/storage/ core/persist/factory.ts` — should show zero usage inside the new storage entity files (factory maps to the new IDBStorage classes, not old adapters).

- [X] T005 [P] [US2] Audit `core/persist/factory.ts` — confirms IDB path uses OLD adapters (`workspaceIDBAdapter`, etc.) not new entity classes. Old adapters are the `window.*Api` globals used by legacy paths. New Pinia stores use `core/storage/factory.ts` which uses new entity classes (now fixed via T002). No dead code present — both factories are active simultaneously.

- [X] T006 [P] [US2] Audit old IDB adapters — `connection.ts` and `row-query-files.ts` already use `toRawJSON` ✓. Others (`workspace.ts`, `workspace-state.ts`, `tab-views.ts`, `app-config.ts`, `agent.ts`, `quick-query-logs.ts`, `environmentTag.ts`) construct entities via spread `{ ...entity, ... }` which strips the top-level Proxy, and all their field values are primitives (strings/numbers/booleans) — no nested reactive risk. No changes needed.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T007 Run `bun typecheck` — exit 0 ✓

---

## Dependencies

### User Story Dependencies

- **US1 (P1)**: Can start immediately — T002, T003, T004 are all independent (different files)
- **US2 (P2)**: Can start after US1 is complete — audit confirms no double-wrapping regression

### Within Each Phase

- T002, T003, T004 are fully independent and can run in parallel
- T005, T006 are read-only audit tasks and can run in parallel
- T007 must run last (after all fixes applied)

---

## Parallel Example: User Story 1

All three critical fixes operate on different files with no shared state:

```
# Run all three in parallel:
T002: core/storage/base/IDBStorage.ts       ← new entity layer (covers WorkspaceStorage, ConnectionStorage, TabViewStorage, etc.)
T003: core/persist/adapters/idb/query-builder-state.ts  ← QueryBuilder state (window.queryBuilderStateApi)
T004: core/persist/adapters/idb/primitives.ts           ← idbReplaceAll (import flow)
```

---

## Implementation Strategy

### Fix Order (Single Developer)

1. T001 — verify helper (30 sec)
2. T002 → T003 → T004 in parallel or sequence (5 min total)
3. T005 → T006 — audit (5 min)
4. T007 — `bun typecheck` (1 min)

## Optimization: `deepUnref` instead of `toRawJSON`

Instead of `toRawJSON` (= `JSON.parse(JSON.stringify(obj))` — full string serialization round-trip),
we use the existing `deepUnref` helper (`core/helpers/deepUnRef.ts`) which:
- Uses Vue's `unref` to strip `ref()` wrappers
- Uses `Object.keys()` + property access on `reactive()` Proxy to recursively enumerate plain values
- No string allocation, no JSON serialization overhead
- Already in the helpers barrel (`core/helpers/index.ts`)
- Verified: `structuredClone(deepUnref(state))` succeeds where `state` has `reactive({})` nested values

---

## Notes

- All three US1 tasks ([P]) can be completed and committed independently
- [P] tasks = different files, zero dependencies between them
- The `DataCloneError` is thrown by `localforage.setItem()` → IndexedDB `IDBObjectStore.put()` internally, which uses Structured Clone Algorithm
- Data written before this fix is not affected (already-stored records loaded by `getItem()` are plain objects, not Proxies)
- After this fix, all future writes will serialize correctly; previously-failed writes (that produced DataCloneError) were never stored, so there is no stale corrupted data to clean up
