# Tasks: Playwright Browser E2E Tests — Workspace & Connection Flow

**Input**: Design documents from `/specs/002-playwright-e2e-tests/`
**Prerequisites**: plan.md ✅, spec.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Install Playwright, configure the test runner, and wire up the npm script

- [x] T001 [Setup] Install `@playwright/test` package and download Chromium browser binary
- [x] T002 [Setup] Create `playwright.config.ts` at repo root (baseURL, testDir, webServer, Chromium project, timeouts)
- [x] T003 [Setup] Add `"test:playwright": "playwright test"` script to `package.json`
- [x] T004 [Setup] Create `test/playwright/pages/` directory structure

---

## Phase 2: Page Objects

**Purpose**: Encapsulate all selector logic so test files stay readable and DRY

- [x] T005 [P] [All] Create `test/playwright/pages/WorkspacesPage.ts`
- [x] T006 [P] [US4–US6] Create `test/playwright/pages/ConnectionModalPage.ts`

---

## Phase 3: Core Tests (US1–US3) — Workspace CRUD + Search

**Purpose**: Browser-level tests for workspace creation, listing, and searching

- [x] T007 [US1] Create `test/playwright/workspace.spec.ts` with changelog-suppression init script
- [x] T008 [US1] Write test: "home page renders empty state when no workspaces exist"
- [x] T009 [US1] Write test: "page loads without JavaScript errors"
- [x] T010 [US2] Write test: "user can open the create workspace modal"
- [x] T011 [US2] Write test: "user can create a workspace and see it in the grid"
- [x] T012 [US2] Write test: "closing modal without filling name does not create a workspace"
- [x] T013 [US3] Write test: "search filters workspaces by name"
- [x] T014 [US3] Write test: "clearing search restores all workspace cards"
- [x] T015 [US3] Write test: "search with no matches shows empty state"

---

## Phase 4: Connection Modal Tests (US4–US5)

**Purpose**: Browser-level tests for opening connection management and the add-connection wizard step 1

- [x] T016 [US4] Create `test/playwright/connection.spec.ts` with init script setup
- [x] T017 [US4] Write test: "clicking workspace card opens connection management modal"
- [x] T018 [US4] Write test: "connection modal shows Add Connection button and empty state"
- [x] T019 [US5] Write test: "clicking Add Connection opens step 1 DB type selection"
- [x] T020 [US5] Write test: "user can select PostgreSQL and advance to step 2"

---

## Phase 5: Credential Tests (US6 — skippable)

**Purpose**: Tests step 2 of the add-connection wizard using real DB credentials (graceful skip if env var absent)

- [x] T021 [US6] Create `test/playwright/connection-credentials.spec.ts` with `test.skip` guard
- [x] T022 [US6] Write test: "step 2 form renders connection string input"
- [x] T023 [US6] Write test: "test connection with valid credentials shows success"
- [x] T024 [US6] Write test: "test connection with invalid credentials shows error"

---

## Phase 6: Validation

**Purpose**: Confirm the full suite runs cleanly

- [x] T025 [Validation] Run `bun test:playwright` — 21 passed, 3 skipped (PG_CONNECTION absent), 0 failed, 48.4s
- [x] T026 [Validation] Update this tasks.md marking all completed tasks as [X]
