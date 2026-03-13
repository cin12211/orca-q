# Tasks: E2E Test Coverage — Workspace & Connection Full Flow

**Input**: Design documents from `/specs/001-e2e-workspace-connection/`
**Prerequisites**: plan.md ✓, spec.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Verify project structure and ignore files are correct

- [x] T001 Confirm vitest.config.ts multiproject setup is intact (unit / nuxt / e2e)
- [x] T002 Confirm .gitignore has node_modules/, coverage/ entries

---

## Phase 2: User Story 1 — Workspace CRUD Full Flow (Priority: P1) 🎯

**Goal**: Tests for `useWorkspaces`, `useWorkspaceForm`, `useWorkspaceCard` hooks covering create, update, delete, search

### Tests

- [x] T003 [P] [US1] Create `test/unit/components/modules/workspace/schemas/workspace.schema.spec.ts` — Zod schema validates required name, rejects empty, accepts optional desc
- [x] T004 [P] [US1] Create `test/nuxt/components/modules/workspace/hooks/useWorkspaces.test.ts` — search filtering (debounce), onSelectWorkspace, modal state
- [x] T005 [P] [US1] Create `test/nuxt/components/modules/workspace/hooks/useWorkspaceForm.test.ts` — create submission, update submission, store calls
- [x] T006 [P] [US1] Create `test/nuxt/components/modules/workspace/hooks/useWorkspaceCard.test.ts` — delete confirmation, connections computed, openWorkspaceWithConnection

**Checkpoint**: All workspace hook tests green independently

---

## Phase 3: User Story 2 — Connection CRUD Inside a Workspace (Priority: P1) 🎯

**Goal**: Tests for `useConnectionForm` hook — step navigation, both connection methods, test status, form reset

### Tests

- [x] T007 [US2] Create `test/nuxt/components/modules/connection/hooks/useConnectionForm.test.ts`:
  - Step 1 → 2 navigation via `handleNext`
  - `handleBack` returns to step 1 and resets testStatus
  - `handleTestConnection` (STRING method) — success path: calls service, sets `testStatus = 'success'`
  - `handleTestConnection` — failure path: service returns false → `testStatus = 'error'`
  - `handleTestConnection` — exception path: service throws → `testStatus = 'error'`
  - `resetForm` restores all defaults
  - `isFormValid` computed for STRING method (requires connectionString)
  - `isFormValid` computed for FORM method (requires host + user + database)
  - `handleCreateConnection` (STRING) calls `onAddNew` with correct Connection shape

**Checkpoint**: All connection hook tests green independently

---

## Phase 4: User Story 4 — API Health-Check E2E (Priority: P2)

**Goal**: Verify `/api/managment-connection/health-check` endpoint (already covered by existing test; review and mark complete)

- [x] T008 [US4] Review `test/e2e/connection.test.ts` — already covers connection-string POST, form-fields POST, and invalid-host failure. No changes needed.

**Checkpoint**: E2E API test passes with PG_CONNECTION set, skips gracefully without it

---

## Phase 5: Verify Test Suite

- [x] T009 Run `bun test:unit` — 13 files, 129 tests all pass (includes 7 new schema tests)
- [x] T010 Run `bun test:nuxt` — 17 files pass, 192 tests pass (62 new: 14 useWorkspaces + 9 useWorkspaceForm + 11 useWorkspaceCard + 28 useConnectionForm); 3 pre-existing failures unrelated to this feature
- [x] T011 Run `bun test:e2e` — 1 file, 3 tests pass (health-check API: connection-string, form-fields, invalid-host)

---

## Dependencies & Execution Order

- T003–T006 [P]: All independent, run in parallel
- T007: Independent of T003–T006 (different module)
- T008: Review only — no new code
- T009–T011: Run after all test files are created

### Parallel Opportunities

- T003, T004, T005, T006, T007 can all be written in parallel (separate files)
