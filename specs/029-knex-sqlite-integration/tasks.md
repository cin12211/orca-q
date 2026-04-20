# Tasks: Knex SQLite Integration — Replace Raw better-sqlite3 API with Knex Query Builder

**Feature**: 029-knex-sqlite-integration  
**Branch**: `029-knex-sqlite-integration`  
**Generated**: 2026-04-20  
**Input**: Replace raw `better-sqlite3` API calls (`db.prepare()`, `db.exec()`, `db.pragma()`) in the Electron persist layer with [Knex.js](https://knexjs.org) using the `better-sqlite3` client. The SQLite schema, Row types (`electron/persist/schema.ts`), entity interfaces (`core/types/entities/`), and every `fromRow`/`toRow` contract stay unchanged.

**Tests**: No dedicated test-first tasks — request is implementation-focused.

---

## Phase 1: Setup

**Purpose**: Confirm both packages are installed and tsconfig covers Knex types.

- [ ] T001 Verify `knex` and `better-sqlite3` entries in `package.json` devDependencies (both already present); confirm `electron/tsconfig.json` resolves `knex` types — add `"knex"` to `compilerOptions.types` if it is missing

---

## Phase 2: Foundational

**Purpose**: Create the Knex singleton and rewrite the migration infrastructure. Every entity storage file and `store.ts` depend on this.

**⚠️ CRITICAL**: No user story work should begin until T002–T004 are complete.

- [ ] T002 Create `electron/persist/knex-db.ts` — export `getKnex(): Knex`. Use `{ client: 'better-sqlite3', connection: { filename: dbPath }, useNullAsDefault: true }`. Mirror the dev/prod path logic from `electron/persist/db.ts` (`.sqlite3/orcaq.db` in dev, `app.getPath('userData')/orcaq.db` in prod). Apply `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON` via `knex.raw()` immediately after the singleton is created.

- [ ] T003 Rewrite `electron/persist/migration/versions/v001-initial-schema.ts` — change the function signature from `(db: Database.Database): void` to `(knex: Knex): Promise<void>`. Rebuild all 10 `CREATE TABLE` blocks using `knex.schema.createTableIfNotExists()`. Rebuild the `idx_connections_workspace`, `idx_tab_views_ctx`, `idx_qlogs_conn`, and `idx_rqf_workspace` indexes using `knex.schema.raw()`. Remove the `better-sqlite3` import. Column names and nullability must exactly match the existing DDL:

  | Table | Key columns |
  |---|---|
  | `workspaces` | id PK, icon NN, name NN, desc, last_opened, created_at NN, updated_at |
  | `connections` | id PK, workspace_id → workspaces(id), name/type/method NN, connection_string…tag_ids nullable, created_at NN, updated_at |
  | `workspace_states` | id PK, connection_id, connection_states, opened_at, updated_at |
  | `tab_views` | id PK, workspace_id → workspaces(id), connection_id/schema_id NN, tab_index INT NN, name/icon/type/route_name NN, icon_class/route_params/metadata nullable |
  | `quick_query_logs` | id PK, connection_id/workspace_id/schema_name/table_name/logs NN, query_time REAL NN, error/error_message nullable, created_at NN, updated_at |
  | `row_query_files` | id PK, workspace_id → workspaces(id), parent_id nullable, title NN, type, created_at NN, updated_at |
  | `row_query_file_contents` | id PK → row_query_files(id) ON DELETE CASCADE, contents NN DEFAULT '' |
  | `environment_tags` | id PK, name/color NN, strict_mode INT NN DEFAULT 0, is_system INT NN DEFAULT 0, created_at NN, updated_at |
  | `app_config` | id PK, data TEXT NN |
  | `agent_state` | id PK, data TEXT NN |
  | `migration_state` | id PK, data TEXT NN |

- [ ] T004 Rewrite `electron/persist/migration/runner.ts` — change signature from `runMigrations(db: Database.Database): void` to `runMigrations(knex: Knex): Promise<void>`. Replace:
  - `db.exec(CREATE TABLE _schema_versions …)` → `knex.schema.createTableIfNotExists('_schema_versions', …)`
  - `db.prepare(SELECT version …).get()` → `knex('_schema_versions').where({ table_name: 'app' }).first()`
  - `db.transaction(() => { migration.up(db); db.prepare(INSERT …).run(…) })` → `knex.transaction(async trx => { await migration.up(trx); await trx('_schema_versions').insert(…).onConflict('table_name').merge() })`
  - Remove the `better-sqlite3` import

**Checkpoint**: `getKnex()` singleton exists, migrations build schema via Knex, no entity file has changed yet.

---

## Phase 3: User Story 1 — SQLite3Storage Base Class Uses Knex (Priority: P1) 🎯 MVP

**Goal**: `SQLite3Storage<T>` uses the Knex query builder for all CRUD operations. The `BaseStorage<T>` interface (`getOne`, `getMany`, `create`, `update`, `delete`, `upsert`) is unchanged. All 10 entity storage classes (`fromRow` / `toRow`) require zero modification.

**Independent Test**: Start the Electron app in dev mode. Open a workspace, switch connections, and open a Quick Query table. Confirm rows load correctly, edits persist across restarts, and no raw SQL errors appear in the main-process stdout.

### Implementation for User Story 1

- [ ] T005 [US1] Rewrite `electron/persist/SQLite3Storage.ts` — change constructor parameter from `db: Database.Database` to `db: Knex`. Re-implement each method:

  | Method | Knex equivalent |
  |---|---|
  | `getOne(id)` | `this.db(this.tableName).where({ id }).first()` → coerce `undefined` to `null` |
  | `getMany(filters?)` | `this.db(this.tableName)` + `.where(snakeFilters)` + `.orderByRaw(orderClause)` |
  | `upsert(entity)` | `this.db(this.tableName).insert(sanitized).onConflict('id').merge()` |
  | `delete(id)` | read existing with `getOne`, then `this.db(this.tableName).where({ id }).del()` |
  | `create` / `update` | keep current logic (call `applyTimestamps` then `upsert`) |

  Keep `addDefaultOrder`, `applyTimestamps`, `camelToSnake` helpers unchanged. Remove the `import type Database from 'better-sqlite3'` line.

- [ ] T006 [P] [US1] Update all 10 entity files in `electron/persist/entities/` — replace `import { getDB } from '../db'` with `import { getKnex } from '../knex-db'` and change the singleton instantiation argument from `getDB()` to `getKnex()`:
  - `WorkspaceSQLiteStorage.ts`
  - `ConnectionSQLiteStorage.ts`
  - `WorkspaceStateSQLiteStorage.ts`
  - `TabViewSQLiteStorage.ts`
  - `QuickQueryLogSQLiteStorage.ts`
  - `RowQueryFileSQLiteStorage.ts`
  - `EnvironmentTagSQLiteStorage.ts`
  - `AppConfigSQLiteStorage.ts`
  - `AgentStateSQLiteStorage.ts`
  - `MigrationStateSQLiteStorage.ts`

**Checkpoint**: All 10 entity classes compile and route through Knex. `fromRow`/`toRow` untouched.

---

## Phase 4: User Story 2 — Store and Boot Path Use Knex (Priority: P1)

**Goal**: `electron/persist/store.ts` and `electron/main.ts` no longer import `getDB()`. The `persistReplaceAll` FK PRAGMA toggle uses `knex.raw()`. The app boots end-to-end without importing `better-sqlite3` directly anywhere in the persist layer.

**Independent Test**: Run an Electron backup import from Settings (the `persist:merge-all` path). Confirm the restore completes without any PRAGMA or FK constraint error in the main-process log.

### Implementation for User Story 2

- [ ] T007 [US2] Update `electron/persist/store.ts` — replace `import { getDB } from './db'` with `import { getKnex } from './knex-db'`. In `persistReplaceAll`, replace the synchronous:
  ```ts
  const db = getDB();
  db.pragma('foreign_keys = OFF');
  // ...
  db.pragma('foreign_keys = ON');
  ```
  with async Knex equivalents:
  ```ts
  const knex = getKnex();
  await knex.raw('PRAGMA foreign_keys = OFF');
  try { ... } finally { await knex.raw('PRAGMA foreign_keys = ON'); }
  ```

- [ ] T008 [US2] Update `electron/main.ts` — replace `import { getDB } from './persist/db'` with `import { getKnex } from './persist/knex-db'`. Change `await runMigrations(getDB())` to `await runMigrations(getKnex())`.

**Checkpoint**: No file under `electron/` imports `getDB()` except `electron/persist/db.ts` itself.

---

## Phase 5: Polish & Clean-up

**Purpose**: Remove stale raw-DB code and update in-code documentation.

- [ ] T009 [P] Mark `electron/persist/db.ts` as deprecated — add a JSDoc `@deprecated Use getKnex() from ./knex-db instead` comment. Run a grep for `from './db'` and `from '../db'` inside `electron/persist/` to confirm no remaining consumers. Remove the file only when the grep is clean.

- [ ] T010 [P] Update the comment block in `electron/persist/schema.ts` — change the "3-File Sync Rule" references from `db.ts` to `knex-db.ts` and note that migration DDL is now authored using Knex schema builder syntax.

- [ ] T011 Run `npx vue-tsc --noEmit --project electron/tsconfig.json` and resolve any residual type errors (common: `Knex.QueryBuilder` generic inference on `.first()` returning `TRecord | undefined`, needing an explicit cast to `T | null`).

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (verify setup)
    ↓
Phase 2 (knex-db + migrations)  ← blocks everything
    ↓                ↓
Phase 3 (base)    Phase 4 (store + boot)  ← can overlap once T002 lands
    ↓                ↓
         Phase 5 (polish)
```

### Parallel Opportunities

- **T006** — all 10 entity import-swap edits touch different files; do in one pass
- **T007 + T008** — different files, no shared dependency once T005 lands
- **T009 + T010** — pure documentation edits, no runtime impact

---

## Implementation Strategy

**MVP scope (Phases 1–3)**: Knex connects, schema builds via schema builder, base class uses query builder. Entity contracts never touched.

**Incremental delivery**:

1. **T001–T002** — create `knex-db.ts`; verify `getKnex()` returns a live DB handle
2. **T003–T004** — rewrite migrations; run `runMigrations(getKnex())` in isolation and confirm all tables exist
3. **T005** — rewrite `SQLite3Storage`; run `vue-tsc` after
4. **T006** — mechanical import swap; run `vue-tsc` again
5. **T007–T008** — wire boot path; start Electron and verify full app
6. **T009–T011** — cleanup pass

**Key invariant**: `fromRow()` / `toRow()` in every entity file, all Row types in `electron/persist/schema.ts`, and all entity interfaces in `core/types/entities/` are **never modified**. Knex is purely an infrastructure swap beneath the existing type contracts.
