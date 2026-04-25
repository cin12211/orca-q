# Tasks: Standardise Storage Layer — Electron Merge Import + Query Builder LocalStorage Parity

**Feature**: Standardise Storage Layer  
**Branch**: `021-standardize-storage-layer`  
**Generated**: 2026-04-20  
**Input**: Fix `Error invoking remote method 'persist:merge-all': Error: No handler registered for 'persist:merge-all'` during restore/import, and remove `query_builder_states` from the Electron SQLite path so app behavior matches the web version where Query Builder state stays in localStorage.  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Data Model**: [data-model.md](./data-model.md) | **Quickstart**: [quickstart.md](./quickstart.md)

**Tests**: No dedicated test-first tasks are included because the request is implementation-focused rather than TDD-focused.

---

## Phase 1: Setup

**Purpose**: Re-scope the active feature docs around the narrowed persistence boundary before implementation starts.

- [X] T001 Update `specs/021-standardize-storage-layer/spec.md` and `specs/021-standardize-storage-layer/plan.md` so Query Builder state is documented as localStorage-only and `persist:merge-all` is treated as a required Electron restore contract

---

## Phase 2: Foundational

**Purpose**: Establish one authoritative Electron persist contract and remove Query Builder state from that contract before any story work starts.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T002 Update `core/storage/idbRegistry.ts`, `electron/preload.ts`, `electron/types/global.d.ts`, and `core/persist/adapters/electron/primitives.ts` to define one shared Electron persist surface that keeps `mergeAll` but excludes localStorage-only Query Builder state
- [X] T003 Update `electron/ipc/persist.ts`, `electron/ipc/index.ts`, and `electron/main.ts` so the main process registers the `persist:merge-all` handler on the same boot path used by restore/import flows before the renderer can invoke it

**Checkpoint**: The Electron IPC surface and collection contract are aligned for restore/import work.

---

## Phase 3: User Story 1 - Restore Import Works In Electron (Priority: P1) 🎯 MVP

**Goal**: Electron restore/import no longer fails with `No handler registered for 'persist:merge-all'` and continues to use merge semantics for supported persisted collections.

**Independent Test**: In Electron, import a valid backup and confirm the restore proceeds past the warning dialog without throwing `persist:merge-all` handler errors.

### Implementation for User Story 1

- [X] T004 [US1] Update `electron/persist/store.ts` to match the narrowed persist contract and keep `persistMergeAll()` available for every backup-import collection that still belongs to Electron persistence
- [X] T005 [US1] Update `components/modules/settings/hooks/useDataImport.ts` so Electron restore only invokes supported merge collections and surfaces a deterministic error path if the preload persist API is unavailable
- [X] T006 [US1] Update `specs/021-standardize-storage-layer/quickstart.md` with an explicit Electron restore validation flow covering the warning dialog, `mergeAll` IPC path, and successful merged import

**Checkpoint**: Electron restore/import is again independently testable.

---

## Phase 4: User Story 2 - Query Builder State Stays LocalStorage-Only (Priority: P1)

**Goal**: Query Builder state is no longer modeled or stored in Electron SQLite, matching the web behavior where it remains localStorage-backed UI state.

**Independent Test**: Search the live Electron persistence layer and confirm `query_builder_states` no longer exists in the schema, SQLite entity exports, or Electron persist routing, while `core/composables/useTableQueryBuilder.ts` still restores state through localStorage.

### Implementation for User Story 2

- [X] T007 [P] [US2] Remove the `query_builder_states` table and index from `electron/persist/migration/versions/v001-initial-schema.ts`, and remove the matching `QueryBuilderStateRow` documentation from `electron/persist/schema.ts`
- [X] T008 [P] [US2] Delete `electron/persist/entities/QueryBuilderStateSQLiteStorage.ts` and remove its export from `electron/persist/entities/index.ts`
- [X] T009 [US2] Update `electron/persist/store.ts` to remove `query_builder_states` adapter imports, switch cases, and any other SQLite routing for Query Builder state
- [X] T010 [P] [US2] Update `core/storage/idbRegistry.ts` and `components/modules/settings/hooks/backupData.ts` comments to make it explicit that Query Builder state is excluded from Electron persist collections and backup import/export payloads because it remains localStorage-only
- [X] T011 [US2] Update `core/composables/useTableQueryBuilder.ts` to keep the localStorage path explicit and document that Query Builder persistence must not route through Electron persist or backup collections
- [X] T012 [P] [US2] Update `specs/021-standardize-storage-layer/research.md`, `specs/021-standardize-storage-layer/data-model.md`, `specs/021-standardize-storage-layer/quickstart.md`, and `specs/021-standardize-storage-layer/contracts/storage-contracts.md` to remove Query Builder SQLite or IDB migration assumptions and describe localStorage-only parity with web

**Checkpoint**: Query Builder persistence is fully decoupled from Electron SQLite and backup collections.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify the narrowed persistence boundary and remove stale references after both stories land.

- [X] T013 [P] Update `specs/021-standardize-storage-layer/tasks.md` and `specs/021-standardize-storage-layer/quickstart.md` to reflect the final implementation scope and Electron verification steps after the code changes are complete
- [X] T014 Run targeted validation against `electron/**`, `core/storage/**`, and `specs/021-standardize-storage-layer/**` to confirm `persist:merge-all` is wired end-to-end and `query_builder_states` no longer appears in the live Electron persistence path

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies.
- **Phase 2: Foundational**: Depends on Phase 1 and blocks both user stories.
- **Phase 3: User Story 1**: Depends on Phase 2.
- **Phase 4: User Story 2**: Depends on Phase 2 and can run in parallel with the tail of User Story 1 once the shared Electron persist contract is narrowed.
- **Phase 5: Polish**: Depends on both user stories being complete.

### User Story Dependencies

- **US1**: Starts after T002-T003 align the Electron persist contract and handler registration path.
- **US2**: Starts after T002 narrows the collection union so Query Builder state is no longer treated as an Electron-persisted collection.

### Within Each User Story

- Shared persist surface changes before store routing changes.
- Store routing changes before restore/import hook cleanup.
- SQLite schema and entity removals before doc cleanup.

---

## Parallel Opportunities

- T007 and T008 can run in parallel because they touch different Electron persistence files.
- T010 and T012 can run in parallel because one updates live collection comments while the other updates design docs.
- T013 can run after both user stories while T014 is prepared as the final validation pass.

---

## Parallel Example: User Story 2

```bash
# Remove schema/entity pieces independently:
Task: "Remove the query_builder_states table and index from electron/persist/migration/versions/v001-initial-schema.ts, and remove the matching QueryBuilderStateRow documentation from electron/persist/schema.ts"
Task: "Delete electron/persist/entities/QueryBuilderStateSQLiteStorage.ts and remove its export from electron/persist/entities/index.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete User Story 1 and validate Electron restore/import.
3. Stop and verify the handler error is gone before removing Query Builder SQLite pieces.

### Incremental Delivery

1. Fix the broken Electron restore/import path first.
2. Remove `query_builder_states` from Electron SQLite and sync docs.
3. Finish with targeted validation and doc cleanup.

---

## Task Summary

- **Total tasks**: 14
- **Setup**: 1 task
- **Foundational**: 2 tasks
- **User Story 1**: 3 tasks
- **User Story 2**: 6 tasks
- **Polish**: 2 tasks

## Independent Test Criteria

- **US1**: Importing a backup in Electron completes without `persist:merge-all` registration errors.
- **US2**: `query_builder_states` is gone from the live Electron persistence path, while Query Builder UI state still restores from localStorage.

## Format Validation

- All tasks use the required checklist format: checkbox, task ID, optional `[P]`, optional `[US#]`, and exact file paths.

---

---

# Tasks: RowQueryFile — Full Field Persistence in Electron SQLite

**Generated**: 2026-04-20  
**Input**: `RowQueryFile` entity in `core/types/entities/row-query-file.entity.ts` contains fields (`isFolder`, `icon`, `closeIcon`, `path`, `cursorPos`) that are not saved to the `row_query_files` SQLite table in the Electron persist layer. Electron restarts cannot fully reconstruct file-tree items because those columns are absent from the schema and are not mapped in `RowQueryFileSQLiteStorage`.  
**Spec**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md) | **Plan**: [plan.md](./plan.md)

**Tests**: No dedicated test-first tasks — implementation-focused request.

---

## Phase 6: Foundational — Clarify Persistence Boundary

**Purpose**: Record the authoritative decision on which `RowQueryFile` fields are persisted in SQLite versus UI-only, before any schema or code changes.

**⚠️ CRITICAL**: Complete before any schema or storage class work starts.

- [X] T015 Update `specs/021-standardize-storage-layer/data-model.md` section 1.6 to list `isFolder`, `icon`, `closeIcon?`, `path?`, and `cursorPos?` as explicit persistable fields alongside the existing fields, and add a note that `status` (`ETreeFileSystemStatus`) is UI-only and MUST NOT be persisted in SQLite or IDB

**Checkpoint**: The persistence boundary is documented — schema and storage work can now begin.

---

## Phase 7: User Story 3 — RowQueryFile Full Field Persistence (Priority: P2)

**Goal**: All persistable fields of the `RowQueryFile` TypeScript entity — `isFolder`, `icon`, `closeIcon`, `path`, and `cursorPos` — survive a round-trip through Electron SQLite so the file tree can be fully reconstructed after an app restart without losing icon, folder flag, path, or cursor position.

**Independent Test**: Upsert a `RowQueryFile` with `isFolder: true`, `icon: 'i-custom-icon'`, `closeIcon: 'i-x'`, `path: '/queries/test.sql'`, and `cursorPos: { from: 10, to: 20 }` via `rowQueryFileSQLiteStorage.createFiles(file)`, then call `rowQueryFileSQLiteStorage.getAllFiles()` and confirm all five fields are present on the returned record with their original values.

### Implementation for User Story 3

- [X] T016 [US3] Update `electron/persist/schema/row-query-files.ts` — extend `RowQueryFileRow` type to include `isFolder` (`number`), `icon` (`string`), `closeIcon` (`string | null`), `path` (`string | null`), and `cursorPos` (`string | null`); add matching `.integer('is_folder')`, `.text('icon')`, `.text('close_icon').nullable()`, `.text('path').nullable()`, and `.text('cursor_pos').nullable()` columns to `createRowQueryFilesTable()` so fresh installs get the full schema

- [~] T017 [US3] ~~Create `electron/persist/migration/versions/v002-rqf-missing-fields.ts`~~ — **SUPERSEDED**: app has not shipped; no existing databases exist. New columns were added directly to `createRowQueryFilesTable()` in v001, so no migration file is needed.

- [~] T018 [US3] ~~Register the v002 migration in `electron/persist/migration/runner.ts`~~ — **SUPERSEDED**: v002 file was removed; v001 is the sole migration and already includes the new columns.

- [X] T019 [US3] Update `electron/persist/entities/RowQueryFileSQLiteStorage.ts` — in `toRow()` add `isFolder`, `icon`, `closeIcon`, `path`, and `cursorPos` (JSON-stringified object or `null`); in `fromRow()` parse them back with safe fallbacks (`isFolder: Number(r.isFolder) === 1`, `icon: r.icon ?? ''`, `closeIcon: r.closeIcon ?? undefined`, `path: r.path ?? undefined`, `cursorPos: r.cursorPos ? JSON.parse(r.cursorPos) : undefined`)

**Checkpoint**: User Story 3 is independently testable — a fresh Electron boot loads a full file-tree record with all five new fields intact.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify the schema change is type-safe and the migration path works for both new and existing installs.

- [X] T020 [P] Run `vue-tsc --noEmit` from the project root and confirm zero TypeScript errors introduced by the schema type and storage class changes in `electron/persist/schema/row-query-files.ts` and `electron/persist/entities/RowQueryFileSQLiteStorage.ts`

---

## Dependencies & Execution Order (RowQueryFile work)

- **Phase 6**: Must complete before Phase 7.
- **T016 and T017**: Can run in parallel (different files, no shared state).
- **T018**: Depends on T017 (imports the new migration file).
- **T019**: Depends on T016 (uses the updated `RowQueryFileRow` type).
- **T020**: Depends on T016, T017, T018, T019 all being complete.

---

## Parallel Opportunities

```bash
# T016 and T017 touch different files — run in parallel:
Task: "Update electron/persist/schema/row-query-files.ts RowQueryFileRow type and createRowQueryFilesTable()"
Task: "Create electron/persist/migration/versions/v002-rqf-missing-fields.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 6 (T015) — document the boundary.
2. Run T016 + T017 in parallel.
3. Apply T018 (register migration).
4. Apply T019 (update storage class mapping).
5. Verify with T020.

### Key Decisions

| Field | SQLite column | Type | Notes |
|---|---|---|---|
| `isFolder` | `is_folder` | `INTEGER` (0/1) | Required — needed to reconstruct folder nodes |
| `icon` | `icon` | `TEXT NOT NULL` | Required — file-tree display |
| `closeIcon` | `close_icon` | `TEXT NULL` | Optional — file-tree display |
| `path` | `path` | `TEXT NULL` | Optional — may be undefined for in-memory files |
| `cursorPos` | `cursor_pos` | `TEXT NULL` | JSON-encoded `{ from, to }` — restores editor position |
| `status` | _(not persisted)_ | — | UI-only (`ETreeFileSystemStatus`) — omit from SQLite |

> **Migration note**: App not yet delivered — no v002 migration file needed. New columns are part of the v001 initial schema in `createRowQueryFilesTable()`. If a migration is needed in future (after first release), create `v002-rqf-missing-fields.ts` using `hasColumn` guards.

---

## Task Summary (RowQueryFile work)

- **Total new tasks**: 6
- **Foundational**: 1 task (T015)
- **User Story 3**: 4 tasks (T016–T019)
- **Polish**: 1 task (T020)

## Independent Test Criteria

- **US3**: A `RowQueryFile` round-trips through `rowQueryFileSQLiteStorage` with all five new fields (`isFolder`, `icon`, `closeIcon`, `path`, `cursorPos`) intact on the returned record.

## Format Validation

- All tasks use the required checklist format: checkbox, task ID, optional `[P]`, optional `[US#]`, and exact file paths.
