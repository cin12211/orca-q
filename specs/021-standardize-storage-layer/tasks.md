# Tasks: Standardise Storage Layer

**Feature**: Standardise Storage Layer — Entity Types, BaseStorage, IDBStorage, SQLite3Storage, Factory Pattern  
**Branch**: `021-standardize-storage-layer`  
**Generated**: 2026-04-17  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/storage-contracts.md](./contracts/storage-contracts.md) | **Quickstart**: [quickstart.md](./quickstart.md)

---

## Phase 1 — Setup

**Purpose**: Install native dependencies and configure the build pipeline for `better-sqlite3`.

- [X] T001 Install `better-sqlite3` and `@types/better-sqlite3` with `bun add -D better-sqlite3 @types/better-sqlite3`; add `electron-rebuild` to `package.json` `postinstall` script (`electron-rebuild -f -w better-sqlite3`); configure native module rebuild target in `electron-builder.yml` under `nativeRebuilder`

---

## Phase 3 — User Story 1: Entity Types Centralised (P1)

> US1 is the prerequisite for all subsequent stories (US2–US6 all depend on entity types). No separate foundational phase needed.

**Goal**: All 10 persisted entity shapes defined in `core/types/entities/`, one TypeScript file per entity, re-exported via `index.ts`. Zero inline entity type definitions remain in store files.

**Independent Test**: Open any store file → navigate to entity type via "Go to definition" → resolves to `core/types/entities/<entity>.entity.ts`. Run `npx vue-tsc --noEmit` → zero errors from entity type imports.

- [X] T002 [US1] Create `core/types/entities/workspace.entity.ts` — `export interface Workspace { id: string; icon: string; name: string; desc?: string; lastOpened?: string; createdAt: string; updatedAt?: string; }` per data-model.md §1.1
- [X] T003 [P] [US1] Create `core/types/entities/connection.entity.ts` — `export interface Connection` with id, workspaceId, name, type (DatabaseClientType), method (EConnectionMethod), connectionString?, host?, port?, username?, password?, database?, ssl?: ISSLConfig, ssh?: ISSHConfig, tagIds?: string[], createdAt, updatedAt?; import DatabaseClientType, EConnectionMethod, ISSHConfig, ISSLConfig from their existing source locations per data-model.md §1.2
- [X] T004 [P] [US1] Create `core/types/entities/workspace-state.entity.ts` — `export interface WorkspaceState { id: string; connectionId?: string; connectionStates?: { id: string; schemaId: string; tabViewId?: string; sideBarExplorer?: unknown; sideBarSchemas?: unknown; }[]; openedAt?: string; updatedAt?: string; }` per data-model.md §1.3
- [X] T005 [P] [US1] Create `core/types/entities/tab-view.entity.ts` — `export type TabView = { ... }` — MUST be `type` alias, NOT `interface` (Atlassian drag-drop library constraint); fields: id, workspaceId, connectionId, schemaId, index (number), name, icon, iconClass?, type (string), routeName, routeParams?: Record<string, string | number>, metadata?: Record<string, unknown> per data-model.md §1.4
- [X] T006 [P] [US1] Create `core/types/entities/quick-query-log.entity.ts` — `export interface QuickQueryLog { id: string; connectionId: string; workspaceId: string; schemaName: string; tableName: string; logs: string; queryTime: number; createdAt: string; updatedAt?: string; error?: Record<string, unknown>; errorMessage?: string; }` per data-model.md §1.5
- [X] T007 [P] [US1] Create `core/types/entities/row-query-file.entity.ts` — `export interface RowQueryFile { id: string; workspaceId: string; parentId?: string; title: string; type: 'file' | 'folder'; createdAt: string; updatedAt?: string; connectionId?: string; [key: string]: unknown; }` — index signature required; also `export interface RowQueryFileContent { id: string; contents: string; }` per data-model.md §1.6
- [X] T008 [P] [US1] Create `core/types/entities/environment-tag.entity.ts` — `export interface EnvironmentTag { id: string; label: string; color: string; strictMode: boolean; workspaceId?: string; createdAt: string; updatedAt?: string; }` per data-model.md §1.7
- [X] T009 [P] [US1] Create `core/types/entities/app-config.entity.ts` — `export type { AppConfigPersistedState } from '~/core/persist/store-state'` — re-export only; `store-state.ts` remains the single source of truth per data-model.md §1.8
- [X] T010 [P] [US1] Create `core/types/entities/agent-state.entity.ts` — `export type { AgentPersistedState } from '~/core/persist/store-state'` — re-export only per data-model.md §1.9
- [X] T011 [P] [US1] Create `core/types/entities/query-builder-state.entity.ts` — `export interface QueryBuilderState { id: string; workspaceId: string; connectionId: string; schemaName: string; tableName: string; filters: FilterSchema[]; pagination: { limit: number; offset: number }; orderBy: { columnName?: string; order?: 'ASC' | 'DESC' }; isShowFilters: boolean; composeWith: string; updatedAt: string; }` — import FilterSchema from its existing location per data-model.md §1.10
- [X] T012 [US1] Create `core/types/entities/index.ts` — `export type { Workspace }` from workspace, `export type { Connection }` from connection, `export type { WorkspaceState }` from workspace-state, `export type { TabView }` from tab-view, `export type { QuickQueryLog }` from quick-query-log, `export type { RowQueryFile, RowQueryFileContent }` from row-query-file, `export type { EnvironmentTag }` from environment-tag, `export type { AppConfigPersistedState }` from app-config, `export type { AgentPersistedState }` from agent-state, `export type { QueryBuilderState }` from query-builder-state per data-model.md §1 index re-exports
- [X] T013 [US1] Run `npx vue-tsc --noEmit` — confirm zero errors arising from entity type imports; verify all 10 entity files exist and index re-exports compile correctly

**Checkpoint**: Entity types complete → US2 (BaseStorage) and US4 (SQLite schema) can begin in parallel

---

## Phase 4 — User Story 2: BaseStorage + IDBStorage (P1)

**Goal**: `core/storage/base/` created with abstract `BaseStorage<T>` and concrete `IDBStorage<T>`. Unit tests pass in Vitest `node` environment using `fake-indexeddb`.

**Independent Test**: `WorkspaceStorage extends IDBStorage<Workspace>` instantiated in Vitest. `create(entity)` stores; `getOne(id)` retrieves it; `delete(id)` removes it and returns old record — all pass without browser, Electron, or Pinia.

- [X] T014 [US2] Create `core/storage/base/BaseStorage.ts` — `export abstract class BaseStorage<T extends { id: string }>` with abstract property `name: string` and abstract methods `getOne(id: string): Promise<T | null>`, `getMany(filters?: Partial<T>): Promise<T[]>`, `create(entity: T): Promise<T>`, `update(entity: Partial<T> & { id: string }): Promise<T | null>`, `delete(id: string): Promise<T | null>`, `upsert(entity: T): Promise<T>` per contracts/storage-contracts.md §1
- [X] T015 [US2] Create `core/storage/base/IDBStorage.ts` — `export abstract class IDBStorage<T extends { id: string }> extends BaseStorage<T>`; constructor receives optional `{ dbName, storeName }` overrides, creates `localforage.createInstance({ name: dbName, storeName })`; implement all 6 base methods per contracts/storage-contracts.md §2 behaviour table; `getOne`: `store.getItem<T>(id)`; `getMany`: `store.iterate` collect + optional filter; `create`: applyTimestamps → `store.setItem`; `update`: getOne + merge + stamp updatedAt + setItem; `delete`: getOne + removeItem → return old; `upsert`: `store.setItem` always; protected `applyTimestamps(entity: T): T` — sets `createdAt` to now if absent, always sets `updatedAt` to now; protected `matchFilters(record: T, filters: Partial<T>): boolean` — deep equality per field using JSON.stringify for objects
- [X] T016 [US2] Create `core/storage/base/index.ts` — `export { BaseStorage } from './BaseStorage'; export { IDBStorage } from './IDBStorage'`
- [X] T017 [US2] Create `test/unit/core/storage/base/IDBStorage.spec.ts` — configure `fake-indexeddb` in `beforeEach`; tests: getOne returns null for missing id; create stores and returns entity with timestamps; getOne retrieves stored entity; create stamps createdAt and updatedAt; update merges partial fields and stamps updatedAt; update returns null for missing id; delete removes and returns old entity; delete returns null for missing id; upsert overwrites existing record; getMany with no args returns all records; getMany with filter returns only matching records

**Checkpoint**: BaseStorage + IDBStorage ready → US3 entity classes and US4 SQLite layer both unblocked

---

## Phase 5 — User Story 3: Entity IDB Storage Classes (P1)

**Goal**: 10 entity-specific storage classes in `core/storage/entities/` extending `IDBStorage`. Each exposes entity-specific methods matching `StorageApi` contracts. Unit tests pass.

**Independent Test**: Instantiate each entity storage class independently with `fake-indexeddb`. Call entity-specific methods; verify correct IDB reads/writes. `AppConfigStorage.get()` returns normalised default on fresh DB. `QueryBuilderStateStorage.load(key)` migrates from `localStorage` to IDB on first call.

All entity classes have no file conflicts — create in parallel:

- [X] T018 [P] [US3] Create `core/storage/entities/WorkspaceStorage.ts` — `class WorkspaceStorage extends IDBStorage<Workspace>`; default dbName=`workspaceIDB`, storeName=`workspaces`; add `getAll(): Promise<Workspace[]>` alias for `getMany()`; export singleton instance `export const workspaceStorage = new WorkspaceStorage()`
- [X] T019 [P] [US3] Create `core/storage/entities/ConnectionStorage.ts` — `class ConnectionStorage extends IDBStorage<Connection>`; dbName=`connectionIDB`, storeName=`connections`; add `getAll(): Promise<Connection[]>`; add `getByWorkspaceId(wsId: string): Promise<Connection[]>` via `getMany({ workspaceId: wsId })`; export singleton `connectionStorage`
- [X] T020 [P] [US3] Create `core/storage/entities/WorkspaceStateStorage.ts` — `class WorkspaceStateStorage extends IDBStorage<WorkspaceState>`; dbName=`workspaceStateIDB`, storeName=`workspace_states`; expose `getAll()`, `create(ws)`, `update(ws)`, `delete(id)` from base; export singleton `workspaceStateStorage`
- [X] T021 [P] [US3] Create `core/storage/entities/TabViewStorage.ts` — `class TabViewStorage extends IDBStorage<TabView>`; dbName=`tabViewIDB`, storeName=`tab_views`; add `getAll()`; add `getByContext({ workspaceId, connectionId })`: `getMany()` + filter both fields; add `deleteByProps(props: DeleteTabViewProps): Promise<void>`: `getMany()` → filter matched → `Promise.all` delete loop; add `bulkDeleteByProps(propsArray: DeleteTabViewProps[]): Promise<void>`: `Promise.all(propsArray.map(p => deleteByProps(p)))`; add `replaceAll(tabs: TabView[]): Promise<void>`: clear via store iterate + removeItem, then bulk upsert; export singleton `tabViewStorage`
- [X] T022 [P] [US3] Create `core/storage/entities/QuickQueryLogStorage.ts` — `class QuickQueryLogStorage extends IDBStorage<QuickQueryLog>`; dbName=`quickQueryLogIDB`, storeName=`quick_query_logs`; add `getAll()`; add `getByContext({ connectionId }): Promise<QuickQueryLog[]>`; add `delete(props: DeleteQQueryLogsProps): Promise<void>` — handle all discriminated union variants (by connectionId only / by connectionId+workspaceId / by id); export singleton `quickQueryLogStorage`
- [X] T023 [P] [US3] Create `core/storage/entities/RowQueryFileStorage.ts` — two internal IDB subclasses: `RowQueryFileIDB extends IDBStorage<RowQueryFile>` (dbName=`rowQueryFileIDB`, storeName=`row_query_files`) and `RowQueryFileContentIDB extends IDBStorage<RowQueryFileContent>` (dbName=`rowQueryFileContentIDB`, storeName=`row_query_file_contents`); export plain object `rowQueryFileStorage` implementing RowQueryFileStorageApi: `getAllFiles()`, `getFilesByContext({ workspaceId })` (getMany filter), `createFiles(file)` (upsert file + create empty content if none exists), `updateFile(partial)`, `updateFileContent(content)` (upsert on content store), `getFileContentById(id)`, `deleteFile({ id })` (delete content then file), `deleteFileByWorkspaceId({ wsId })` (getFilesByContext → delete each content + file)
- [X] T024 [P] [US3] Create `core/storage/entities/EnvironmentTagStorage.ts` — `class EnvironmentTagStorage extends IDBStorage<EnvironmentTag>`; dbName=`environmentTagIDB`, storeName=`environment_tags`; add `getAll()`; add `replaceAll(tags: EnvironmentTag[]): Promise<void>` (iterate + removeItem all, then bulk upsert each tag); export singleton `environmentTagStorage`
- [X] T025 [P] [US3] Create `core/storage/entities/AppConfigStorage.ts` — `class AppConfigStorage extends IDBStorage<{ id: string; data: AppConfigPersistedState }>`; dbName=`appConfigIDB`, storeName=`app_config`; single-record key `'app-config'`; expose `get(): Promise<AppConfigPersistedState>` — getOne('app-config') → pick `data` field → run through `normalizeAppConfigState` → return (never returns null); `save(state: AppConfigPersistedState): Promise<void>` — upsert `{ id: 'app-config', data: normalizeAppConfigState(state) }`; `delete(): Promise<void>` — delete('app-config'); import normalizeAppConfigState from `~/core/persist/store-state`; export singleton `appConfigStorage`
- [X] T026 [P] [US3] Create `core/storage/entities/AgentStateStorage.ts` — same single-record blob pattern as AppConfig; dbName=`agentStateIDB`, storeName=`agent_state`; key `'agent-state'`; `get()` → normalizeAgentState; `save(state)`; `delete()`; import normalizeAgentState from `~/core/persist/store-state`; export singleton `agentStateStorage`
- [X] T027 [P] [US3] Create `core/storage/entities/QueryBuilderStateStorage.ts` — `class QueryBuilderStateStorage extends IDBStorage<QueryBuilderState>`; dbName=`queryBuilderStateIDB`, storeName=`query_builder_states`; implement `load(key: string): Promise<QueryBuilderState | null>`: call `getOne(key)` → if found return; otherwise check `localStorage.getItem(key)` → if found: parse JSON, `upsert(parsed)`, `localStorage.removeItem(key)`, return parsed; else return null; `save(state: QueryBuilderState): Promise<void>`: `upsert(state)`; `remove(key: string): Promise<void>`: `delete(key)`; export singleton `queryBuilderStateStorage`
- [X] T028 [US3] Create `core/storage/entities/index.ts` — export all 10 entity storage singletons and their classes from this index file
- [X] T029 [US3] Create `test/unit/core/storage/entities/WorkspaceStorage.spec.ts` — fake-indexeddb setup; tests: getAll returns empty array on fresh store; create then getAll returns one item; getOne retrieves by id; delete removes and getAll returns empty; upsert overwrites existing record
- [X] T030 [US3] Create `test/unit/core/storage/entities/QueryBuilderStateStorage.spec.ts` — localStorage migration path test: seed `localStorage.setItem(key, JSON.stringify(state))`; call `load(key)` → returns the state; verify IDB now contains the record via `getOne(key)`; verify `localStorage.getItem(key)` is null; second `load(key)` reads from IDB (not localStorage)

**Checkpoint**: IDB entity storage classes and tests complete → US4 parallel, then US5 factory requires both US3 + US4

---

## Phase 6 — User Story 4: SQLite3Storage + Electron Platform (P2)

**Goal**: Electron SQLite layer fully operational. All 10 entity SQLite storage classes compile. `electron/persist/store.ts` uses SQLite instead of `electron-store`. Migration runs before `createWindow()`.

**Independent Test**: Build Electron; main process calls `runMigrations(getDB())`; SQLite file created at userData path; `workspaceSQLiteStorage.getAll()` returns `[]` on fresh DB; upsert a workspace then `getAll()` returns it with all fields round-tripped correctly.

### SQLite Base Infrastructure (sequential)

- [X] T031 [US4] Create `electron/persist/schema.ts` — export TypeScript row interfaces for all 11 tables using snake_case column names; JSON strings for nested objects; INTEGER for booleans: `WorkspaceRow`, `ConnectionRow`, `WorkspaceStateRow`, `TabViewRow`, `QuickQueryLogRow`, `RowQueryFileRow`, `RowQueryFileContentRow`, `EnvironmentTagRow`, `AppConfigRow` (fields: id TEXT, data TEXT), `AgentStateRow` (fields: id TEXT, data TEXT), `QueryBuilderStateRow`; per data-model.md §3 DDL for exact column names
- [X] T032 [US4] Create `electron/persist/db.ts` — `let _db: Database | null = null`; `export function getDB(): Database`: if `_db` return it; `const db = new Database(path.join(app.getPath('userData'), 'orcaq.db'))`; `db.pragma('journal_mode = WAL')`; `db.pragma('foreign_keys = ON')`; `_db = db; return db`; import `Database` from `'better-sqlite3'`, `app` from `'electron'`, `path` from `'node:path'`
- [X] T033 [US4] Create `electron/persist/SQLite3Storage.ts` — `export abstract class SQLite3Storage<T extends { id: string }> extends BaseStorage<T>`; import BaseStorage from `'../../core/storage/base/BaseStorage'`; constructor `(protected readonly db: Database)`; abstract `tableName: string`, `toRow(entity: T): Record<string, unknown>`, `fromRow(row: Record<string, unknown>): T`; implement all 6 BaseStorage methods using raw `better-sqlite3` synchronous prepared statements (`db.prepare(sql).get(params)` / `.run(params)` / `.all(params)`); `upsert`: `INSERT OR REPLACE INTO ${tableName} (...) VALUES (?,...)`; `getMany()`: `SELECT * FROM ${tableName}` + optional WHERE clause built from filters; `getMany(filters)`: build WHERE per provided filter keys; `create`: applyTimestamps + upsert; `update`: getOne + merge + applyTimestamps + upsert; `delete`: getOne save + DELETE WHERE id=? + return saved; protected `addDefaultOrder(sql: string): string` appends `ORDER BY created_at ASC`; protected `applyTimestamps(entity: T): T` sets createdAt to now if absent, always sets updatedAt to now; per contracts/storage-contracts.md §3

### SQLite Entity Classes (parallel after T033)

- [X] T034 [P] [US4] Create `electron/persist/entities/WorkspaceSQLiteStorage.ts` — `class WorkspaceSQLiteStorage extends SQLite3Storage<Workspace>`; `tableName = 'workspaces'`; `toRow(w)`: `{ id, icon, name, desc: w.desc ?? null, last_opened: w.lastOpened ?? null, created_at: w.createdAt, updated_at: w.updatedAt ?? null }`; `fromRow(row)`: reverse camelCase; add `getAll()` = `getMany()`; `export const workspaceSQLiteStorage = new WorkspaceSQLiteStorage(getDB())`
- [X] T035 [P] [US4] Create `electron/persist/entities/ConnectionSQLiteStorage.ts` — toRow: `ssl_config = ssl ? JSON.stringify(ssl) : null`, `ssh_config`, `tag_ids = tagIds ? JSON.stringify(tagIds) : null`, `database_name = database ?? null`, all other snake_case; fromRow: JSON.parse ssl/ssh/tagIds if present; add `getByWorkspaceId(wsId)`: `db.prepare('SELECT * FROM connections WHERE workspace_id = ?').all(wsId).map(r => fromRow(r))`; export singleton `connectionSQLiteStorage`
- [X] T036 [P] [US4] Create `electron/persist/entities/WorkspaceStateSQLiteStorage.ts` — toRow: `connection_id`, `connection_states = connectionStates ? JSON.stringify(connectionStates) : null`, `opened_at`, `updated_at`; fromRow: JSON.parse connectionStates; override `addDefaultOrder` → `ORDER BY updated_at ASC` (no created_at column); export singleton `workspaceStateSQLiteStorage`
- [X] T037 [P] [US4] Create `electron/persist/entities/TabViewSQLiteStorage.ts` — toRow: `tab_index = index`, `icon_class = iconClass ?? null`, `route_params = routeParams ? JSON.stringify(routeParams) : null`, `metadata = metadata ? JSON.stringify(metadata) : null`; fromRow: `index = Number(row.tab_index)`, `iconClass = row.icon_class ?? undefined`, JSON.parse routeParams/metadata; override addDefaultOrder → `ORDER BY tab_index ASC`; add `getByContext({ workspaceId, connectionId })`: prepare + `.all([workspaceId, connectionId]).map(fromRow)`; add `deleteByProps` + `bulkDeleteByProps` matching IDB equivalents; export singleton `tabViewSQLiteStorage`
- [X] T038 [P] [US4] Create `electron/persist/entities/QuickQueryLogSQLiteStorage.ts` — toRow: `query_time = queryTime`, `error = error ? JSON.stringify(error) : null`, `error_message = errorMessage ?? null`; fromRow: `queryTime = Number(row.query_time)`, `error = row.error ? JSON.parse(row.error) : undefined`, `errorMessage = row.error_message ?? undefined`; add `getByContext({ connectionId })`; add `deleteByProps(props: DeleteQQueryLogsProps)` handling all discriminated union variants; export singleton `quickQueryLogSQLiteStorage`
- [X] T039 [P] [US4] Create `electron/persist/entities/RowQueryFileSQLiteStorage.ts` — TWO SQLite storage classes in one file: `RowQueryFileSQLiteStorage extends SQLite3Storage<RowQueryFile>` (tableName=`row_query_files`; omit connectionId + index signature fields from toRow to keep schema clean); `RowQueryFileContentSQLiteStorage extends SQLite3Storage<RowQueryFileContent>` (tableName=`row_query_file_contents`; no timestamps; override applyTimestamps to return entity unchanged); export plain object `rowQueryFileSQLiteStorage` implementing RowQueryFileStorageApi: getAllFiles, getFilesByContext({workspaceId}), createFiles, updateFile, updateFileContent, getFileContentById, deleteFile (delete content then file), deleteFileByWorkspaceId (get all by wsId → delete each content + file)
- [X] T040 [P] [US4] Create `electron/persist/entities/EnvironmentTagSQLiteStorage.ts` — toRow: `strict_mode = strictMode ? 1 : 0`, `workspace_id = workspaceId ?? null`, `updated_at`; fromRow: `strictMode = Boolean(row.strict_mode)`, `workspaceId = row.workspace_id ?? undefined`, `updatedAt = row.updated_at ?? undefined`; add `getAll()` and `replaceAll(tags)` (DELETE all then upsert in db.transaction); export singleton `environmentTagSQLiteStorage`
- [X] T041 [P] [US4] Create `electron/persist/entities/AppConfigSQLiteStorage.ts` — single-row blob; tableName=`app_config`; `toRow(entity)`: `{ id: entity.id, data: JSON.stringify(entity.data) }`; `fromRow(row)`: `{ id: row.id, data: JSON.parse(row.data as string) }`; expose `get(): AppConfigPersistedState` (getOne('app-config') → normalizeAppConfigState, never null), `save(state)` (upsert `{id:'app-config', data: state}`), `delete()` (delete('app-config')); import normalizeAppConfigState from `'../../../../core/persist/store-state'`; export singleton `appConfigSQLiteStorage`
- [X] T042 [P] [US4] Create `electron/persist/entities/AgentStateSQLiteStorage.ts` — same single-row blob as AppConfig; tableName=`agent_state`; id=`'agent-state'`; normalizeAgentState; export singleton `agentStateSQLiteStorage`
- [X] T043 [P] [US4] Create `electron/persist/entities/QueryBuilderStateSQLiteStorage.ts` — toRow: `workspace_id`, `connection_id`, `schema_name`, `table_name`, `filters = JSON.stringify(filters)`, `pagination = JSON.stringify(pagination)`, `order_by = JSON.stringify(orderBy)`, `is_show_filters = isShowFilters ? 1 : 0`, `compose_with = composeWith`, `updated_at`; fromRow: reverse + JSON.parse filters/pagination/order_by + `isShowFilters = Boolean(row.is_show_filters)`; override addDefaultOrder → `ORDER BY updated_at ASC`; implement `load(key)`, `save(state)`, `remove(key)` matching QueryBuilderStateStorageApi; export singleton `queryBuilderStateSQLiteStorage`
- [X] T044 [US4] Create `electron/persist/entities/index.ts` — export all 10 SQLite storage singletons and their classes

### SQLite Migration System

- [X] T045 [US4] Create `electron/persist/migration/runner.ts` — `export function runMigrations(db: Database): void`; `db.exec('CREATE TABLE IF NOT EXISTS _schema_versions (id INTEGER PRIMARY KEY, version INTEGER NOT NULL UNIQUE, run_at TEXT NOT NULL)')` ; read `SELECT MAX(version) as v FROM _schema_versions` → current version (0 if none); define ordered migration array `[{ version: 1, up: v001up }, { version: 2, up: v002up }]`; for each with `version > current`: wrap `up(db)` in `db.transaction(fn)()` for atomicity; then `db.prepare('INSERT INTO _schema_versions (version, run_at) VALUES (?,?)').run(ver, new Date().toISOString())`
- [X] T046 [US4] Create `electron/persist/migration/versions/v001-initial-schema.ts` — `export function up(db: Database): void`; call `db.exec(sql)` for all 11 `CREATE TABLE IF NOT EXISTS` DDL statements and `CREATE INDEX IF NOT EXISTS` statements from data-model.md §3; tables: workspaces, connections, workspace_states, tab_views, quick_query_logs, row_query_files, row_query_file_contents, environment_tags, app_config, agent_state, query_builder_states
- [X] T047 [US4] Create `electron/persist/migration/versions/v002-migrate-electron-store.ts` — `export function up(db: Database): void`; for each legacy collection (`workspaces`, `connections`, `workspace_states`, `tab_views`, `quick_query_logs`, `row_query_files`, `row_query_file_contents`, `environment_tags`, `app_config`, `agent_state`): build `filePath = path.join(app.getPath('userData'), '{collection}.json')`; if not exists → skip; `const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))`; extract records array; for each record call corresponding SQLite storage singleton `upsert()` (idempotent INSERT OR REPLACE); `fs.renameSync(filePath, filePath + '.migrated')`; wrap each collection in try/catch with `console.warn` (non-fatal, never blocks startup)

### Electron Wiring

- [X] T048 [US4] Rewrite `electron/persist/store.ts` — remove ALL `electron-store` imports; `import { getDB } from './db'`; import all 10 SQLite entity singletons from `'./entities'`; define `PersistCollection` union type including all collection keys; implement `getAdapter(collection: PersistCollection)` switch returning correct singleton; reimplement `persistGetAll(collection)`, `persistGetOne(collection, id)`, `persistFind(collection, filters, matchMode)`, `persistUpsert(collection, id, value)`, `persistDelete(collection, filters, matchMode)`, `persistReplaceAll(collection, values)`, `persistGetAllPaginated(collection, page, pageSize)` — keep ALL existing exported function signatures identical so `electron/ipc/persist.ts` needs ZERO changes for existing channels
- [X] T049 [US4] Update `electron/ipc/persist.ts` — add `ipcMain.handle('persist:get-all-paginated', (_event, { collection, page, pageSize }) => persistGetAllPaginated(collection, page, pageSize))`; import `persistGetAllPaginated` from `'../persist/store'`
- [X] T050 [US4] Update `electron/preload.ts` — add `persistGetAllPaginated(collection: PersistCollection, page: number, pageSize: number): Promise<{ data: unknown[]; total: number; page: number; pageSize: number }>` method calling `ipcRenderer.invoke('persist:get-all-paginated', { collection, page, pageSize })`; add it to the `electronAPI.persist` contextBridge expose object
- [X] T051 [US4] Update `electron/main.ts` — in `bootstrap()` (or its equivalent init function): add `import { runMigrations } from './persist/migration/runner'` and `import { getDB } from './persist/db'`; call `runMigrations(getDB())` BEFORE `createWindow()` is invoked; ensure it is synchronous (better-sqlite3 is sync, so migration completes before window opens)

**Checkpoint**: Electron SQLite layer complete → US5 factory can assemble both platforms

---

## Phase 7 — User Story 5: Adapter / Factory Pattern (P2)

**Goal**: `createStorageApis()` returns the correct typed storage instances for the current runtime. `StorageApis` interface is identical regardless of whether web IDB or Electron IPC-proxy instances are returned.

**Independent Test**: In a test with `isElectron()` mocked to `false`, `createStorageApis()` returns an object with all 10 typed storage properties, each having the required methods callable. Shape check: `typeof apis.queryBuilderStateStorage.load === 'function'`.

- [X] T052 [US5] Create `core/storage/types.ts` — define all 10 individual StorageApi interfaces (WorkspaceStorageApi, ConnectionStorageApi, WorkspaceStateStorageApi, TabViewStorageApi, QuickQueryLogStorageApi, RowQueryFileStorageApi, EnvironmentTagStorageApi, AppConfigStorageApi, AgentStateStorageApi, QueryBuilderStateStorageApi) per contracts/storage-contracts.md §4; then `export interface StorageApis { workspaceStorage: WorkspaceStorageApi; connectionStorage: ConnectionStorageApi; workspaceStateStorage: WorkspaceStateStorageApi; tabViewStorage: TabViewStorageApi; quickQueryLogStorage: QuickQueryLogStorageApi; rowQueryFileStorage: RowQueryFileStorageApi; environmentTagStorage: EnvironmentTagStorageApi; appConfigStorage: AppConfigStorageApi; agentStorage: AgentStateStorageApi; queryBuilderStateStorage: QueryBuilderStateStorageApi; }` per contracts/storage-contracts.md §5
- [X] T053 [US5] Create `core/storage/factory.ts` — `export function createStorageApis(): StorageApis`; use existing `isElectron()` helper from `~/core/helpers/`; if `isElectron()` (renderer process): return IPC-proxy wrapper object — wrap the existing `window.electronAPI.persist.*` calls for each API to match StorageApis shape (the Electron main process already uses SQLite; renderer communicates via unchanged IPC bridge); if browser: return the IDB entity storage singletons imported from `./entities/`; the returned object shape must be identical on both platforms per contracts/storage-contracts.md §6
- [X] T054 [US5] Create `core/storage/index.ts` — `export { createStorageApis } from './factory'`; `export type { StorageApis } from './types'`; `export * from './entities'`; `export * from './base'`

**Checkpoint**: Factory complete → US6 store migration can begin

---

## Phase 8 — User Story 6: Store Layer Migrated (P3)

**Goal**: All 9 stores and composables use `createStorageApis()`. `localStorage` removed from all store/composable code. `window.*Api` references removed from stores.

**Independent Test**: `grep -rn "localStorage" core/stores/ core/composables/ | grep -v ".spec."` → zero results (SC-002). `grep -rn "window\.\(workspaceApi\|connectionApi\|tabViewsApi\|quickQueryLogsApi\|rowQueryFilesApi\|workspaceStateApi\|agentApi\)" core/stores/` → zero results (SC-003).

> **Note (2026-04-17)**: T055 was implemented early (ahead of US3/US5 completion), via the existing `core/persist/` adapter pattern rather than `createStorageApis()`. The composable now calls `window.queryBuilderStateApi.load/save/remove` — the `queryBuilderStateIDBAdapter` migrates any existing localStorage keys to IDB on first `load()`. No Electron SQLite migration is needed since the app is at initial development stage. When US3/US5 are complete, T055 can be upgraded to use `createStorageApis()` if desired, but it is not required.

- [X] T055 [US6] Update `core/composables/useTableQueryBuilder.ts` — `localStorage` fully removed; `window.queryBuilderStateApi.save/load/remove` wired; `load()` is async (fire-and-forget at setup); migration from localStorage to IDB handled automatically inside `queryBuilderStateIDBAdapter.load()`
- [X] T056 [P] [US6] Update `core/stores/useWorkspacesStore.ts` — call `const storageApis = createStorageApis()` at store definition; replace all `window.workspaceApi.*` calls with `storageApis.workspaceStorage.*` equivalents; preserve existing method signatures and reactive state
- [X] T057 [P] [US6] Update `core/stores/managementConnectionStore.ts` — replace `window.connectionApi.*` with `storageApis.connectionStorage.*`
- [X] T058 [P] [US6] Update `core/stores/useWSStateStore.ts` — replace `window.workspaceStateApi.*` with `storageApis.workspaceStateStorage.*`
- [X] T059 [P] [US6] Update `core/stores/useTabViewsStore.ts` — replace `window.tabViewsApi.*` with `storageApis.tabViewStorage.*`; preserve all reactive state and computed properties
- [X] T060 [P] [US6] Update `core/stores/useQuickQueryLogs.ts` — replace `window.quickQueryLogsApi.*` with `storageApis.quickQueryLogStorage.*`
- [X] T061 [P] [US6] Update `core/stores/useExplorerFileStore.ts` — replace `window.rowQueryFilesApi.*` with `storageApis.rowQueryFileStorage.*`
- [X] T062 [P] [US6] Update `core/stores/appConfigStore.ts` — replace existing config persistence API calls with `storageApis.appConfigStorage.get()` / `storageApis.appConfigStorage.save(state)`
- [X] T063 [P] [US6] Update `core/stores/agentStore.ts` — replace `agentApi.*` / `window.agentApi.*` with `storageApis.agentStorage.get()` / `storageApis.agentStorage.save(state)`

**Checkpoint**: All stores migrated → Polish phase

---

## Phase 8.5 — Legacy Migration: QueryBuilderState (localStorage → IDB)

**Goal**: The existing `legacyStoreMigration.ts` startup runner handles all outstanding localStorage queryBuilderState keys eagerly at app boot — not just on first `load(key)`. This complements the lazy inline migration already implemented in `queryBuilderStateIDBAdapter.load()`.

**Context**: QueryBuilderState keys have no fixed prefix (format: `{workspaceId}-{connectionId}-{schemaName}-{tableName}`). We therefore identify them at startup using a shape guard that checks for the known required fields (`filters` array, `pagination` object, `orderBy` object, `isShowFilters` boolean, `composeWith` string). Once the flag is set the runner is a no-op on every subsequent boot.

**Independent Test**: Seed localStorage with 3 query-builder-shaped keys and 1 unrelated key before calling `migrateLegacyQueryBuilderState()`; after the call: IDB contains exactly 3 records; localStorage still has the 1 unrelated key; flag is set; calling the function again takes the fast path (flag already set) without touching IDB or localStorage at all.

- [X] T069 [US6] Update `core/persist/adapters/idb/query-builder-state.ts` — add export `const LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG = 'orcaq-legacy-query-builder-state-migrated-v1'`; add export function `isQueryBuilderPersistedState(value: unknown): value is QueryBuilderPersistedState` — checks `value` is a non-null object, `Array.isArray(value.filters)`, `typeof value.pagination === 'object' && typeof value.pagination?.limit === 'number' && typeof value.pagination?.offset === 'number'`, `typeof value.orderBy === 'object'`, `typeof value.isShowFilters === 'boolean'`, `typeof value.composeWith === 'string'`; both exports are beside the existing adapter code without modifying `queryBuilderStateIDBAdapter`
- [X] T070 [US6] Add `migrateLegacyQueryBuilderState()` to `core/persist/adapters/migration/legacyStoreMigration.ts` — import `LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG` and `isQueryBuilderPersistedState` from `'../idb/query-builder-state'`; implement `async function migrateLegacyQueryBuilderState(): Promise<void>`: `if (isMigrationDone(LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG)) return`; collect all localStorage keys via `Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)`; for each key: try `JSON.parse(localStorage.getItem(key))` → if `isQueryBuilderPersistedState(parsed)`: call `(await createPersistApis()).queryBuilderStateApi.save(key, parsed)` + `localStorage.removeItem(key)`; wrap entire loop body in `try/catch` with `console.warn` (non-fatal); after loop: `markMigrationDone(LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG)`; append call `await migrateLegacyQueryBuilderState()` inside `runLegacyStoreMigrations()` after existing calls
- [X] T071 Create `test/unit/core/persist/adapters/migration/legacyMigrationQueryBuilder.spec.ts` — mock `createPersistApis` (vi.mock); mock `localStorage` with 3 valid QBS-shaped entries (different keys) + 1 unrelated string; call `migrateLegacyQueryBuilderState()`; assert `queryBuilderStateApi.save` called 3 times with correct keys + values; assert `localStorage.removeItem` called for each QBS key; assert unrelated key untouched; assert `markMigrationDone` called; call `migrateLegacyQueryBuilderState()` a second time; assert `queryBuilderStateApi.save` still at 3 calls total (fast-path skipped)

**Checkpoint**: Startup migration complete → queryBuilderState localStorage fully cleaned up on first boot

---

## Phase 10 — User Story 7: Class-Based Migration System (P3)

**Goal**: All migrations follow a single class-based format (`class Foo extends Migration { name; up(); down() }`). A shared `MigrationRunner` replaces both `runSchemaMigrations()` and `runLegacyStoreMigrations()`. Each migration file supports both browser (IDB) and Electron (IPC) via the existing platform helpers. All 8 existing migrations converted to classes. Single `runMigrations()` entry point in the plugin. Old migration system deleted.

**Class format** (TypeORM-inspired, one file per migration):
```ts
export class AddTagIdsToConnections1740477873001 extends Migration {
  name = 'AddTagIdsToConnections1740477873001'
  public async up(): Promise<void> { /* platform-aware, idempotent */ }
  public async down(): Promise<void> { /* reverse or no-op */ }
}
```

**Context**:
- "mỗi 1 Migration là 1 file mà 1 file đó viết dạng pertemt hỗ trợ cho cả browser, electron app" — one migration per file, supports both platforms natively via existing helpers
- `name` property = class name = unique migration ID for applied-tracking
- Applied migrations stored in `localStorage` under key `orcaq-applied-migrations-v1` as JSON `string[]`
- All `up()` methods must be **idempotent** — safe to call if already applied (schema migrations: check data shape; legacy migrations: use existing flag keys)
- **T070 is superseded by T082** in this phase — if implementing Phase 10, skip T070; T082 creates the QueryBuilderState migration as a class (fulfils the same requirement). T071 (test for T070) is superseded by T085.

**Independent Test**: Mock `localStorage` in-memory; define 3 `FakeMigration` instances; call `runMigrations()` → all 3 `up()` called in name-sorted order; assert applied names stored in localStorage; call again → zero additional `up()` calls (all skipped from applied list); simulate `up()` throw → name NOT added to applied list (safe retry on next boot).

All version files have no file conflicts — create in parallel (T075–T082 after T072–T074):

- [X] T072 [US7] Create `core/persist/migration/MigrationInterface.ts` — `export abstract class Migration { abstract readonly name: string; public abstract up(): Promise<void>; public abstract down(): Promise<void>; }`; also `export type MigrationConstructor = new () => Migration`; this is the single base all migration classes extend — no other interfaces needed
- [X] T073 [US7] Create `core/persist/migration/platformOps.ts` — extract the `getPlatformOps()` function from `core/persist/adapters/migration/migrationRunner.ts` into this dedicated file; `import { isElectron }` from `'~/core/helpers/environment'`; `import { persistGetAll as electronGetAll, persistReplaceAll as electronReplaceAll }` from `'~/core/persist/adapters/electron/primitives'`; `import { idbGetAll, idbReplaceAll }` from `'~/core/persist/adapters/idb/primitives'`; `import type { PersistCollection }` from `'~/core/persist/adapters/idb/primitives'`; export type aliases `GetAll = <T>(collection: PersistCollection) => Promise<T[]>` and `ReplaceAll = <T extends { id: string }>(collection: PersistCollection, values: T[]) => Promise<void>`; export `getPlatformOps(): { getAll: GetAll; replaceAll: ReplaceAll }` — returns `{ getAll: electronGetAll, replaceAll: electronReplaceAll }` when `isElectron()`, else `{ getAll: idbGetAll, replaceAll: idbReplaceAll }`; this is the platform-agnostic helper used inside all document-transform migration `up()` methods
- [X] T074 [US7] Create `core/persist/migration/MigrationRunner.ts` — `const APPLIED_KEY = 'orcaq-applied-migrations-v1'`; `function getApplied(): Set<string>`: try `JSON.parse(localStorage.getItem(APPLIED_KEY) ?? '[]')` → cast to `string[]` → return `new Set(arr)`; on parse error return empty Set; `function saveApplied(names: Set<string>): void`: `localStorage.setItem(APPLIED_KEY, JSON.stringify([...names]))`; `export interface RunMigrationsOptions { onStep?: (name: string) => void }`; `export async function executeMigrations(migrations: Migration[], options?: RunMigrationsOptions): Promise<void>`: sort `migrations` by `m.name` ascending (string sort on alphanumeric names ensures timestamp-suffix order); load applied set; for each migration where `m.name` is NOT in applied: `await m.up()`; add `m.name` to applied set, `saveApplied(applied)`, call `options?.onStep?.(m.name)`; if `m.up()` throws: do NOT add to applied (safe retry), re-throw; import `{ Migration }` from `'./MigrationInterface'`
- [X] T075 [P] [US7] Create `core/persist/migration/versions/AddTagIdsToConnections1740477873001.ts` — `import { Migration } from '../MigrationInterface'`; `import { getPlatformOps } from '../platformOps'`; class `name = 'AddTagIdsToConnections1740477873001'`; `up()`: `const { getAll, replaceAll } = getPlatformOps()`; `const docs = await getAll<Record<string,unknown>>('connections')`; if `docs.every(d => 'tagIds' in d)` return (idempotent); else `await replaceAll('connections', docs.map(d => ({ ...d, tagIds: (d as any).tagIds ?? [] })))`; `down()`: `getAll` → `map(({ tagIds: _, ...rest }) => rest)` → `replaceAll`; converted from `versions/connections/v002-add-tag-ids.ts`
- [X] T076 [P] [US7] Create `core/persist/migration/versions/RemoveConnectionIdFromRowQueryFiles1740477873002.ts` — `up()`: `getAll('rowQueryFiles')` → if `docs.every(d => !('connectionId' in d))` return; else map `({ connectionId: _, ...rest }) => rest` → `replaceAll('rowQueryFiles', migrated)`; `down()`: no-op (cannot restore deleted field); converted from `versions/rowQueryFiles/v001-remove-connection-id.ts`
- [X] T077 [P] [US7] Create `core/persist/migration/versions/AddVariablesToRowQueryFiles1740477873003.ts` — `up()`: `getAll('rowQueryFiles')` → if `docs.every(d => 'variables' in d)` return; else `map(d => ({ ...d, variables: (d as any).variables ?? '' }))` → `replaceAll`; `down()`: `getAll` → `map(({ variables: _, ...rest }) => rest)` → `replaceAll('rowQueryFiles', migrated)`; converted from `versions/rowQueryFiles/v002-add-variables.ts`
- [X] T078 [P] [US7] Create `core/persist/migration/versions/RemoveVariablesFromRowQueryFileContents1740477873004.ts` — `up()`: `getAll('rowQueryFileContents')` → if `docs.every(d => !('variables' in d))` return; else `map(({ variables: _, ...rest }) => rest)` → `replaceAll`; `down()`: no-op; converted from `versions/rowQueryFileContents/v001-remove-variables.ts`
- [X] T079 [P] [US7] Create `core/persist/migration/versions/MigrateLegacyAppConfig1740477873005.ts` — imports: `createPersistApis` from `'~/core/persist/factory'`; `getPlatformStorage` from `'~/core/persist/storage-adapter'`; `normalizeAppConfigState`, `LEGACY_APP_CONFIG_STORAGE_KEY` from `'~/core/persist/store-state'`; `name = 'MigrateLegacyAppConfig1740477873005'`; `up()`: `const FLAG = 'orcaq-legacy-app-config-migrated-v1'`; `const storage = getPlatformStorage()`; if `storage.getItem(FLAG) === 'true'` return; `const existing = await createPersistApis().appConfigApi.get()`; if existing: `storage.removeItem(LEGACY_APP_CONFIG_STORAGE_KEY)`, set FLAG, return; read and parse legacy localStorage key; if parsed: save via `appConfigApi.save(normalizeAppConfigState(parsed))`, remove legacy key; set FLAG; `down()`: no-op; logic moved from `migrateLegacyAppConfig()` in `legacyStoreMigration.ts`
- [X] T080 [P] [US7] Create `core/persist/migration/versions/MigrateLegacyAgentState1740477873006.ts` — same FLAG-guard pattern as T079; imports: `createPersistApis`, `getPlatformStorage`, `normalizeAgentState`, `LEGACY_AGENT_STORAGE_KEYS` from `'~/core/persist/store-state'`; `name = 'MigrateLegacyAgentState1740477873006'`; `up()`: flag `'orcaq-legacy-agent-state-migrated-v1'`; check existing via `agentApi.get()`; if present: remove all 5 legacy keys (via `LEGACY_AGENT_STORAGE_KEYS`), set flag, return; else read all 5 legacy keys, check `hasLegacyData`; if none: set flag, return; build and save via `agentApi.save(normalizeAgentState({...}))`, remove all legacy keys, set flag; `down()`: no-op; logic moved from `migrateLegacyAgentState()` in `legacyStoreMigration.ts`
- [X] T081 [P] [US7] Create `core/persist/migration/versions/MigrateRowQueryVariablesToFileMetadata1740477873007.ts` — imports: `getPlatformOps` from `'../platformOps'`; `getPlatformStorage` from `'~/core/persist/storage-adapter'`; `name = 'MigrateRowQueryVariablesToFileMetadata1740477873007'`; `up()`: FLAG `'orcaq-row-query-variables-migrated-v1'`; `const { getAll, replaceAll } = getPlatformOps()`; `Promise.all([getAll('rowQueryFiles'), getAll('rowQueryFileContents')])` in parallel; check `hasLegacyVariables = rowQueryFileContents.some(c => 'variables' in c)`; if false: set FLAG, return; build `variablesByFileId` Map; `migratedFiles = rowQueryFiles.map(...)` (copy variables string from content to file, defaulting to `''`); `migratedContents = rowQueryFileContents.map(({ variables: _, ...rest }) => rest)`; `await Promise.all([replaceAll('rowQueryFiles', migratedFiles), replaceAll('rowQueryFileContents', migratedContents)])`; set FLAG; `down()`: no-op; logic moved from `migrateRowQueryVariablesToFileMetadata()` in `legacyStoreMigration.ts`
- [X] T082 [P] [US7] Create `core/persist/migration/versions/MigrateLegacyQueryBuilderState1740477873008.ts` — imports: `LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG`, `isQueryBuilderPersistedState` from `'~/core/persist/adapters/idb/query-builder-state'` (T069 exports these); `createPersistApis` from `'~/core/persist/factory'`; `getPlatformStorage` from `'~/core/persist/storage-adapter'`; `name = 'MigrateLegacyQueryBuilderState1740477873008'`; `up()`: if `getPlatformStorage().getItem(LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG) === 'true'` return; scan all localStorage keys from `localStorage.key(i)` (0..`localStorage.length-1`); for each key: try `JSON.parse(localStorage.getItem(key))` → if `isQueryBuilderPersistedState(parsed)`: `await createPersistApis().queryBuilderStateApi.save(key, parsed)` + `localStorage.removeItem(key)`; catch: `console.warn`; after loop: `getPlatformStorage().setItem(LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG, 'true')`; `down()`: no-op; **supersedes T070** — provides the same migration as a class; depends on T069 for the exported constants and type guard
- [X] T083 [US7] Create `core/persist/migration/index.ts` — `import { executeMigrations, type RunMigrationsOptions }` from `'./MigrationRunner'`; `import { Migration }` from `'./MigrationInterface'`; import all 8 migration classes from `'./versions/'` (each default or named export); `export const ALL_MIGRATIONS: Migration[] = [new AddTagIdsToConnections1740477873001(), new RemoveConnectionIdFromRowQueryFiles1740477873002(), new AddVariablesToRowQueryFiles1740477873003(), new RemoveVariablesFromRowQueryFileContents1740477873004(), new MigrateLegacyAppConfig1740477873005(), new MigrateLegacyAgentState1740477873006(), new MigrateRowQueryVariablesToFileMetadata1740477873007(), new MigrateLegacyQueryBuilderState1740477873008()]`; `export async function runMigrations(options?: RunMigrationsOptions): Promise<void> { await executeMigrations(ALL_MIGRATIONS, options) }`; re-export `Migration` and `RunMigrationsOptions` for external consumers
- [X] T084 [US7] Update `plugins/01.migration.client.ts` — add `import { runMigrations } from '~/core/persist/migration'`; remove imports of `runSchemaMigrations`, `runLegacyStoreMigrations`, `ALL_MIGRATIONS`; in plugin body: replace both migration calls with single `await runMigrations({ onStep: name => migration.progress({ collection: name, version: 0, description: name }) })`; note: `onStep` receives `name: string` (migration class name) — adapt the `useMigrationState.progress()` call to accept the new shape or pass a compatible object; keep all other plugin logic (start/done/fail) unchanged
- [X] T085 [US7] Create `test/unit/core/persist/migration/MigrationRunner.spec.ts` — `vi.stubGlobal('localStorage', inMemoryStorage)` or use `fake-localStorage`; helper `class FakeMigration extends Migration { name; upSpy = vi.fn(); up = this.upSpy; down = vi.fn(); }`; tests: (1) all 3 pending migrations call `up()` in name-sorted order; (2) applied names serialised to `localStorage` after run; (3) calling `executeMigrations` again invokes zero `up()` — all skipped; (4) if `up()` rejects, name NOT added to applied list; (5) `onStep` callback called once per migration with correct name; (6) partially applied state: only unapplied subset runs on second call
- [X] T086 [US7] Verify after T084+T085: run `npx vue-tsc --noEmit` — zero errors; run `npx vitest run test/unit/core/persist/migration/` — all tests pass; test manually in dev mode to confirm migration startup screen completes without error; only proceed to T087 after all checks pass
- [X] T087 [US7] Delete old migration system files — run: `rm core/persist/adapters/migration/migrationRunner.ts core/persist/adapters/migration/legacyStoreMigration.ts core/persist/adapters/migration/schemaVersionStore.ts core/persist/adapters/migration/types.ts core/persist/adapters/migration/index.ts`; `rm -rf core/persist/adapters/migration/versions/`; run `npx vue-tsc --noEmit` after deletion to confirm no dangling imports from anywhere; do NOT delete `core/persist/adapters/migration/` folder itself if other files remain; do NOT delete `core/persist/adapters/idb/query-builder-state.ts` — it is still the live IDB adapter

**Checkpoint**: Class-based migration system live → old migration files deleted → plugin calls single `runMigrations()` → zero legacy migration code remains

---

## Phase 9 — Polish & Cross-Cutting

- [X] T064 Run `npx vue-tsc --noEmit` — zero errors (excluding any pre-existing echarts/third-party type issue that existed before this feature; SC-007)
- [X] T065 [P] Verify `grep -rn "localStorage" core/stores/ core/composables/ | grep -v ".spec."` → zero results (SC-002)
- [X] T066 [P] Verify `grep -rn "window\.workspaceApi\|window\.connectionApi\|window\.tabViewsApi\|window\.quickQueryLogsApi\|window\.rowQueryFilesApi\|window\.workspaceStateApi\|window\.agentApi" core/stores/` → zero results (SC-003)
- [X] T067 Run `npx vitest run test/unit/core/storage/` — all unit tests pass (SC-005)
- [X] T068 [P] Verify structure: `core/types/entities/` has 10 entity files + `index.ts`; `core/storage/` has `base/`, `entities/`, `factory.ts`, `types.ts`, `index.ts`; `electron/persist/entities/` has 10 SQLite storage files (SC-001, SC-004)

---

## Dependencies

```
T001 → T002–T012              (dep install before entity creation)
T002–T012 → T013              (all entity files before index + typecheck)
T013 → T014–T016              (entity types must compile before BaseStorage)
T014–T016 → T017              (tests after implementation)
T014–T016 → T018–T028         (IDB entity classes after base layer)
T014–T016 → T033              (SQLite3Storage imports BaseStorage)
T018–T028 → T029–T030         (unit tests after entity classes)
T031 → T032 → T033            (schema → db → SQLite3Storage — strictly sequential)
T033 → T034–T043              (SQLite entity classes after abstract base)
T034–T043 → T044              (entity index after all classes)
T044 → T045–T047              (migration can import entity singletons)
T044 → T048                   (store.ts rewrite imports all entity singletons)
T048 → T049–T050              (IPC + preload after store.ts)
T048 → T051                   (main.ts after store.ts is correct)
T028 → T052–T054              (IDB entity index before factory)
T044 → T052–T054              (SQLite entity index before factory)
T054 → T055–T063              (factory before store migration)
T063 → T069–T071              (stores migrated before legacy startup migration phase)
T069 → T070                   (flag constant + type guard before legacyStoreMigration update)
T070 → T071                   (test after implementation)
T071 → T072–T074              (Phase 8.5 done before class migration infra)
T069 → T082                   (QB type guard + flag constant needed by MigrateLegacyQueryBuilderState class)
T072 → T075–T082              (Migration abstract class needed by all version files)
T073 → T075–T082              (platformOps helper needed by document-transform migrations)
T072–T074 → T083              (all infra before migration index)
T083 → T084                   (migration index before plugin update)
T084 → T085                   (implementation before test)
T085 → T086                   (tests pass before verify+typecheck step)
T086 → T087                   (verified before deleting old migration files)
T063,T087 → T064–T068         (stores migrated + migration system cleanup before polish)
```

## Parallel Execution

```
# After T016 (IDBStorage ready):
T018, T019, T020, T021, T022, T023, T024, T025, T026, T027 — all parallel

# After T033 (SQLite3Storage ready):
T034, T035, T036, T037, T038, T039, T040, T041, T042, T043 — all parallel

# After T054 (factory ready):
T055, T056, T057, T058, T059, T060, T061, T062, T063 — all parallel

# After T063 (stores migrated):
T069 → T070, T071 — sequential

# After T072–T074 (Migration infra ready):
T075, T076, T077, T078, T079, T080, T081, T082 — all parallel
→ T083 → T084 → T085 → T086 → T087 — sequential
```

## Task Summary

| Phase | Story | Tasks | Parallel Opportunities |
|---|---|---|---|
| Phase 1 | Setup | T001 | — |
| Phase 3 | US1 (P1) | T002–T013 (12) | T003–T011 all parallel |
| Phase 4 | US2 (P1) | T014–T017 (4) | — |
| Phase 5 | US3 (P1) | T018–T030 (13) | T018–T027 all parallel |
| Phase 6 | US4 (P2) | T031–T051 (21) | T034–T043 all parallel |
| Phase 7 | US5 (P2) | T052–T054 (3) | — |
| Phase 8 | US6 (P3) | T055–T063 (9) | T056–T063 all parallel |
| Phase 8.5 | US6 Legacy Migration | T069–T071 (3) | — |
| Phase 10 | US7 (P3) | T072–T087 (16) | T075–T082 all parallel |
| Phase 9 | Polish | T064–T068 (5) | T065–T066, T068 parallel |
| **Total** | | **87 tasks** | **4 major parallel windows** |

## Implementation Strategy (MVP First)

**Suggested MVP** (ship web storage without Electron SQLite):

1. **Phase 3 — US1**: Entity types ~ 45 min. Critical blocker for everything.
2. **Phase 4 — US2**: BaseStorage + IDBStorage ~ 30 min. Foundation complete.
3. **Phase 5 — US3**: IDB entity classes in parallel ~ 1.5h total. Web persistence done.
4. **Phase 7 — US5 (partial)**: Factory web-only path ~ 20 min. Stores can migrate.
5. **Phase 8 — US6**: Store migration in parallel ~ 1.5h. Integration complete.

**Second increment** (Electron SQLite):

6. **Phase 6 — US4**: Full SQLite layer ~ 3h. Electron persistence solid.
7. **Phase 7 — US5 (Electron path)**: Add Electron IPC-proxy to factory ~ 30 min.
8. **Phase 9**: Polish + typecheck verification.

## Key Design Constraints

| Constraint | Rule |
|---|---|
| `TabView` type | MUST be `type` alias, NOT `interface` — Atlassian drag-drop library |
| Browser safety boundary | `core/` NEVER imports from `electron/persist/` SQLite layer |
| SQLite3Storage exception | MAY import `BaseStorage` from `core/storage/base/BaseStorage` (one-way) |
| Vue/Nuxt imports | Storage classes MUST have zero Vue/Pinia/Nuxt imports |
| IPC channel names | Unchanged — backward compat with all existing Electron renderer code |
| Factory Electron path | Renderer uses IPC-proxy → SQLite runs in main process only |
| Migration class style | All migrations extend `Migration` — one class per file, one file per migration; `name` = class name = unique applied-tracking identifier |
| Migration idempotency | All `up()` methods MUST be safe to call twice — schema migrations check data shape first; legacy migrations use existing `orcaq-*-migrated-v1` flags |
| Migration platform support | All `up()`/`down()` use `getPlatformOps()` or `createPersistApis()` — never import IDB or Electron adapters directly inside migration classes |
