# Research: Standardise Storage Layer

**Feature**: 021-standardize-storage-layer  
**Generated**: 2026-04-17

---

## 1. Current Codebase State (Branch `021`)

### What Already Exists

| Path | Status | Notes |
|---|---|---|
| `core/persist/adapters/idb/*.ts` | ✅ Exists | 9 plain-object adapters using localforage directly — no base class |
| `core/persist/adapters/electron/*.ts` | ✅ Exists | 9 plain-object adapters using electron-store via IPC |
| `core/persist/factory.ts` | ✅ Exists | `createPersistApis()` routes by platform; returns `PersistApis` |
| `core/persist/types.ts` | ✅ Exists | Per-entity API contracts; imports entity types from `'../stores'` (old, must change) |
| `core/persist/store-state.ts` | ✅ Exists | `normalizeAppConfigState`, `normalizeAgentState`, default blobs |
| `electron/persist/store.ts` | ✅ Exists | Uses `electron-store` (JSON files) — the target to replace |
| `electron/persist/adapters/` | ✅ Exists (partial) | Some SQLite adapter files started; none complete |
| `core/types/entities/` | ❌ Empty | Must create all 9 entity files |
| `core/storage/` | ❌ Does not exist | Main deliverable for this spec |
| `electron/persist/SQLite3Storage.ts` | ❌ Does not exist | Main Electron deliverable |

### Key Observation — IDB Adapters

The existing `core/persist/adapters/idb/workspace.ts` pattern is:
```ts
const store = localforage.createInstance({ name: 'workspaceIDB', storeName: 'workspaces' });

export const workspaceIDBAdapter = {
  getAll: async () => { /* iterate localforage */ },
  create: async (ws) => { /* store.setItem */ },
  // ...
};
```
Every IDB adapter duplicates the same CRUD boilerplate. The base class will extract this.

### Key Observation — Electron Adapters

The existing `core/persist/adapters/electron/*.ts` are IPC proxies that call `window.electronAPI.persist.*` which in turn route to `electron/persist/store.ts`. The store uses `electron-store` (JSON files on disk, one file per collection). This is the target for SQLite replacement.

---

## 2. Technology Decisions

### 2.1 Web Storage: `localforage` (already installed `^1.10.0`)

**Decision**: Use `localforage`.  
**Rationale**: Already installed and in use. `localforage.createInstance({ name, storeName })` provides per-entity namespacing. Supports async iteration needed for `getMany`. Falls back gracefully to localStorage in restricted environments.  
**Alternatives considered**: `idb-keyval` (simpler API but no namespacing, would need a key-prefix convention for entity isolation).

### 2.2 Electron Storage: `better-sqlite3` (needs install)

**Decision**: Install and use `better-sqlite3`.  
**Rationale**: Synchronous API is perfect for Electron main process — simpler than async sqlite3 (already installed as `sqlite3: ^5.1.7` but that package is async/callback-based and used by the server-side BFF). Synchronous reads/writes avoid callback complexity in IPC handlers.  
**Installation needed**: `bun add -D better-sqlite3 @types/better-sqlite3 && npx electron-rebuild`  
**Alternatives considered**: `sqlite3` (already installed, async, used by server BFF — keep separate). `sql.js` (pure WASM, no native addon but harder to set up). Kysely (evaluated but adds dependency without sufficient benefit for simple CRUD — use raw better-sqlite3 with typed helpers instead).

**Note on Kysely**: Evaluated on a prior branch (`016-electron-sqlite-kysely`). Decided against including it here to reduce the dependency surface. Raw `better-sqlite3` with the `SQLite3Storage` base class provides equivalent type safety for this use case.

### 2.3 QueryBuilderState Parity: stay in localStorage

**Decision**: Keep Query Builder state in renderer localStorage on both web and Electron.  
**Rationale**: This state is UI-scoped, keyed by workspace/connection/schema/table, and should behave the same way across browser and desktop. It does not belong in backup persist collections or Electron SQLite.  
**Implementation**: `useTableQueryBuilder` reads and writes localStorage directly using `LocalStorageManager.queryBuilderKey(...)`. Backup import/export only touches it through the `localStorage` snapshot payload.

### 2.4 Electron Restore Contract: `persist:merge-all`

**Decision**: Electron restore/import depends on a first-class `persist:merge-all` IPC channel exposed through preload and registered during the same main-process bootstrap path as other persist handlers.  
**Rationale**: Restore/import is merge-based rather than replace-all. The renderer must be able to invoke the contract deterministically and fail with a clear error if the preload bridge is unavailable.  
**Implementation**: `electron/preload.ts`, `electron/types/global.d.ts`, `core/persist/adapters/electron/primitives.ts`, `electron/ipc/persist.ts`, and `electron/main.ts` all share the same narrowed `ElectronPersistCollection` surface.

### 2.4 Electron electron-store → SQLite Migration

**Decision**: `v002-migrate-electron-store.ts` migration, runs once on startup.  
**Rationale**: Users with existing workspaces/connections need data preserved. The migration reads each `electron-store` JSON file, upserts records into SQLite, renames the JSON file to `.migrated`. Idempotent (upserts don't fail on re-run).  
**Trigger**: `runMigrations(db)` is called in `electron/main.ts bootstrap()` before `createWindow()`.

---

## 3. Architecture Decisions

### 3.1 Class Hierarchy

```
BaseStorage<T>            ← abstract: name, getOne, getMany, create, update, delete, upsert
  ├── IDBStorage<T>       ← localforage-backed (web + Electron renderer)
  │     └── WorkspaceStorage, ConnectionStorage, ...
  └── SQLite3Storage<T>   ← better-sqlite3-backed (Electron main process only)
        └── WorkspaceSQLiteStorage, ConnectionSQLiteStorage, ...
```

**Rationale**: Single `BaseStorage<T>` contract means stores can be tested with any implementation. Entity-specific classes add only the domain-specific query methods (`getByWorkspaceId`, `getByContext`, etc.) and don't repeat CRUD boilerplate.

### 3.2 Folder Layout

New folder `core/storage/` is separate from `core/persist/` to:
- Keep the user-facing persist API (`core/persist/`) stable during migration
- Allow gradual switchover: stores can adopt `core/storage/` at their own pace
- Keep SQLite-specific code in `electron/` (browser-safe boundary)

The existing `core/persist/factory.ts` will be updated to import from `core/storage/entities/` once entity classes are ready. US6 (P3) fully migrates stores.

### 3.3 Naming Convention

| Concept | Code Name |
|---|---|
| Abstract base | `BaseStorage<T>` |
| IDB concrete | `IDBStorage<T>` |
| SQLite concrete | `SQLite3Storage<T>` |
| Entity IDB class | `WorkspaceStorage` (no suffix) |
| Entity SQLite class | `WorkspaceSQLiteStorage` |
| Factory function | `createStorageApis()` |
| Factory return type | `StorageApis` |

### 3.4 SQLite vs IPC

The Electron architecture keeps the SQLite code in the **main process** only. The renderer process always uses IDB or calls the existing IPC bridge (`window.electronAPI.persist.*`). This means:
- `SQLite3Storage<T>` and entity SQLite classes run ONLY in `electron/persist/`
- `core/storage/entities/*.ts` are IDB-only (no Node.js dependencies, safe for web)
- The electron IPC adapters in `core/persist/adapters/electron/` continue to be the bridge

### 3.5 AppConfig and AgentState

These are single-record stores. Their storage classes expose `get()` / `save()` instead of `getOne/getMany`:
- `AppConfigStorage.get()` → `store.getItem('app-config') ?? normalizeAppConfigState({})`
- `AppConfigStorage.save(state)` → `store.setItem('app-config', normalizeAppConfigState(state))`

The same pattern applies to SQLite: a single row with `id = 'app-config'` holds the JSON blob.

---

## 4. Resolved Unknowns

| Unknown | Resolution |
|---|---|
| Which SQLite library? | `better-sqlite3` (sync, native, Electron-first) — must install |
| Use Kysely? | No — raw better-sqlite3 is sufficient; avoids extra dependency |
| Folder name? | `core/storage/` (new, separate from `core/persist/`) |
| Class naming? | `BaseStorage`, `IDBStorage`, `SQLite3Storage`, entity classes without suffix for IDB |
| Backward compat with existing adapters? | Keep `core/persist/` unchanged; `core/storage/` is the new interface; migrate gradually |
| Electron IPC needed? | Existing IPC bridge unchanged; SQLite runs in main process only |
| QueryBuilderState key format? | `{workspaceId}-{connectionId}-{schemaName}-{tableName}` via `LocalStorageManager.queryBuilderKey(...)` |
