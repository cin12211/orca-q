# Tasks: Query Workbench Reliability

**Input**: Design documents from `/specs/031-enhance-query-workbench/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Focused validation is required by the feature quickstart; automated test updates are embedded in implementation tasks where the touched slice already has coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3])
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the shared constants and type surfaces the feature relies on.

- [x] T001 [P] Create shared metadata type-alias constants in server/infrastructure/database/adapters/metadata/type-alias.constants.ts
- [x] T002 [P] Add shared null-order option definitions in components/modules/settings/types/settings.types.ts and components/modules/settings/constants/settings.constants.ts
- [x] T003 Extend shared schema and tab entities for alias and tab-action support in core/types/database-schemas.types.ts, core/types/database-tables.types.ts, and core/types/entities/tab-view.entity.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared store, persistence, and adapter plumbing used by the story work.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T004 Wire shared metadata alias helpers through server/infrastructure/database/adapters/metadata/index.ts and server/infrastructure/database/adapters/metadata/types.ts
- [x] T005 [P] Extend shared workspace tab and file helpers in core/composables/useTabManagement.ts, core/stores/useTabViewsStore.ts, and core/stores/useExplorerFileStore.ts
- [x] T006 [P] Extend schema-load session state and app-config defaults in core/stores/useSchemaStore.ts and core/stores/appConfigStore.ts

**Checkpoint**: Shared query-workbench primitives are ready for user-story implementation.

---

## Phase 3: User Story 1 - Run and Update Queries Reliably (Priority: P1) 🎯 MVP

**Goal**: Make raw-query execution ignore comment-only placeholders and let quick-query routine updates preview and save the exact SQL safely.

**Independent Test**: Edit a function through quick query, preview the generated update, confirm the save, and run a raw SQL statement that contains `:varname` inside a comment without falling back to another editor.

### Implementation for User Story 1

- [x] T007 [P] [US1] Make raw-query placeholder parsing comment-aware in server/infrastructure/agent/core/sql.ts, components/modules/raw-query/hooks/useQueryExecution.ts, and test/nuxt/components/modules/raw-query/useQueryExecution.test.ts
- [x] T008 [P] [US1] Rework routine update SQL generation for preview/save in components/modules/management/schemas/utils/generateFunctionSQL.ts, server/api/functions/update.post.ts, and test/nuxt/components/modules/management/schemas/utils/sqlUtils.test.ts
- [x] T009 [US1] Add preview and confirm-before-save workflow to the quick-query routine editor in components/modules/quick-query/FunctionDetail.vue and components/modules/quick-query/function-control-bar/FunctionControlBar.vue
- [x] T010 [US1] Surface no-change, preview, and save-error states in components/modules/quick-query/FunctionDetail.vue and components/modules/quick-query/QuickQueryErrorPopup.vue

**Checkpoint**: Quick-query routine edits and raw-query commented placeholders behave consistently and can be verified independently.

---

## Phase 4: User Story 2 - Open the Right Workspace Tab Faster (Priority: P2)

**Goal**: Add fast tab-entry actions for starter SQL files and common workspace views.

**Independent Test**: From a workspace with no starter SQL file open, use the first-tab SQL shortcut and the plus-tab menu to open `sample.sql`, create `new-file(-n)` tabs, and open schema browser and instance insights.

### Implementation for User Story 2

- [x] T011 [P] [US2] Add first-tab SQL shortcut handlers in components/modules/app-shell/tab-view-container/components/TabViewContainer.vue and core/composables/useTabManagement.ts
- [x] T012 [P] [US2] Implement sample.sql reuse and collision-free new-file naming in core/stores/useExplorerFileStore.ts and core/stores/useTabViewsStore.ts
- [x] T013 [US2] Add the plus-tab action menu UI in components/modules/app-shell/tab-view-container/components/TabViewContainer.vue and core/composables/useTabManagement.ts
- [x] T014 [US2] Persist schema-browser and instance-insights tab opening behavior in core/types/entities/tab-view.entity.ts, core/stores/useTabViewsStore.ts, and core/composables/useTabManagement.ts

**Checkpoint**: Users can open SQL files and major workspace views directly from the tab header without disrupting existing tab content.

---

## Phase 5: User Story 3 - Understand Metadata and Large Schemas Faster (Priority: P3)

**Goal**: Normalize type labels across databases, keep schema loading visibly active for long-running loads, and persist null-order preferences through settings and quick query.

**Independent Test**: Compare short type labels across supported database families, open schema browsing on a large multi-schema connection until a waiting message appears and resolves, then set and observe a persisted null-order default from settings and quick query.

### Implementation for User Story 3

- [x] T015 [P] [US3] Apply shared short_type_name alias rules in server/infrastructure/database/adapters/metadata/postgres/postgres-metadata.adapter.ts, server/infrastructure/database/adapters/metadata/mysql/mysql-metadata.adapter.ts, server/infrastructure/database/adapters/metadata/sqlite/sqlite-metadata.adapter.ts, and server/infrastructure/database/adapters/metadata/oracle/oracle-metadata.adapter.ts
- [x] T016 [US3] Remove PostgreSQL inline alias CASE logic in server/infrastructure/database/adapters/metadata/postgres/constants/schema-metadata.query.ts and update test/unit/server/infrastructure/database/adapters/metadata/postgres/constants/schema-metadata.query.test.ts
- [x] T017 [US3] Propagate normalized short types to agent and query consumers in server/infrastructure/agent/schema/schema.ts, core/types/database-schemas.types.ts, core/types/database-tables.types.ts, and test/unit/server/infrastructure/agent/schema/schema.spec.ts
- [x] T018 [P] [US3] Upgrade schema-load session messaging in core/stores/useSchemaStore.ts, components/modules/management/schemas/ManagementSchemas.vue, and components/modules/management/schemas/hooks/useSchemaContextMenu.ts
- [x] T019 [P] [US3] Persist global null-order defaults in components/modules/settings/types/settings.types.ts, components/modules/settings/constants/settings.constants.ts, core/stores/appConfigStore.ts, and components/modules/settings/components/TableAppearanceConfig.vue
- [x] T020 [US3] Expose and apply null-order controls in components/modules/settings/components/QuickQueryConfig.vue, components/modules/quick-query/quick-query-control-bar/QuickQueryControlBar.vue, components/modules/quick-query/QuickQuery.vue, components/modules/quick-query/quick-query-table/QuickQueryTable.vue, and components/modules/quick-query/quick-query-table/CustomHeaderTable.vue

**Checkpoint**: Metadata labels, schema loading feedback, and null-order defaults are consistent and independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the integrated feature set and close out cross-story checks.

- [x] T021 [P] Run focused automated validation in test/nuxt/components/modules/raw-query/useQueryExecution.test.ts, test/nuxt/components/modules/management/schemas/utils/sqlUtils.test.ts, test/nuxt/components/modules/management/schemas/hooks/context-menu/useSchemaContextMenu.test.ts, test/unit/server/infrastructure/database/adapters/metadata/postgres/constants/schema-metadata.query.test.ts, and test/unit/server/infrastructure/agent/schema/schema.spec.ts
- [ ] T022 Run manual quickstart validation in specs/031-enhance-query-workbench/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks story work until shared store and adapter plumbing is ready.
- **User Story 1 (Phase 3)**: Starts after Foundational completion; recommended MVP slice.
- **User Story 2 (Phase 4)**: Starts after Foundational completion.
- **User Story 3 (Phase 5)**: Starts after Foundational completion.
- **Polish (Phase 6)**: Starts after the desired user stories are complete.

### User Story Dependencies

- **US1**: No dependency on other user stories after Phase 2.
- **US2**: No dependency on other user stories after Phase 2.
- **US3**: No dependency on other user stories after Phase 2.

### Within Each User Story

- Shared utilities and generators before UI wiring.
- Store or persistence changes before view-level controls.
- Preview or control flows before final validation.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T005 and T006 can run in parallel after T001-T004.
- T007 and T008 can run in parallel inside US1.
- T011 and T012 can run in parallel inside US2.
- T015, T018, and T019 can run in parallel inside US3.
- T021 can begin once all implementation tasks affecting its validation targets are complete.

---

## Parallel Example: User Story 1

```bash
# Build the two core reliability slices in parallel:
Task: "Make raw-query placeholder parsing comment-aware in server/infrastructure/agent/core/sql.ts, components/modules/raw-query/hooks/useQueryExecution.ts, and test/nuxt/components/modules/raw-query/useQueryExecution.test.ts"
Task: "Rework routine update SQL generation for preview/save in components/modules/management/schemas/utils/generateFunctionSQL.ts, server/api/functions/update.post.ts, and test/nuxt/components/modules/management/schemas/utils/sqlUtils.test.ts"
```

## Parallel Example: User Story 2

```bash
# Build workspace tab actions and file naming in parallel:
Task: "Add first-tab SQL shortcut handlers in components/modules/app-shell/tab-view-container/components/TabViewContainer.vue and core/composables/useTabManagement.ts"
Task: "Implement sample.sql reuse and collision-free new-file naming in core/stores/useExplorerFileStore.ts and core/stores/useTabViewsStore.ts"
```

## Parallel Example: User Story 3

```bash
# Build metadata consistency and UI-state improvements in parallel:
Task: "Apply shared short_type_name alias rules in server/infrastructure/database/adapters/metadata/postgres/postgres-metadata.adapter.ts, server/infrastructure/database/adapters/metadata/mysql/mysql-metadata.adapter.ts, server/infrastructure/database/adapters/metadata/sqlite/sqlite-metadata.adapter.ts, and server/infrastructure/database/adapters/metadata/oracle/oracle-metadata.adapter.ts"
Task: "Upgrade schema-load session messaging in core/stores/useSchemaStore.ts, components/modules/management/schemas/ManagementSchemas.vue, and components/modules/management/schemas/hooks/useSchemaContextMenu.ts"
Task: "Persist global null-order defaults in components/modules/settings/types/settings.types.ts, components/modules/settings/constants/settings.constants.ts, core/stores/appConfigStore.ts, and components/modules/settings/components/TableAppearanceConfig.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the raw-query placeholder fix and quick-query preview/save flow before expanding scope.

### Incremental Delivery

1. Finish Setup + Foundational once.
2. Deliver US1 for the core reliability fix.
3. Deliver US2 for workspace tab acceleration.
4. Deliver US3 for metadata consistency, schema loading feedback, and null-order defaults.
5. Run automated and manual validation from Phase 6.

### Parallel Team Strategy

1. One developer completes Phase 1 and Phase 2.
2. After the checkpoint, separate developers can take US1, US2, and US3 in parallel.
3. Rejoin for Phase 6 validation and cleanup.

---

## Notes

- `[P]` tasks touch different files or independent surfaces and can be worked in parallel.
- Each story remains independently testable once its phase checkpoint is reached.
- Task IDs are sequential and map directly to concrete files from the current codebase.
