# Tasks: Expanded Database Support

**Feature**: `033-expand-db-support`  
**Branch**: `033-expand-db-support`  
**Generated**: 2026-04-28  
**Input**: Design documents from `/specs/033-expand-db-support/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Includes the requested unit, Nuxt, E2E, and Playwright coverage. Redis and MongoDB live validation should use Podman/Docker-compatible fixture services, while D1 and Turso remain env-gated live credentials.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an independent increment after the foundational phase is complete.

**Status Correction (2026-04-28)**: MongoDB-specific implementation and coverage are still pending in the current branch. Any task that explicitly requires MongoDB runtime/UI/test deliverables, or a mixed Redis+MongoDB deliverable that is only partially complete, has been reset to unchecked below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file paths

---

## Phase 1: Setup

**Purpose**: Install the required runtime packages and create the live-test fixture scaffolding before touching shared connection logic.

- [ ] T001 Update `package.json` to add runtime dependencies for `@libsql/client`, `redis`, and `mongodb`
- [ ] T002 [P] Create Podman/Docker-compatible Redis and MongoDB fixture services in `test/fixtures/containers/nosql-services.compose.yml`, `scripts/test-services/start-nosql-fixtures.sh`, and `scripts/test-services/stop-nosql-fixtures.sh`
- [ ] T003 [P] Create shared live-connection helpers for D1, Turso, Redis, and MongoDB in `test/support/live-connections.ts` and `test/support/nosql-fixtures.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared provider model, capability registry, routing, and validation boundaries that every story depends on.

**⚠️ CRITICAL**: No user story work should begin until T004-T010 are complete.

- [x] T004 Expand provider-aware connection and tab entities in `core/constants/database-client-type.ts`, `core/types/entities/connection.entity.ts`, `components/modules/connection/types/index.ts`, and `core/types/entities/tab-view.entity.ts`
- [x] T005 Persist provider-aware connection metadata and family-safe tab state in `core/stores/managementConnectionStore.ts`, `electron/persist/schema/connections.ts`, `electron/persist/entities/ConnectionSQLiteStorage.ts`, and `core/stores/useTabViewsStore.ts`
- [x] T006 [P] Create the shared capability registry and family-resolution helpers in `core/constants/connection-capabilities.ts`, `core/helpers/parser-connection-string.ts`, and `components/modules/connection/services/connection.service.ts`
- [x] T007 Make the activity bar, primary sidebar, and persisted activity fallback family-aware in `components/modules/app-shell/activity-bar/hooks/useActivityMenu.ts`, `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`, and `core/stores/useActivityBarStore.ts`
- [ ] T008 Refactor workspace entry and tab routing for family-specific routes in `pages/[workspaceId]/[connectionId]/index.vue`, `core/composables/useTabManagement.ts`, `pages/[workspaceId]/[connectionId]/quick-query/[tabViewId].vue`, and create `pages/[workspaceId]/[connectionId]/redis/[tabViewId].vue` and `pages/[workspaceId]/[connectionId]/mongodb/[tabViewId].vue`
- [ ] T009 Refactor shared validation/runtime dispatch so SQL, Redis, and MongoDB never fall back to PostgreSQL in `server/api/managment-connection/health-check.ts`, `server/infrastructure/driver/db-connection.ts`, `server/infrastructure/driver/factory.ts`, and create `server/infrastructure/nosql/index.ts`
- [x] T010 [P] Add foundational family-gating coverage in `test/nuxt/components/modules/app-shell/activity-bar/useActivityMenu.test.ts`, `test/nuxt/components/modules/connection/hooks/useConnectionForm.test.ts`, and create `test/nuxt/core/composables/useTabManagement.test.ts`

**Checkpoint**: The app can classify each connection into `sql`, `redis`, or `mongodb`, recover from incompatible persisted shell state, and dispatch validation/runtime work without implicit PostgreSQL assumptions.

---

## Phase 3: User Story 1 - Connect New Data Sources (Priority: P1) 🎯 MVP

**Goal**: Users can create, validate, save, reopen, and route Cloudflare D1, Turso, Redis, and MongoDB connections into the correct workspace family with incompatible features hidden.

**Independent Test**: Create one valid D1, Turso, Redis, and MongoDB connection, reconnect from saved state, and confirm HeraQ lands on the correct family-compatible workspace surface every time.

### Tests for User Story 1

- [ ] T011 [P] [US1] Extend connection-form unit coverage for D1, Turso, Redis, and MongoDB provider rules in `test/nuxt/components/modules/connection/hooks/useConnectionForm.test.ts`
- [ ] T012 [P] [US1] Add server dispatch unit coverage for managed SQLite, Redis, and MongoDB validation in `test/unit/server/api/managment-connection/health-check.spec.ts` and `test/unit/server/infrastructure/driver/factory.spec.ts`
- [ ] T013 [P] [US1] Add Nuxt E2E health-check coverage for env-gated D1/Turso credentials and Podman-backed Redis/MongoDB fixtures in `test/e2e/connection.test.ts`
- [x] T014 [P] [US1] Extend Playwright connection wizard and family-redirect coverage in `test/playwright/connection.spec.ts`, `test/playwright/connection-form.spec.ts`, `test/playwright/connection-form-live.spec.ts`, and `test/playwright/pages/ConnectionModalPage.ts`

### Implementation for User Story 1

- [ ] T015 [US1] Enable D1, Turso, Redis, and MongoDB in the connection picker and step-2 flow in `components/modules/connection/constants/index.ts`, `components/modules/connection/components/DatabaseTypeCard.vue`, `components/modules/connection/components/ConnectionStepType.vue`, `components/modules/connection/components/CreateConnectionModal.vue`, and `components/modules/connection/hooks/useConnectionForm.ts`
- [x] T016 [P] [US1] Implement Cloudflare D1 managed-SQLite validation and query transport in `server/infrastructure/driver/managed-sqlite/d1.adapter.ts`, `server/infrastructure/driver/managed-sqlite/index.ts`, and `server/infrastructure/driver/sqlite.adapter.ts`
- [x] T017 [P] [US1] Implement Turso managed-SQLite validation and branch-aware query transport in `server/infrastructure/driver/managed-sqlite/turso.adapter.ts`, `server/infrastructure/driver/managed-sqlite/index.ts`, and `server/infrastructure/driver/sqlite.adapter.ts`
- [ ] T018 [P] [US1] Implement Redis and MongoDB connection clients for validation and session bootstrap in `server/infrastructure/nosql/redis/redis.client.ts`, `server/infrastructure/nosql/mongodb/mongodb.client.ts`, and `server/infrastructure/driver/db-connection.ts`
- [x] T019 [US1] Register managed SQLite provider-aware query and metadata routing in `server/infrastructure/database/adapters/query/query.factory.ts`, `server/infrastructure/database/adapters/metadata/metadata.factory.ts`, `server/infrastructure/database/adapters/tables/tables.factory.ts`, and `server/infrastructure/driver/sqlite.adapter.ts`
- [x] T020 [US1] Route successful connections into compatible family landing surfaces and hide incompatible tools in `components/modules/connection/services/connection.service.ts`, `pages/[workspaceId]/[connectionId]/index.vue`, `components/modules/management/database-tools/ManagementDatabaseTools.vue`, `components/modules/quick-query/QuickQuery.vue`, and `components/modules/raw-query/hooks/useQueryExecution.ts`

**Checkpoint**: D1, Turso, and Redis connections can be created and reopened safely, with SQL-family routes preserved for managed SQLite and Redis sessions redirected away from incompatible SQL-only surfaces. MongoDB remains pending in this branch.

---

## Phase 4: User Story 2 - Explore and Operate Redis Data (Priority: P2)

**Goal**: Users get a RedisInsight-like workflow for browsing keys, inspecting values, running commands, and reviewing operational signals without falling back to SQL views.

**Independent Test**: Connect to a Redis instance with mixed key types, browse and filter keys, edit a value, run a command, and review at least one analysis surface from the Redis workspace.

### Tests for User Story 2

- [x] T021 [P] [US2] Add Redis workspace state and browser unit coverage in `test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts` and `test/nuxt/components/modules/management/redis-browser/ManagementRedisBrowser.test.ts`
- [x] T022 [P] [US2] Add Redis server API unit coverage in `test/unit/server/api/redis/browser.spec.ts`, `test/unit/server/api/redis/workbench.spec.ts`, and `test/unit/server/api/redis/analysis.spec.ts`
- [x] T023 [P] [US2] Add Playwright Redis workflow coverage against the Podman Redis fixture in `test/playwright/redis-workspace.spec.ts` and `test/playwright/pages/RedisWorkspacePage.ts`

### Implementation for User Story 2

- [x] T024 [P] [US2] Create the Redis workspace session store and composables in `core/stores/useRedisWorkspaceStore.ts` and `components/modules/redis-workspace/hooks/useRedisWorkspace.ts`
- [x] T025 [P] [US2] Create Redis explorer/sidebar surfaces in `components/modules/management/redis-browser/ManagementRedisBrowser.vue`, `components/modules/management/redis-browser/components/RedisKeyTree.vue`, and `components/modules/management/redis-browser/components/RedisKeyFilters.vue`
- [x] T026 [P] [US2] Create Redis value, command, and analysis workspace surfaces in `components/modules/redis-workspace/RedisWorkspace.vue`, `components/modules/redis-workspace/components/RedisValueEditor.vue`, `components/modules/redis-workspace/components/RedisCommandWorkbench.vue`, and `components/modules/redis-workspace/components/RedisAnalysisPanel.vue`
- [x] T027 [P] [US2] Implement Redis browser, workbench, and analysis server routes in `server/api/redis/browser/index.get.ts`, `server/api/redis/browser/value.patch.ts`, `server/api/redis/workbench/execute.post.ts`, `server/api/redis/analysis/overview.get.ts`, `server/infrastructure/nosql/redis/redis-browser.service.ts`, and `server/infrastructure/nosql/redis/redis-analysis.service.ts`
- [x] T028 [US2] Wire Redis-specific panels, tab types, and route dispatch in `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`, `core/composables/useTabManagement.ts`, `core/stores/useTabViewsStore.ts`, and `pages/[workspaceId]/[connectionId]/redis/[tabViewId].vue`
- [x] T029 [US2] Add Redis read-only safeguards, destructive confirmations, and ACL-based unavailable states in `components/modules/redis-workspace/components/RedisValueEditor.vue`, `components/modules/redis-workspace/components/RedisBulkActionsDialog.vue`, and `components/modules/redis-workspace/components/RedisAnalysisPanel.vue`

**Checkpoint**: Redis users can browse keys, inspect/edit type-aware values, run commands, and access an operational tool from a dedicated Redis workspace with SQL-only features hidden.

---

## Phase 5: User Story 3 - Explore MongoDB Documents and Shape (Priority: P3)

**Goal**: Users get a MongoDB Compass-style workflow for document browsing, filtering, schema analysis, and aggregation pipelines in a dedicated MongoDB workspace.

**Independent Test**: Connect to a MongoDB deployment, open a collection, filter documents, inspect schema analysis, and run a saved aggregation pipeline without touching SQL-only routes.

### Tests for User Story 3

- [ ] T030 [P] [US3] Add Mongo workspace state and schema unit coverage in `test/nuxt/components/modules/mongodb-workspace/useMongoWorkspace.test.ts` and `test/nuxt/components/modules/management/mongodb-schema/ManagementMongoSchema.test.ts`
- [ ] T031 [P] [US3] Add Mongo server API unit coverage in `test/unit/server/api/mongodb/documents.spec.ts`, `test/unit/server/api/mongodb/schema.spec.ts`, `test/unit/server/api/mongodb/aggregations.spec.ts`, and `test/unit/server/api/mongodb/indexes.spec.ts`
- [ ] T032 [P] [US3] Add Playwright MongoDB workflow coverage against the Podman MongoDB fixture in `test/playwright/mongodb-workspace.spec.ts` and `test/playwright/pages/MongoWorkspacePage.ts`

### Implementation for User Story 3

- [ ] T033 [P] [US3] Create the MongoDB workspace session store and composables in `core/stores/useMongoWorkspaceStore.ts` and `components/modules/mongodb-workspace/hooks/useMongoWorkspace.ts`
- [ ] T034 [P] [US3] Create MongoDB explorer, schema, and tools sidebar surfaces in `components/modules/management/mongodb-explorer/ManagementMongoExplorer.vue`, `components/modules/management/mongodb-schema/ManagementMongoSchema.vue`, and `components/modules/management/mongodb-tools/ManagementMongoTools.vue`
- [ ] T035 [P] [US3] Create MongoDB document, JSON, and aggregation workspace surfaces in `components/modules/mongodb-workspace/MongoWorkspace.vue`, `components/modules/mongodb-workspace/components/MongoDocumentGrid.vue`, `components/modules/mongodb-workspace/components/MongoJsonView.vue`, and `components/modules/mongodb-workspace/components/MongoAggregationBuilder.vue`
- [ ] T036 [P] [US3] Implement MongoDB documents, schema, aggregation, and index server routes in `server/api/mongodb/documents/index.post.ts`, `server/api/mongodb/schema/collection.get.ts`, `server/api/mongodb/aggregations/run.post.ts`, `server/api/mongodb/indexes/list.get.ts`, `server/infrastructure/nosql/mongodb/mongodb-documents.service.ts`, `server/infrastructure/nosql/mongodb/mongodb-schema.service.ts`, and `server/infrastructure/nosql/mongodb/mongodb-aggregation.service.ts`
- [ ] T037 [US3] Wire MongoDB-specific panels, tab types, and route dispatch in `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`, `core/composables/useTabManagement.ts`, `core/stores/useTabViewsStore.ts`, and `pages/[workspaceId]/[connectionId]/mongodb/[tabViewId].vue`
- [ ] T038 [US3] Add MongoDB read-only safeguards, sampling limits, and permission-driven unavailable states in `components/modules/mongodb-workspace/components/MongoAggregationBuilder.vue`, `components/modules/management/mongodb-schema/ManagementMongoSchema.vue`, and `components/modules/mongodb-workspace/MongoWorkspace.vue`

**Checkpoint**: MongoDB user-story deliverables are still pending in this branch.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize docs, regression coverage, and validation workflows across all connection families.

- [x] T039 [P] Update capability and architecture documentation in `docs/ARCHITECTURE.md`, `docs/BUSINESS_RULES.md`, `docs/COMPONENTS_OVERVIEW.md`, and `README.md`
- [x] T040 [P] Expand cross-family regression coverage for persisted invalid state and family switching in `test/nuxt/components/modules/app-shell/activity-bar/useActivityMenu.test.ts`, `test/playwright/workspace.spec.ts`, and `test/playwright/connection.spec.ts`
- [x] T041 [P] Add focused family-scoped validation entry points in `package.json` and `playwright.config.ts` for live suites that reuse the NoSQL fixture services
- [x] T042 Run the focused validation flows documented in `specs/033-expand-db-support/quickstart.md` and close any remaining gaps in the touched files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all story work.
- **Phase 3 (US1)**: Depends on Phase 2 and is the MVP slice.
- **Phase 4 (US2)**: Depends on Phase 2; safest to sequence after US1 because it reuses the same shell and connection bootstrap surfaces.
- **Phase 5 (US3)**: Depends on Phase 2; safest to sequence after US1 for the same reason.
- **Phase 6 (Polish)**: Depends on the desired story phases being complete.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after the foundational phase.
- **US2 (P2)**: Can start after the foundational phase, but shares shell dispatch and route state with US1.
- **US3 (P3)**: Can start after the foundational phase, but shares shell dispatch and route state with US1.

### Within Each User Story

- Automated tests should be written before the corresponding implementation tasks and should fail before behavior changes land.
- Session/store scaffolding comes before view-level UI wiring.
- Server routes and runtime services come before the final tab and route integration steps.
- Read-only and permission handling closes each story after the happy path is working.

### Parallel Opportunities

- **Setup**: T002 and T003 can run in parallel.
- **Foundational**: T006 and T010 can run in parallel after T004-T005 settle the shared type and persistence shape.
- **US1**: T011-T014 can run in parallel; T016-T018 can run in parallel once T015 settles the connection model.
- **US2**: T021-T023 can run in parallel; T024-T027 can run in parallel once the Redis session shape is agreed.
- **US3**: T030-T032 can run in parallel; T033-T036 can run in parallel once the MongoDB session shape is agreed.
- **Polish**: T039-T041 can run in parallel before the final validation task T042.

---

## Parallel Example: User Story 1

```bash
# Build provider transports and NoSQL bootstrap paths in parallel after T015:
Task: "Implement Cloudflare D1 managed-SQLite validation and query transport in server/infrastructure/driver/managed-sqlite/d1.adapter.ts, server/infrastructure/driver/managed-sqlite/index.ts, and server/infrastructure/driver/sqlite.adapter.ts"
Task: "Implement Turso managed-SQLite validation and branch-aware query transport in server/infrastructure/driver/managed-sqlite/turso.adapter.ts, server/infrastructure/driver/managed-sqlite/index.ts, and server/infrastructure/driver/sqlite.adapter.ts"
Task: "Implement Redis and MongoDB connection clients for validation and session bootstrap in server/infrastructure/nosql/redis/redis.client.ts, server/infrastructure/nosql/mongodb/mongodb.client.ts, and server/infrastructure/driver/db-connection.ts"
```

## Parallel Example: User Story 2

```bash
# Build Redis state, UI, and server slices in parallel:
Task: "Create the Redis workspace session store and composables in core/stores/useRedisWorkspaceStore.ts and components/modules/redis-workspace/hooks/useRedisWorkspace.ts"
Task: "Create Redis explorer/sidebar surfaces in components/modules/management/redis-browser/ManagementRedisBrowser.vue, components/modules/management/redis-browser/components/RedisKeyTree.vue, and components/modules/management/redis-browser/components/RedisKeyFilters.vue"
Task: "Implement Redis browser, workbench, and analysis server routes in server/api/redis/browser/index.get.ts, server/api/redis/browser/value.patch.ts, server/api/redis/workbench/execute.post.ts, server/api/redis/analysis/overview.get.ts, server/infrastructure/nosql/redis/redis-browser.service.ts, and server/infrastructure/nosql/redis/redis-analysis.service.ts"
```

## Parallel Example: User Story 3

```bash
# Build MongoDB state, UI, and server slices in parallel:
Task: "Create the MongoDB workspace session store and composables in core/stores/useMongoWorkspaceStore.ts and components/modules/mongodb-workspace/hooks/useMongoWorkspace.ts"
Task: "Create MongoDB explorer, schema, and tools sidebar surfaces in components/modules/management/mongodb-explorer/ManagementMongoExplorer.vue, components/modules/management/mongodb-schema/ManagementMongoSchema.vue, and components/modules/management/mongodb-tools/ManagementMongoTools.vue"
Task: "Implement MongoDB documents, schema, aggregation, and index server routes in server/api/mongodb/documents/index.post.ts, server/api/mongodb/schema/collection.get.ts, server/api/mongodb/aggregations/run.post.ts, server/api/mongodb/indexes/list.get.ts, server/infrastructure/nosql/mongodb/mongodb-documents.service.ts, server/infrastructure/nosql/mongodb/mongodb-schema.service.ts, and server/infrastructure/nosql/mongodb/mongodb-aggregation.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate D1, Turso, Redis, and MongoDB connection creation plus family-aware routing before expanding scope.

### Incremental Delivery

1. Finish Setup + Foundational once.
2. Deliver US1 so every new data source can connect and route correctly.
3. Deliver US2 for Redis-specific browsing, commands, and analysis.
4. Deliver US3 for MongoDB document, schema, and aggregation workflows.
5. Finish with documentation, cross-family regression coverage, and the quickstart validation sweep.

### Parallel Team Strategy

1. One developer or pair completes Phases 1-2.
2. After the foundational checkpoint, separate developers can take US1, US2, and US3 in parallel.
3. Rejoin for Phase 6 regression and release validation.

---

## Notes

- `[P]` tasks touch different files or independent layers and are safe to parallelize.
- The Redis and MongoDB live tests are intentionally modeled around Podman/Docker-compatible fixtures so local validation does not depend on external managed services.
- D1 and Turso remain on env-gated live credentials because they are managed remote providers rather than local containers.
- Each user story is independently testable once its checkpoint is reached.