# Tasks: Expanded Database Type Support

**Feature**: 030-add-multi-db-support  
**Branch**: `030-add-multi-db-support`  
**Generated**: 2026-04-22  
**Input**: Design documents from `/specs/030-add-multi-db-support/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: No dedicated test-first tasks. This feature request is implementation-focused, but regression coverage updates are included in the final phase because the connection flow and adapter stack already have existing automated coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an independent increment after the foundational phase is complete.

---

## Phase 1: Setup

**Purpose**: Install the runtime dependencies required for the new database drivers before changing shared connection or adapter code.

- [x] T001 Update `package.json` to add runtime dependencies for `mysql2` and `oracledb`, keeping the existing `sqlite3` external-driver path and `better-sqlite3` Electron-persistence path unchanged

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Expand the shared connection model, persistence shape, parser, and request contracts that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until T002–T007 are complete.

- [x] T002 Expand the shared connection model in `core/constants/database-client-type.ts`, `core/types/entities/connection.entity.ts`, `components/modules/connection/types/index.ts`, and `core/stores/managementConnectionStore.ts` to add `mariadb`, the `file` connection method, and optional `serviceName` / `filePath` fields
- [x] T003 Persist the expanded connection shape in `electron/persist/schema/connections.ts` and `electron/persist/entities/ConnectionSQLiteStorage.ts`, keeping old saved Postgres/MySQL records backward-compatible
- [x] T004 Update `core/helpers/parser-connection-string.ts` and `components/modules/connection/components/ConnectionsList.vue` so saved connection summaries can handle `mariadb://`, `oracledb://`, and SQLite file-based connections without breaking existing PostgreSQL rendering
- [x] T005 Refactor `components/modules/connection/hooks/useConnectionForm.ts` and `components/modules/connection/components/CreateConnectionModal.vue` to use database-type-driven field sets, connection methods, and payload building instead of Postgres-first defaults
- [x] T006 Update `components/modules/connection/services/connection.service.ts`, `server/api/managment-connection/health-check.ts`, and `server/infrastructure/driver/db-connection.ts` to carry explicit `type`, `method`, `serviceName`, and `filePath` through the health-check contract
- [x] T007 Update `server/infrastructure/database/adapters/shared/create-adapter.ts` and `server/infrastructure/driver/factory.ts` so newly added database types are resolved explicitly and never fall back silently to PostgreSQL behavior

**Checkpoint**: The repo can represent new database types in saved connections, parse and display them safely, and forward explicit connection payloads through the shared runtime contract.

---

## Phase 3: User Story 1 - Connect to MySQL and MariaDB (Priority: P1) 🎯 MVP

**Goal**: Users can create, test, save, reopen, and query MySQL and MariaDB connections, with MariaDB preserved as a distinct product-visible type.

**Independent Test**: Create one MySQL connection and one MariaDB connection, test each one, save both, reopen them, and confirm the app can browse available structures or run a simple query from each saved connection.

### Implementation for User Story 1

- [x] T008 [P] [US1] Update `components/modules/connection/constants/index.ts` and `components/modules/connection/components/DatabaseTypeCard.vue` to make MySQL and MariaDB selectable connection options with distinct labels, icons, and default-port behavior
- [x] T009 [US1] Finalize MySQL/MariaDB-specific form behavior in `components/modules/connection/hooks/useConnectionForm.ts` and `components/modules/connection/components/ConnectionStepType.vue` so both types render the correct placeholders, defaults, validation, and saved metadata
- [x] T010 [P] [US1] Replace the placeholder implementation in `server/infrastructure/driver/mysql.adapter.ts` with a real Knex + `mysql2` adapter that supports health checks, raw queries, streaming, native SQL, and teardown
- [x] T011 [US1] Register MySQL/MariaDB low-level connectivity in `server/infrastructure/driver/factory.ts` and `server/infrastructure/driver/db-connection.ts`, preserving `mariadb` metadata while routing both types through the MySQL runtime adapter
- [x] T012 [P] [US1] Create `server/infrastructure/database/adapters/query/mysql/mysql-query.adapter.ts` and export it from `server/infrastructure/database/adapters/query/index.ts` for raw-query execution
- [x] T013 [P] [US1] Create `server/infrastructure/database/adapters/metadata/mysql/mysql-metadata.adapter.ts` and `server/infrastructure/database/adapters/tables/mysql/mysql-table.adapter.ts` for minimum schema and table browsing
- [x] T014 [US1] Register MySQL/MariaDB support in `server/infrastructure/database/adapters/query/query.factory.ts`, `server/infrastructure/database/adapters/metadata/metadata.factory.ts`, and `server/infrastructure/database/adapters/tables/tables.factory.ts`
- [x] T015 [US1] Update `components/modules/raw-query/hooks/useQueryExecution.ts` and `components/modules/raw-query/hooks/useStreamingQuery.ts` so MySQL and MariaDB raw-query requests always send the explicit database type
- [x] T016 [US1] Normalize unsupported secondary-feature responses for MySQL/MariaDB in `server/infrastructure/database/adapters/database-roles/database-roles.factory.ts`, `server/infrastructure/database/adapters/metrics/metrics.factory.ts`, and `server/infrastructure/database/adapters/instance-insights/instance-insights.factory.ts`

**Checkpoint**: MySQL and MariaDB can be created, tested, reopened, queried, and minimally explored without pretending that unsupported advanced features already work.

---

## Phase 4: User Story 2 - Connect to Oracle Databases (Priority: P2)

**Goal**: Users can create, validate, save, reopen, and use Oracle connections through the same core workflows, with Oracle-specific structured input captured as `serviceName`.

**Independent Test**: Create an Oracle connection with valid details, test it, save it, reopen it, and confirm the app can browse available structures or run a simple query.

### Implementation for User Story 2

- [x] T017 [P] [US2] Update `components/modules/connection/constants/index.ts` to add the Oracle database option, icon, and default-port behavior to the connection picker
- [x] T018 [US2] Extend `components/modules/connection/hooks/useConnectionForm.ts` and `components/modules/connection/components/CreateConnectionModal.vue` to collect `serviceName`, Oracle placeholders, and Oracle-specific validation rules for both string and structured-form entry
- [x] T019 [P] [US2] Create `server/infrastructure/driver/oracle.adapter.ts` with Knex + `oracledb` support for health checks, raw queries, streaming, native SQL, and teardown
- [x] T020 [US2] Register Oracle low-level connectivity in `server/infrastructure/driver/factory.ts` and `server/infrastructure/driver/db-connection.ts`, including `serviceName`-based structured connections and Oracle-specific cache keys
- [x] T021 [P] [US2] Create `server/infrastructure/database/adapters/query/oracle/oracle-query.adapter.ts` and export it from `server/infrastructure/database/adapters/query/index.ts`
- [x] T022 [P] [US2] Create `server/infrastructure/database/adapters/metadata/oracle/oracle-metadata.adapter.ts` and `server/infrastructure/database/adapters/tables/oracle/oracle-table.adapter.ts` for minimum structure browsing
- [x] T023 [US2] Register Oracle support in `server/infrastructure/database/adapters/query/query.factory.ts`, `server/infrastructure/database/adapters/metadata/metadata.factory.ts`, and `server/infrastructure/database/adapters/tables/tables.factory.ts`
- [x] T024 [US2] Normalize Oracle unsupported secondary-feature responses in `server/infrastructure/database/adapters/database-roles/database-roles.factory.ts`, `server/infrastructure/database/adapters/metrics/metrics.factory.ts`, and `server/infrastructure/database/adapters/instance-insights/instance-insights.factory.ts`

**Checkpoint**: Oracle connections can be created, validated, reopened, queried, and minimally browsed while unsupported advanced features continue to fail explicitly.

---

## Phase 5: User Story 3 - Open a Local SQLite File in the Desktop App (Priority: P3)

**Goal**: Desktop users can select a local SQLite database file, save it as a connection, reopen it later, and use the same core query and browsing workflows, while non-desktop runtimes never expose a broken local-file path.

**Independent Test**: In Electron, create a SQLite connection from a local file, test it, save it, reopen it, and confirm the app can browse structures or run a simple query. In the browser build, confirm the SQLite file flow is unavailable.

### Implementation for User Story 3

- [x] T025 [P] [US3] Add the typed desktop picker contract in `types/electron-api.d.ts`, `electron/preload.ts`, and `electron/ipc/window.ts` by exposing `window:pick-sqlite-file` / `pickSqliteFile()` as a narrow Electron-only bridge
- [x] T026 [P] [US3] Update `components/modules/connection/constants/index.ts` and `components/modules/connection/components/DatabaseTypeCard.vue` to present SQLite as a desktop-only option with explicit non-Electron unavailability messaging
- [x] T027 [US3] Extend `components/modules/connection/hooks/useConnectionForm.ts` and `components/modules/connection/components/CreateConnectionModal.vue` to support the `file` method, invoke `pickSqliteFile()`, persist `filePath`, and block the flow outside Electron
- [x] T028 [P] [US3] Create `server/infrastructure/driver/sqlite.adapter.ts` with Knex + `sqlite3` file-backed support for health checks, raw queries, streaming, native SQL, and teardown
- [x] T029 [US3] Register SQLite low-level connectivity in `server/infrastructure/driver/factory.ts` and `server/infrastructure/driver/db-connection.ts`, mapping `filePath` to `connection.filename` and using the absolute file path as the adapter-cache key
- [x] T030 [P] [US3] Create `server/infrastructure/database/adapters/query/sqlite/sqlite-query.adapter.ts` and export it from `server/infrastructure/database/adapters/query/index.ts`
- [x] T031 [P] [US3] Create `server/infrastructure/database/adapters/metadata/sqlite/sqlite-metadata.adapter.ts` and `server/infrastructure/database/adapters/tables/sqlite/sqlite-table.adapter.ts` for minimum structure browsing
- [x] T032 [US3] Register SQLite support in `server/infrastructure/database/adapters/query/query.factory.ts`, `server/infrastructure/database/adapters/metadata/metadata.factory.ts`, and `server/infrastructure/database/adapters/tables/tables.factory.ts`
- [x] T033 [US3] Update `server/infrastructure/driver/sqlite.adapter.ts` and `components/modules/connection/hooks/useConnectionForm.ts` so missing or unreadable SQLite files produce actionable open/test errors without deleting the saved connection record

**Checkpoint**: Electron users can work with saved SQLite files end to end, while browser users never see a broken local-file workflow.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close the remaining gaps across multiple stories, update regression coverage, and document the supported capability matrix.

- [x] T034 [P] Update `server/api/ai/agent.ts`, `components/modules/raw-query/utils/commandType.ts`, and `components/base/code-editor/utils/sqlErrorDiagnostics.ts` so the new database types use the correct dialect and result-format handling instead of Postgres-biased defaults
- [x] T035 [P] Update regression coverage in `test/nuxt/components/modules/connection/hooks/useConnectionForm.test.ts`, `test/e2e/connection.test.ts`, `test/playwright/connection.spec.ts`, and `test/playwright/pages/ConnectionModalPage.ts` for MySQL, MariaDB, Oracle, and Electron-only SQLite flows
- [x] T036 [P] Update `docs/ARCHITECTURE.md` and `docs/BUSINESS_RULES.md` to reflect the new supported-database matrix and the desktop-only SQLite constraint
- [x] T037 [P] Update `README.md` and `docs/API_REFERENCE.md` to document newly supported connection types and clearly note which advanced capabilities remain intentionally unsupported outside PostgreSQL
- [ ] T038 Run the verification scenarios documented in `specs/030-add-multi-db-support/quickstart.md` and fix any remaining implementation gaps in the touched files before release

---

## Phase 7: Remaining Adapter Coverage Backlog

**Purpose**: Convert the source-level `adapter not yet implemented` placeholders still present under `server/infrastructure/database/adapters/` into tracked follow-up work if advanced parity is brought into scope.

- [x] T039 [P] [US1] Create MySQL/MariaDB role, view, and function adapters in `server/infrastructure/database/adapters/database-roles/mysql/mysql-role.adapter.ts`, `server/infrastructure/database/adapters/views/mysql/mysql-view.adapter.ts`, and `server/infrastructure/database/adapters/functions/mysql/mysql-function.adapter.ts`, then register both `mysql` and `mariadb` in the corresponding `index.ts` and `*.factory.ts` files
- [x] T040 [P] [US1] Create MySQL/MariaDB metrics and instance insights adapters in `server/infrastructure/database/adapters/metrics/mysql/mysql-metrics.adapter.ts` and `server/infrastructure/database/adapters/instance-insights/mysql/mysql-instance-insights.adapter.ts`, then register both `mysql` and `mariadb` in `server/infrastructure/database/adapters/metrics/index.ts`, `server/infrastructure/database/adapters/metrics/metrics.factory.ts`, `server/infrastructure/database/adapters/instance-insights/index.ts`, and `server/infrastructure/database/adapters/instance-insights/instance-insights.factory.ts`
- [x] T041 [P] [US2] Create Oracle role, view, and function adapters in `server/infrastructure/database/adapters/database-roles/oracle/oracle-role.adapter.ts`, `server/infrastructure/database/adapters/views/oracle/oracle-view.adapter.ts`, and `server/infrastructure/database/adapters/functions/oracle/oracle-function.adapter.ts`, then register `oracledb` in the corresponding `index.ts` and `*.factory.ts` files
- [x] T042 [P] [US2] Create Oracle metrics and instance insights adapters in `server/infrastructure/database/adapters/metrics/oracle/oracle-metrics.adapter.ts` and `server/infrastructure/database/adapters/instance-insights/oracle/oracle-instance-insights.adapter.ts`, then register `oracledb` in `server/infrastructure/database/adapters/metrics/index.ts`, `server/infrastructure/database/adapters/metrics/metrics.factory.ts`, `server/infrastructure/database/adapters/instance-insights/index.ts`, and `server/infrastructure/database/adapters/instance-insights/instance-insights.factory.ts`
- [x] T043 [P] [US3] Create SQLite role, view, and function adapters in `server/infrastructure/database/adapters/database-roles/sqlite/sqlite-role.adapter.ts`, `server/infrastructure/database/adapters/views/sqlite/sqlite-view.adapter.ts`, and `server/infrastructure/database/adapters/functions/sqlite/sqlite-function.adapter.ts`, then register `sqlite3` in the corresponding `index.ts` and `*.factory.ts` files
- [x] T044 [P] [US3] Create SQLite metrics and instance insights adapters in `server/infrastructure/database/adapters/metrics/sqlite/sqlite-metrics.adapter.ts` and `server/infrastructure/database/adapters/instance-insights/sqlite/sqlite-instance-insights.adapter.ts`, then register `sqlite3` in `server/infrastructure/database/adapters/metrics/index.ts`, `server/infrastructure/database/adapters/metrics/metrics.factory.ts`, `server/infrastructure/database/adapters/instance-insights/index.ts`, and `server/infrastructure/database/adapters/instance-insights/instance-insights.factory.ts`
- [x] T045 Update `server/infrastructure/database/adapters/shared/create-adapter.ts` so the generic `adapter not yet implemented` fallback only covers truly unsupported domains after T039-T044 land

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2 and is the MVP increment
- **Phase 4 (US2)**: Depends on Phase 2; safest to sequence after US1 because the Oracle form work touches the same connection-module files
- **Phase 5 (US3)**: Depends on Phase 2; safest to sequence after US1 for the same reason, while Electron-only tasks can proceed in parallel once the foundational contract is done
- **Phase 6 (Polish)**: Depends on the desired story phases being complete
- **Phase 7 (Remaining Adapter Coverage Backlog)**: Depends on the relevant story phases and can be deferred until advanced adapter parity is intentionally pulled into scope

### User Story Dependencies

- **US1 (P1)**: Can start immediately after the foundational phase
- **US2 (P2)**: Can start after the foundational phase, but shares the connection form and picker surfaces with US1
- **US3 (P3)**: Can start after the foundational phase, but shares the connection form and picker surfaces with US1 while also adding Electron-only work

### Parallel Opportunities

- **Foundational**: T003 and T004 can proceed in parallel after T002; T006 and T007 can proceed in parallel after T005
- **US1**: T010, T012, and T013 touch different backend files and can run in parallel after T008–T009 settle the product-facing type behavior
- **US2**: T019, T021, and T022 can run in parallel after T017–T018 settle the Oracle form contract
- **US3**: T025, T026, and T028 can run in parallel after the foundational phase; T030 and T031 can run in parallel after T029
- **Polish**: T034–T037 are independent and can run in parallel before the final quickstart validation in T038
- **Remaining Adapter Coverage Backlog**: T039 and T040 can run in parallel for US1, T041 and T042 can run in parallel for US2, and T043 and T044 can run in parallel for US3 before the shared-helper cleanup in T045

---

## Parallel Example: User Story 1

```bash
# After T008-T009 establish the MySQL/MariaDB UI and form contract:
Task: "Replace the placeholder implementation in server/infrastructure/driver/mysql.adapter.ts with a real Knex + mysql2 adapter"
Task: "Create server/infrastructure/database/adapters/query/mysql/mysql-query.adapter.ts and export it from server/infrastructure/database/adapters/query/index.ts"
Task: "Create server/infrastructure/database/adapters/metadata/mysql/mysql-metadata.adapter.ts and server/infrastructure/database/adapters/tables/mysql/mysql-table.adapter.ts for minimum schema and table browsing"
```

## Parallel Example: User Story 2

```bash
# After T017-T018 establish the Oracle form contract:
Task: "Create server/infrastructure/driver/oracle.adapter.ts with Knex + oracledb support"
Task: "Create server/infrastructure/database/adapters/query/oracle/oracle-query.adapter.ts and export it from server/infrastructure/database/adapters/query/index.ts"
Task: "Create server/infrastructure/database/adapters/metadata/oracle/oracle-metadata.adapter.ts and server/infrastructure/database/adapters/tables/oracle/oracle-table.adapter.ts for minimum structure browsing"
```

## Parallel Example: User Story 3

```bash
# After Phase 2 is complete:
Task: "Add the typed desktop picker contract in types/electron-api.d.ts, electron/preload.ts, and electron/ipc/window.ts"
Task: "Update components/modules/connection/constants/index.ts and components/modules/connection/components/DatabaseTypeCard.vue to present SQLite as a desktop-only option"
Task: "Create server/infrastructure/driver/sqlite.adapter.ts with Knex + sqlite3 file-backed support"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the MySQL/MariaDB workflow independently using the story checkpoint
5. Stop for review before expanding to Oracle or desktop SQLite

### Incremental Delivery

1. Ship MySQL/MariaDB first as the MVP
2. Add Oracle once the shared connection flow and raw-query type propagation are stable
3. Add desktop SQLite after the Electron picker bridge and file-backed adapter path are ready
4. Finish with regression coverage, docs, and quickstart validation
5. Pull in Phase 7 only when the release scope expands from core workflows to advanced adapter parity for roles, views, functions, metrics, and instance insights

### Suggested Story Order

1. **US1**: Highest user value and smallest extension from the current partial MySQL scaffolding
2. **US2**: Reuses the same shared connection flow with Oracle-specific structured input
3. **US3**: Adds the Electron-only picker and file-backed runtime path after the shared flow is stable

---

## Phase 8: Multi-DB Bug Fixes — Quick Query & Raw Query (Post-Verification)

**Purpose**: Fix P1 crashes and Postgres-centric hardcoding discovered during T038 verification. Tasks cover Quick Query table browsing/filtering, raw query result format, CodeMirror dialect loading, error normalization, and a SQLite mutation message bug.

**⚠️ P1 blockers (T046–T048)**: Quick Query table browsing and filter apply are broken for MySQL/MariaDB/Oracle/SQLite because the query builder, operator list, and WHERE clause generator all assume PostgreSQL. Fix these before anything else in this phase.

### P1: Quick Query SQL & Filter Fixes

- [x] T046 Fix `core/composables/useTableQueryBuilder.ts` so `baseQueryString` uses DB-appropriate identifier quoting for `schemaName` and `tableName`, `whereClauses` passes `connection.value?.type` instead of the hardcoded `DatabaseClientType.POSTGRES` to `formatWhereClause`, and `queryString` wraps `orderColumn` with the same DB-aware quoting instead of always using PostgreSQL double-quotes
- [x] T047 [P] Add `operatorSets` entries for `DatabaseClientType.MARIADB`, `DatabaseClientType.SQLITE3`, and `DatabaseClientType.ORACLEDB` in `core/constants/operatorSets.ts`; add a null-safe `operators` computed guard in `components/modules/selectors/OperatorSelector.vue` so an unknown `dbType` falls back gracefully instead of rendering nothing; and guard the `operatorSets[db]?.map()` call in `components/modules/quick-query/utils/buildWhereClause.ts` so a missing entry does not throw at runtime
- [x] T048 [P] Fix `components/modules/quick-query/utils/buildWhereClause.ts` so `wrap()` uses double-quote quoting for `ORACLEDB` (instead of backticks) while keeping backtick quoting for MySQL/MariaDB/SQLite, and fix `likeHandler()` to avoid the `::TEXT` PostgreSQL cast for all non-Postgres dialects — use plain column reference for MySQL/MariaDB/SQLite and an explicit `TO_CHAR(col)` or direct column reference for Oracle

### P2: Raw Query SQLite3 Result Format

- [x] T049 [US3] Investigate and fix the SQLite3 raw query result format issue: ensure `fields` is populated for empty SELECT result sets in `server/infrastructure/database/adapters/query/sqlite/sqlite-query.adapter.ts` and `server/infrastructure/driver/sqlite.adapter.ts`; verify BLOB columns (Node.js `Buffer`) are serialized to a safe JSON representation before the NDJSON response is written; and confirm the non-streaming `/api/query/raw-execute` path returns a `fields` array that the client-side dynamic table can use to render column headers even when rows are empty

### P3: Dialect, Error Normalization & Result Message Fixes

- [x] T050 [P] Extend `components/base/code-editor/constants/index.ts` to import `SQLite` and `PLSQL` from `@codemirror/lang-sql` and add them to `SQLDialectSupport` (use `SQLite` for `sqlite3`, `PLSQL` for `oracledb`); then add the missing `MARIADB → MariaSQL`, `SQLITE3 → SQLite`, and `ORACLEDB → PLSQL` entries to `SQL_DIALECT_BY_DB_TYPE` in `components/base/code-editor/states/sqlParserConfig.ts` — refer to `@codemirror/lang-sql` exported dialect list (`PostgreSQL`, `MySQL`, `MariaSQL`, `SQLite`, `PLSQL`, `MSSQL`, `StandardSQL`) when deciding per-DB mapping
- [x] T051 [P] Add `DatabaseClientType.MARIADB` and `DatabaseClientType.ORACLEDB` normalization cases to the `switch` in `core/helpers/database-error.ts`: reuse the existing `normalizeMysqlError` logic for MariaDB and write a minimal `normalizeOracleError` that maps `error.errorNum` / `error.message` to the `NormalizationError` shape so Oracle query errors show accurate hints in editor diagnostics
- [x] T052 [P] Fix `components/modules/raw-query/utils/commandType.ts` `Sqlite3CommandResultHandler.getMessage()`: the `rowCount` field contains `result.changes` (rows affected), not the last-inserted row ID — change the `INSERT` branch message from `INSERT successful. Last insert row id: ${this.rowCount}` to `INSERT successful. ${this.rowCount} row(s) affected.`
- [x] T053 Update `components/modules/raw-query/hooks/useSqlEditorExtensions.ts` to accept an optional `connection: Ref<Connection | undefined>` parameter and use `resolveDialect(connection?.value?.type)` (from `components/base/code-editor/states/sqlParserConfig.ts`) in place of the hardcoded `SQLDialectSupport['PostgreSQL']` inside both the initial `sqlCompartment.of(sql({...}))` setup and the `reloadSqlCompartment()` reconfigure dispatch; also pass `connection` from `components/modules/raw-query/hooks/useRawQueryEditor.ts` when calling `useSqlEditorExtensions`; add a `watch` on `connection.value?.type` to trigger `reloadSqlCompartment()` automatically when the active connection's DB type changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2 and is the MVP increment
- **Phase 4 (US2)**: Depends on Phase 2; safest to sequence after US1 because the Oracle form work touches the same connection-module files
- **Phase 5 (US3)**: Depends on Phase 2; safest to sequence after US1 for the same reason, while Electron-only tasks can proceed in parallel once the foundational contract is done
- **Phase 6 (Polish)**: Depends on the desired story phases being complete
- **Phase 7 (Remaining Adapter Coverage Backlog)**: Depends on the relevant story phases and can be deferred until advanced adapter parity is intentionally pulled into scope
- **Phase 8 (Bug Fixes)**: Depends on Phase 3–5 being complete; T046–T048 are P1 blockers for Quick Query; T050 must complete before T053

### User Story Dependencies

- **US1 (P1)**: Can start immediately after the foundational phase
- **US2 (P2)**: Can start after the foundational phase, but shares the connection form and picker surfaces with US1
- **US3 (P3)**: Can start after the foundational phase, but shares the connection form and picker surfaces with US1 while also adding Electron-only work

### Parallel Opportunities (Phase 8)

- T046, T047, T048 are all safe to start in parallel — they touch different files (composable, constants, utility)
- T050 and T051 are independent of each other and of T046–T048
- T052 is independent of all other Phase 8 tasks
- T053 depends on T050 (needs the updated `SQL_DIALECT_BY_DB_TYPE` map and `SQLDialectSupport` entries before `resolveDialect` returns correct values for new DB types)
- T049 is independent of all other Phase 8 tasks

---

## Notes

- Tasks marked **[P]** touch different files or independent layers and are safe to parallelize
- User stories are grouped independently, but the connection picker and form are shared surfaces, so single-threaded execution should still follow priority order
- The first release is intentionally capability-based: core connection, query, and minimum browsing are in scope; advanced Postgres-only admin features remain explicitly unsupported until dedicated adapters exist
- Phase 7 was added from a live source audit of `adapter not yet implemented` placeholders under `server/infrastructure/database/adapters/` so the remaining gaps stay visible as explicit follow-up work
- Phase 8 was added from T038 verification findings: Quick Query and Raw Query had Postgres-centric hardcoding and missing operator/dialect/error-normalization coverage for the four newly supported database types
