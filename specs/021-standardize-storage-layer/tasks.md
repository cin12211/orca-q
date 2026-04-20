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
