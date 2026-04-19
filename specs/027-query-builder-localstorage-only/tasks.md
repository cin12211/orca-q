# Tasks: Query Builder — localStorage Only (Drop IDB + Migration)

**Feature**: `027-query-builder-localstorage-only`
**Priority**: CRITICAL — simplify persistence, fix DataCloneError source, remove dead complexity

## Context

`useTableQueryBuilder` currently routes QB state through:
- **Web**: `window.queryBuilderStateApi` → `queryBuilderStateIDBAdapter` → IDB (`localforage`)
- **Electron**: same adapter (re-exported as electron adapter, also IDB)
- **New storage layer**: `QueryBuilderStateStorage extends IDBStorage<QueryBuilderState>`

**Decision**: Use `localStorage` directly (via `LocalStorageManager` from feature 028).
- QB state is **UI ephemeral** — filter/sort/pagination state per table view. Not important enough to survive app data export, not needed in IDB.
- The IDB path caused the original `DataCloneError` (reactive proxy objects).
- `localStorage` is synchronous, no Proxy issue, zero overhead, already used for legacy QB state before migration.
- Electron and Web both have `localStorage` available.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files)
- **[Story]**: User story label

---

## Scope of Changes

| File | Action |
|---|---|
| `core/composables/useTableQueryBuilder.ts` | Replace `window.queryBuilderStateApi` with direct `localStorage` calls |
| `core/persist/adapters/idb/query-builder-state.ts` | Delete file |
| `core/persist/adapters/idb/index.ts` | Remove QB export |
| `core/persist/adapters/electron/query-builder-state.ts` | Delete file |
| `core/persist/adapters/electron/index.ts` | Remove QB export |
| `core/persist/factory.ts` | Remove QB from IDB and Electron factories |
| `core/persist/types.ts` | Remove `QueryBuilderStatePersistApi`, `QueryBuilderPersistedState` |
| `core/persist/globals.d.ts` | Remove `queryBuilderStateApi` from `window` |
| `core/storage/entities/QueryBuilderStateStorage.ts` | Delete file |
| `core/storage/entities/index.ts` | Remove QB export |
| `core/storage/factory.ts` | Remove QB from both IDB and Electron factory branches |
| `core/storage/types.ts` | Remove `QueryBuilderStateStorageApi` |
| `core/types/entities/query-builder-state.entity.ts` | Keep — type still needed for localStorage shape |
| `core/types/entities/index.ts` | Keep as-is |
| `core/persist/migration/versions/MigrateLegacyQueryBuilderState1740477873008.ts` | Delete file |
| `core/persist/migration/index.ts` | Remove QB migration from `ALL_MIGRATIONS` |
| `test/unit/core/storage/entities/QueryBuilderStateStorage.spec.ts` | Delete file |

**Export/Import flow**: QB state is NOT in `PERSIST_COLLECTIONS` in `primitives.ts` — no changes needed to export/import hooks. Confirm and comment.

---

## Phase 1: Setup

- [ ] T001 Confirm `query_builder_states` is NOT listed in `PERSIST_COLLECTIONS` in `core/persist/adapters/idb/primitives.ts` — add inline comment `// QB state not exported: uses localStorage directly` next to the collection list

---

## Phase 2: Foundational — Update `useTableQueryBuilder.ts`

**Purpose**: The composable is the only consumer of `queryBuilderStateApi`. Replace with direct localStorage reads/writes using `LocalStorageKey.QUERY_BUILDER_STATE` prefix (from feature 028). For now use inline string key until feature 028 lands.

- [ ] T002 Update `core/composables/useTableQueryBuilder.ts` — replace both usages of `window.queryBuilderStateApi` with direct `localStorage`:
  - `save` call: `localStorage.setItem(persistedKey, JSON.stringify({ filters: filters.value, pagination: { ...pagination }, orderBy: { ...orderBy }, isShowFilters: isShowFilters.value, composeWith: composeWith.value }))` — use spread to strip Proxy
  - `load` call: `const raw = localStorage.getItem(persistedKey); const persistedState = raw ? JSON.parse(raw) : null;`
  - Remove the `async/await` from both operations (localStorage is sync)

---

## Phase 3: User Story 1 — Remove IDB Adapter Layer (P1) 🎯

**Goal**: Delete all QB-specific IDB adapter files and references.

**Independent Test**: `bun typecheck` exits 0 after all deletes and reference removals.

### US1 — Delete dead files

- [ ] T003 [P] [US1] Delete `core/persist/adapters/idb/query-builder-state.ts`
- [ ] T004 [P] [US1] Delete `core/persist/adapters/electron/query-builder-state.ts`
- [ ] T005 [P] [US1] Delete `core/storage/entities/QueryBuilderStateStorage.ts`
- [ ] T006 [P] [US1] Delete `core/persist/migration/versions/MigrateLegacyQueryBuilderState1740477873008.ts`
- [ ] T007 [P] [US1] Delete `test/unit/core/storage/entities/QueryBuilderStateStorage.spec.ts`

### US1 — Remove from index/barrel files

- [ ] T008 [P] [US1] Remove QB export from `core/persist/adapters/idb/index.ts` — delete line `export { queryBuilderStateIDBAdapter } from './query-builder-state';`
- [ ] T009 [P] [US1] Remove QB export from `core/persist/adapters/electron/index.ts` — delete line `export { queryBuilderStateElectronAdapter } from './query-builder-state';`
- [ ] T010 [P] [US1] Remove QB export from `core/storage/entities/index.ts` — delete line `export { queryBuilderStateStorage } from './QueryBuilderStateStorage';`

### US1 — Remove from factories

- [ ] T011 [P] [US1] Update `core/persist/factory.ts` — remove `queryBuilderStateElectronAdapter` import, remove `queryBuilderStateIDBAdapter` import, remove `queryBuilderStateApi` from both `createIDBApis()` and `createElectronApis()` return objects; remove from `PersistApis` type usage
- [ ] T012 [P] [US1] Update `core/storage/factory.ts` — remove `queryBuilderStateElectronAdapter` import, remove `queryBuilderStateStorage` import, remove `queryBuilderStateStorage` from `createIDBStorageApis()` return, remove `queryBuilderStateStorage` from `createElectronStorageApis()` return

### US1 — Remove from type definitions

- [ ] T013 [P] [US1] Update `core/persist/types.ts` — remove `QueryBuilderStatePersistApi` interface and `QueryBuilderPersistedState` interface entirely
- [ ] T014 [P] [US1] Update `core/storage/types.ts` — remove `QueryBuilderStateStorageApi` interface and `queryBuilderStateStorage` field from `StorageApis`
- [ ] T015 [P] [US1] Update `core/persist/globals.d.ts` — remove `queryBuilderStateApi: QueryBuilderStatePersistApi` from `Window` declaration; remove the `QueryBuilderStatePersistApi` import if present

### US1 — Remove migration registration

- [ ] T016 [US1] Update `core/persist/migration/index.ts` — remove `MigrateLegacyQueryBuilderState1740477873008` import and entry from `ALL_MIGRATIONS` array

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T017 Run `bun typecheck` — verify exit 0

---

## Dependencies

- T002 must come BEFORE T003–T016 (composable no longer uses the API before we delete it)
- T001 is standalone audit, can run immediately
- T003–T016 are all independent of each other (different files)
- T017 must be last

## Parallel Example: US1

```
# All delete + reference removal tasks run in parallel:
T003: delete idb/query-builder-state.ts
T004: delete electron/query-builder-state.ts
T005: delete storage/entities/QueryBuilderStateStorage.ts
T006: delete migration/versions/MigrateLegacy*.ts
T007: delete spec file
T008: update idb/index.ts
T009: update electron/index.ts
T010: update storage/entities/index.ts
T011: update persist/factory.ts
T012: update storage/factory.ts
T013: update persist/types.ts
T014: update storage/types.ts
T015: update globals.d.ts
T016: update migration/index.ts
```

## Notes

- `core/types/entities/query-builder-state.entity.ts` is **kept** — the `QueryBuilderState` type still describes the localStorage JSON shape; removing it would require inline typing throughout
- The QB state composite key format `${workspaceId}-${connectionId}-${schemaName}-${tableName}` stays the same — existing localStorage data is still readable
- `isQueryBuilderPersistedState` type guard in the old adapter is only used in the migration being deleted — no other file needs it
- QB state is NOT in `PERSIST_COLLECTIONS` → no changes to export/import flow (T001 confirms this)
