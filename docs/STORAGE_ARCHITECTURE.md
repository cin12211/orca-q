# Storage Architecture

Where OrcaQ keeps local data (workspaces, connections, tabs, files, settings)
and how it reaches it on web and desktop. For upgrading stored data between
releases, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## 1. Overview

| Runtime                     | Domain data                                                                  | Small UI state |
| --------------------------- | ---------------------------------------------------------------------------- | -------------- |
| Web (SPA)                   | IndexedDB via `localforage`, one DB per collection                           | `localStorage` |
| Desktop (Electron renderer) | IPC to the main process, which stores it in SQLite (`better-sqlite3` + Knex) | `localStorage` |

Stores never pick a backend themselves. They call `createStorageApis()`
(`core/storage/factory.ts`), which returns the same `StorageApis` interface
backed by IndexedDB or by Electron IPC depending on `isElectron()`.

## 2. Layers

```
Pinia store (core/stores/*)
  └─ createStorageApis()                         core/storage/factory.ts
       ├─ web:     IDB entity singletons          core/storage/entities/*Storage.ts
       │             └─ IDBStorage<T> (localforage) core/storage/base/IDBStorage.ts
       └─ desktop: Electron adapters              core/persist/adapters/electron/*.ts
                     └─ persist primitives        core/persist/adapters/electron/primitives.ts
                          └─ window.electronAPI.persist   electron/preload.ts
                               └─ ipcMain 'persist:*'      electron/ipc/persist.ts
                                    └─ persist* functions  electron/persist/store.ts
                                         └─ SQLite entities electron/persist/entities/*SQLiteStorage.ts
                                              └─ Knex       electron/persist/knex-db.ts
```

`StorageApis` (`core/storage/types.ts`) has: `workspaceStorage`,
`connectionStorage`, `workspaceStateStorage`, `tabViewStorage`,
`quickQueryLogStorage`, `rowQueryFileStorage`, `environmentTagStorage`,
`appConfigStorage`, `agentStorage`, `migrationStateStorage`,
`mcpSessionStorage`.

The web path implements some cross-collection behavior itself, e.g.
`workspaceStorage.delete` cascades to connections, tab views, query files,
workspace state and query logs.

## 3. Collections

`core/storage/idbRegistry.ts` is the single list of collections
(`PERSIST_COLLECTIONS`) and their IndexedDB names (`PERSIST_IDB_STORES`).

| Collection             | IndexedDB (db / store)                                 | SQLite table              | Shape                              |
| ---------------------- | ------------------------------------------------------ | ------------------------- | ---------------------------------- |
| `appConfig`            | `appConfigIDB` / `appConfig`                           | `app_config`              | single JSON record                 |
| `agentState`           | `agentStateIDB` / `agentState`                         | `agent_state`             | single JSON record                 |
| `workspaces`           | `workspaceIDB` / `workspaces`                          | `workspaces`              | rows                               |
| `workspaceState`       | `workspaceStateIDB` / `workspaceState`                 | `workspace_states`        | rows                               |
| `connections`          | `connectionStoreIDB` / `connectionStore`               | `connections`             | rows (nested objects as JSON)      |
| `tabViews`             | `tabViewsIDB` / `tabViews`                             | `tab_views`               | rows                               |
| `quickQueryLogs`       | `quickQueryLogsIDB` / `quickQueryLogs`                 | `quick_query_logs`        | rows                               |
| `rowQueryFiles`        | `rowQueryFileIDBStore` / `rowQueryFiles`               | `row_query_files`         | rows                               |
| `rowQueryFileContents` | `rowQueryFileContentIDBStore` / `rowQueryFileContents` | `row_query_file_contents` | rows                               |
| `environment-tags`     | `environmentTagIDB` / `environmentTags`                | `environment_tags`        | rows                               |
| `migrationState`       | `migrationStateIDB` / `migrationState`                 | `migration_state`         | single record `applied-migrations` |
| `mcpSessions`          | `mcpSessionIDB` / `mcpSessions`                        | `mcp_sessions`            | rows (desktop feature)             |

SQLite also has `_schema_versions` for the main-process schema version.

### Single-record collections

`appConfig` and `agentState` are stored whole (`app_config` / `agent_state`
have just `id` + `data` JSON). Their shape, defaults and normalization live in
`core/persist/normalize.ts` (`AppConfigPersistedState`,
`normalizeAppConfigState()`, `AgentPersistedState`, `normalizeAgentState()`),
which has no browser dependencies so the Electron main process can use it too.
`core/persist/store-state.ts` re-exports it for older imports.

`appConfigStore` and `agentStore` save a debounced snapshot on every change and
normalize on load, so new fields only need a default in `normalize.ts`.

### Row collections on desktop

Each SQLite entity extends `SQLite3Storage<T>` (`electron/persist/SQLite3Storage.ts`)
and maps between the TS object and a row with `toRow()` / `fromRow()`. Nested
objects (e.g. `connections.ssl`, `ssh`, `broker`, `managedSqlite`, `tagIds`) are
JSON text columns, booleans are integers. A field that `toRow()` does not map is
not saved on desktop. Knex converts camelCase identifiers to snake_case.

The database file is `<userData>/orcaq.db` (dev: `<repo>/.sqlite3/orcaq.db`),
opened with WAL and foreign keys on.

## 4. Desktop IPC

- `core/persist/adapters/electron/primitives.ts` exposes `persistGetAll`,
  `persistGetOne`, `persistFind`, `persistUpsert`, `persistDelete`,
  `persistReplaceAll`, `persistMergeAll` over `window.electronAPI.persist`.
- `electron/preload.ts` forwards them as `persist:*` IPC calls.
- `electron/ipc/persist.ts` handles them with `electron/persist/store.ts`, which
  routes each collection to its SQLite entity (`appConfig` / `agentState` are
  special-cased as single records). Mutations trigger a native menu refresh.
- The main process also reads `electron/persist/store.ts` directly, e.g. for
  recent connections in the native menu.
- The built-in MCP server runs in the Nitro sidecar and opens the same SQLite
  file itself (`server/infrastructure/mcp/desktop-store.ts`, path from
  `ORCAQ_PERSIST_DB_PATH`, only when `ORCAQ_DESKTOP_RUNTIME=1`).

## 5. localStorage

Used on both runtimes for small, non-critical UI state:

- Pinia stores with `persist: true` (`pinia-plugin-persistedstate`, configured
  for `localStorage` in `nuxt.config.ts`): `useActivityBarStore`,
  `managementExplorerStore`.
- Query Builder state per table (`core/composables/useTableQueryBuilder.ts`),
  deliberately kept out of the persist collections.
- Flags in `core/persist/LocalStorageManager.ts` (`LocalStorageKey`: last seen
  version, tour, download banner, launch count, GitHub star prompt, agent
  history tree).

`core/persist/storage-adapter.ts` (`getPlatformStorage()`) returns
`localStorage`; `initPlatformStorage()` is a no-op kept for compatibility.

## 6. Adding A New Collection

1. Add the name to `PERSIST_COLLECTIONS` and an entry to `PERSIST_IDB_STORES`
   in `core/storage/idbRegistry.ts`.
2. Web: create `core/storage/entities/<Name>Storage.ts` extending `IDBStorage`,
   export a singleton from `entities/index.ts`.
3. Desktop: add `electron/persist/schema/<table>.ts`, a new schema version that
   creates it (see MIGRATION_GUIDE §3), a `<Name>SQLiteStorage` entity, and a
   case in `getAdapter()` in `electron/persist/store.ts`. Add an adapter in
   `core/persist/adapters/electron/` if the API needs more than the primitives.
4. Add the API to `StorageApis` in `core/storage/types.ts` and implement it in
   both branches of `core/storage/factory.ts`.
5. Backup export/import picks it up from `PERSIST_COLLECTIONS` automatically;
   check that importing it on its own is safe.

## 7. Backup And Restore

`components/modules/settings/hooks/`:

- `useDataExport.ts` + `backupData.ts` write a JSON file with every persist
  collection, a `localStorage` snapshot, `exportedAt`, and `schemaVersion` (the
  applied data-migration names).
- `useDataImport.ts` rejects backups from a newer build
  (`checkImportCompatibility()`), merges the collections (IndexedDB on web,
  `persistMergeAll` on desktop), merges the applied migration names, reruns
  `runMigrations()`, restores the `localStorage` snapshot, and reloads the stores.
- `useResetAllData.ts` clears local data.

## 8. Gotchas

- The data-migration runner and backup import read and write applied names
  through `core/storage/entities/MigrationStateStorage.ts` (IndexedDB) directly,
  on desktop too. Desktop import additionally writes them to SQLite
  `migration_state`; the factory's Electron `migrationStateStorage` reads that
  copy.
- Always go through `createStorageApis()` in stores; importing an IDB entity
  directly works on web but bypasses SQLite on desktop.
- Electron main code must not import browser-only modules (`localforage`,
  `window`); shared logic goes in `core/persist/normalize.ts`.
