# Feature Specification: Standardise Storage Layer

**Feature Branch**: `021-standardize-storage-layer`  
**Created**: 2026-04-17  
**Status**: Draft  
**Input**: User description: "Chuẩn hoá lại store — đọc lại hết hook đính kèm xem cái nào cần persist lại data thì tạo ra entities theo từng file vào trong folder core/types/entities; chuẩn hoá storage tạo riêng 1 folder nằm trong core với abstract class BaseStorage (name, getOne, getMany, update, delete), class IDBStorage dùng localforage kế thừa BaseStorage, từng entity Storage khởi tạo từ IDBStorage, init better-sqlite3 cho electron app với SQLite3Storage, dùng adapter pattern tạo bộ chuyển đổi linh hoạt lên tầng store."

## Context — Store Persistence Audit

Analysis of all attached stores to identify which need persistent data:

| Store | Persistence Mechanism | Entities Needed |
|---|---|---|
| `useWorkspacesStore` | Custom API (`window.workspaceApi`) | `Workspace` |
| `managementConnectionStore` | Custom API (`window.connectionApi`) | `Connection` |
| `useWSStateStore` | Custom API (`window.workspaceStateApi`) | `WorkspaceState` |
| `useTabViewsStore` | Custom API (`window.tabViewsApi`) | `TabView` |
| `useQuickQueryLogs` | Custom API (`window.quickQueryLogsApi`) | `QuickQueryLog` |
| `useExplorerFileStore` | Custom API (`window.rowQueryFilesApi`) | `RowQueryFile`, `RowQueryFileContent` |
| `appConfigStore` | Custom API (inferred) | `AppConfig` (single-record blob) |
| `agentStore` | Custom API (`agentApi`) | `AgentState` (with embedded `histories`) |
| `useTableQueryBuilder` | `localStorage` directly — **must migrate** | `QueryBuilderState` |
| `managementExplorerStore` | `pinia-plugin-persistedstate` | No change required |
| `useActivityBarStore` | `pinia-plugin-persistedstate` | No change required |
| `erdStore` | `persist: false` | None |
| `useSchemaStore` | `persist: false` | None |

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Entity Types Centralised (Priority: P1)

All persisted entity shapes are defined in a single location (`core/types/entities/`), one file per entity. Stores and storage classes import from that location — type definitions are never duplicated inline.

**Why this priority**: Every other story depends on having canonical, shared entity types. Without this, each story has conflicting type definitions.

**Independent Test**: A developer opens any store or storage class and can navigate to the entity type definition via "Go to definition" — it resolves to `core/types/entities/<entity>.entity.ts`. Zero inline `interface` or `type` definitions for persisted shapes in store files.

**Acceptance Scenarios**:

1. **Given** the entities folder is empty, **When** I create the 9 entity files, **Then** each store file can import its entity type from `~/core/types/entities` with no import errors.
2. **Given** entity types are centralised, **When** I run a type check, **Then** zero errors arise from missing or duplicate entity type definitions.
3. **Given** `core/types/entities/index.ts` re-exports all entity types, **When** another module imports `from '~/core/types/entities'`, **Then** all entity types are available via that single import path.

---

### User Story 2 — BaseStorage + IDBStorage (Web Platform) (Priority: P1)

A developer adding a new persisted entity for the web platform extends `IDBStorage` with a few lines of code and immediately has a working `getOne`, `getMany`, `create`, `update`, `delete`, and `upsert` implementation backed by IndexedDB — with zero boilerplate for the common cases.

**Why this priority**: This is the core abstraction. Once it exists, all entity-specific storage classes are created on top of it. Unblocks all web-side storage work.

**Independent Test**: `WorkspaceStorage extends IDBStorage<Workspace>` can be instantiated in a test environment. Calling `create(entity)` stores the record; `getOne(id)` retrieves it; `delete(id)` removes it. All pass without touching any store or Vue component.

**Acceptance Scenarios**:

1. **Given** `BaseStorage<T>` is abstract with `name`, `getOne(id)`, `getMany(filters?)`, `create(entity)`, `update(entity)`, `delete(id)`, `upsert(entity)`, **When** `IDBStorage<T>` extends it, **Then** all methods are implemented using IndexedDB with no external dependencies required by the caller.
2. **Given** `IDBStorage` is instantiated for an entity, **When** `create` is called with a duplicate `id`, **Then** the existing record is replaced (upsert semantics).
3. **Given** `getMany()` is called with no filters, **Then** all records for that store name are returned in insertion order.
4. **Given** `getMany({ workspaceId })` is called on a storage that supports it, **Then** only records matching that workspace are returned.

---

### User Story 3 — Entity-Specific Storage Classes (Web Platform) (Priority: P1)

Each of the 9 entities that need persistence has a dedicated storage class extending `IDBStorage` that adds entity-specific query methods (`getByWorkspaceId`, `getByContext`, `deleteByProps`, etc.) matching what the stores currently call via `window.*Api`.

**Why this priority**: Stores consume entity-specific APIs, not the generic base. These classes are the direct replacement for the current `window.*Api` calls.

**Independent Test**: Each entity storage class can be tested independently: instantiate it, call its entity-specific methods, verify correct IndexedDB reads/writes without touching any Pinia store.

**Acceptance Scenarios**:

1. **Given** `WorkspaceStorage` exists, **When** I call `getAll()`, **Then** all workspaces are returned sorted by `createdAt` ascending.
2. **Given** `ConnectionStorage` exists, **When** I call `getByWorkspaceId(wsId)`, **Then** only connections belonging to that workspace are returned.
3. **Given** `QueryBuilderStateStorage` exists (replacing the current `localStorage` usage), **When** I call `save(state)`, **Then** the state is persisted to IndexedDB; `load(key)` retrieves it in a new session.
4. **Given** `AppConfigStorage` and `AgentStateStorage` exist as single-record stores, **When** `get()` is called on a fresh install, **Then** they return a normalised default state instead of `null`.
5. **Given** `RowQueryFileStorage` exists, **When** `deleteFile({ id })` is called, **Then** both the file record and its content record are deleted atomically.

---

### User Story 4 — SQLite3Storage (Electron Platform) (Priority: P2)

The same entity-specific API contracts are fulfilled by a set of `SQLite3Storage` classes that back the data into a local SQLite database when the app runs in Electron. From the store layer's perspective, the API is identical — no `if (isElectron())` branches in store code.

**Why this priority**: Electron persistence via SQLite improves reliability and supports larger data volumes compared to browser storage mechanisms. Depends on US2 contracts being stable.

**Independent Test**: In the Electron main process, opening the SQLite database and calling `workspaceStorage.getAll()` returns the correct rows. Upsert + re-read round-trips JSON fields correctly.

**Acceptance Scenarios**:

1. **Given** `SQLite3Storage<T>` extends `BaseStorage<T>`, **When** any entity-specific SQLite storage class is instantiated, **Then** all `BaseStorage` methods work against a local SQLite file.
2. **Given** a `ConnectionSQLiteStorage`, **When** a connection with SSL config (nested object) is upserted, **Then** `getOne(id)` returns the connection with the SSL config correctly re-hydrated as an object.
3. **Given** the Electron app starts for the first time, **When** `bootstrap()` runs, **Then** all required SQLite tables are created automatically before any store accesses data.
4. **Given** existing data was stored in the previous persistence mechanism, **When** the app upgrades and starts, **Then** all existing records are migrated to SQLite transparently, and the old files are archived.

---

### User Story 5 — Adapter / Factory Pattern (Priority: P2)

The store layer calls a single `createStorageApis()` factory and receives the correct set of entity storage instances for the current runtime platform. Stores contain zero platform-detection code.

**Why this priority**: Eliminates `if (isElectron())` branches from every store, centralises platform switching to one location, and makes it trivial to add a third platform in future.

**Independent Test**: Calling `createStorageApis()` in a web environment returns `IDBStorage`-backed instances; calling it in an Electron-simulated environment returns `SQLite3Storage`-backed instances. The returned object shape is identical in both cases.

**Acceptance Scenarios**:

1. **Given** the app runs in a browser, **When** `createStorageApis()` is called, **Then** all returned storage instances use IndexedDB as their backing store.
2. **Given** the app runs in Electron, **When** `createStorageApis()` is called, **Then** all returned storage instances use SQLite as their backing store.
3. **Given** the factory returns a `storageApis` object, **When** a store calls `storageApis.workspaceStorage.getAll()`, **Then** it works identically on both platforms with no branching code in the store.
4. **Given** a new entity `FooStorage` is added, **When** it is registered in the factory, **Then** it is available on `storageApis.fooStorage` for both platforms with zero changes to any store file.

---

### User Story 6 — Store Layer Migrated (Priority: P3)

All Pinia stores and composables that currently reference `localStorage`, raw IndexedDB calls, or `window.*Api` globals use the storage API returned by the factory. `localStorage` is removed from all store/composable code.

**Why this priority**: This is the payoff — clean, testable stores. Depends on US1–US5 being complete. Can be done incrementally store by store.

**Independent Test**: `grep -rn "localStorage" core/stores/ core/composables/` returns zero results. `grep -rn "window\.\(workspaceApi\|connectionApi\|tabViewsApi\|quickQueryLogsApi\|rowQueryFilesApi\|workspaceStateApi\|agentApi\)" core/stores/` returns zero results.

**Acceptance Scenarios**:

1. **Given** all stores are migrated, **When** `grep -rn "localStorage" core/stores/ core/composables/` is run, **Then** it returns zero results.
2. **Given** `useTableQueryBuilder` is migrated, **When** a user applies filters on a table, navigates away, and returns, **Then** their filters and pagination are restored exactly as left.
3. **Given** all stores use `storageApis.*`, **When** a unit test for any store is written, **Then** the storage dependency can be replaced with an in-memory mock without touching the DOM or browser APIs.

---

### Edge Cases

- What happens when a storage read is called before the storage layer is initialised? → Must return `null` / empty array gracefully, never throw.
- What happens when IndexedDB is unavailable (private browsing, storage quota exceeded)? → Storage operations must fail silently with a console warning; the app must remain functional in a degraded (non-persisting) mode.
- What happens when a `QueryBuilderState` key exists in `localStorage` but not yet in IndexedDB (migration scenario)? → The migrated storage must read from `localStorage` once, write to IndexedDB, then remove the `localStorage` entry.
- What happens when `AppConfig` or `AgentState` records are missing or partially corrupted? → A `normalise*` function must reconstruct defaults for any missing fields before returning.
- What happens on Electron if SQLite is unavailable (native addon not loading)? → App must log the error and fall back to IDB-backed storage, never crashing at startup.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a single `core/types/entities/` directory containing one TypeScript file per persisted entity, each exporting the canonical entity interface.
- **FR-002**: `core/types/entities/index.ts` MUST re-export all entity types so consumers use a single import path.
- **FR-003**: System MUST provide an abstract `BaseStorage<T>` class with at minimum: `name` (string identifier), `getOne(id: string)`, `getMany(filters?)`, `create(entity: T)`, `update(entity: Partial<T> & { id: string })`, `delete(id: string)`, `upsert(entity: T)`.
- **FR-004**: `IDBStorage<T>` MUST extend `BaseStorage<T>` and implement all abstract methods using IndexedDB (via localforage or equivalent).
- **FR-005**: Each of the 9 persisted entities MUST have a dedicated storage class extending `IDBStorage` that adds the entity-specific query and mutation methods currently consumed by the store.
- **FR-006**: `SQLite3Storage<T>` MUST extend `BaseStorage<T>` and implement all abstract methods backed by a local SQLite database file, used exclusively in the Electron process.
- **FR-007**: Each of the 9 entities MUST have a corresponding `SQLite3Storage` subclass with the same entity-specific API as its `IDBStorage` counterpart.
- **FR-008**: A factory function `createStorageApis()` MUST return the correct set of entity storage instances based on the detected runtime platform (web → IDB, Electron → SQLite).
- **FR-009**: The `createStorageApis()` return type MUST be a strongly-typed object with one property per entity storage instance; the shape MUST be identical regardless of platform.
- **FR-010**: All Pinia stores and composables that currently write to `localStorage` MUST be migrated to use the storage API returned by the factory.
- **FR-011**: All Pinia stores that currently call `window.*Api` globals MUST be migrated to consume the equivalent storage instance from the factory.
- **FR-012**: The Electron app MUST automatically create all required database tables on first startup before any store accesses data.
- **FR-013**: The Electron app MUST migrate existing data from the prior persistence mechanism to SQLite on first run with the new codebase, archiving old files.
- **FR-014**: `AppConfigStorage` and `AgentStateStorage` MUST return a normalised default state when no record exists, never returning `null` to callers.
- **FR-015**: All storage operations MUST be safe to call before the backing store is fully initialised — they MUST queue or resolve gracefully rather than throwing.

### Key Entities

- **Workspace**: Represents a logical grouping of connections. Fields: `id`, `icon`, `name`, `desc?`, `lastOpened?`, `createdAt`, `updatedAt?`.
- **Connection**: Database connection configuration within a workspace. Fields: `id`, `workspaceId`, `name`, `type`, `method`, connection params (host/port/user/pass/db/connString), `ssl?`, `ssh?`, `tagIds?`, `createdAt`, `updatedAt?`.
- **WorkspaceState**: Active navigation state for a workspace-connection pair. Fields: `id` (workspaceId), `connectionId?`, `connectionStates[]?` (nested schema + tab selections), `openedAt?`, `updatedAt?`.
- **TabView**: An open editor tab within a connection. Fields: `id`, `workspaceId`, `connectionId`, `schemaId`, `index`, `name`, `icon`, `type`, `routeName`, `routeParams?`, `metadata?`, `iconClass?`.
- **QuickQueryLog**: A record of a SQL query execution (for history display). Fields: `id`, `connectionId`, `workspaceId`, `schemaName`, `tableName`, `logs`, `queryTime`, `createdAt`, `updatedAt?`, `error?`, `errorMessage?`.
- **RowQueryFile**: A file node (file or folder) in the SQL file explorer tree. Shares shape with `TreeFileSystemItem`.
- **RowQueryFileContent**: The raw SQL content of a `RowQueryFile`. Fields: `id` (matches file id), `contents`.
- **AppConfig**: A single-record blob storing all application settings (layout sizes, editor config, agent API keys, table appearance, custom layouts, etc.).
- **AgentState**: A single-record blob storing the AI agent's persisted state including all chat history sessions (`histories[]`), UI state, and settings.
- **QueryBuilderState**: The filter/pagination/sort state for each table's Quick Query view, keyed by `workspaceId-connectionId-schemaName-tableName`.

---

## Assumptions

- `localforage` is already available in the project dependencies (used by existing IDB code).
- `better-sqlite3` is available as a dev/Electron dependency.
- The Electron main process is the only context where `SQLite3Storage` runs — the renderer process always uses `IDBStorage` (routing happens at the IPC boundary).
- `managementExplorerStore` and `useActivityBarStore` are out of scope — they use `pinia-plugin-persistedstate` which is sufficient for simple UI state arrays.
- `erdStore` and `useSchemaStore` are out of scope — `persist: false` is correct for derived/cached data.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 9 persisted entity types are defined in `core/types/entities/` — zero entity interface definitions remain inline in store files.
- **SC-002**: `grep -rn "localStorage" core/stores/ core/composables/` returns zero results after migration.
- **SC-003**: `grep -rn "window\.\(workspaceApi\|connectionApi\|tabViewsApi\|quickQueryLogsApi\|rowQueryFilesApi\|workspaceStateApi\|agentApi\)" core/stores/` returns zero results after migration.
- **SC-004**: A developer can add a new persisted entity by creating 2 files (entity type + storage class) and registering it in the factory — no other files require changes.
- **SC-005**: Unit tests for any storage class can run without a browser, Electron, or any Pinia store — storage classes are framework-independent.
- **SC-006**: A user's Quick Query filters and pagination are restored correctly after a full browser refresh or app restart.
- **SC-007**: Running `vue-tsc --noEmit` reports zero errors after the full migration.
- **SC-008**: The Electron desktop app starts successfully and shows all previously saved workspaces and connections after the SQLite migration runs.

