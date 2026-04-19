# Storage Architecture — OrcaQ

> **Features**: 021-standardize-storage-layer, 022-import-export-migration-check, 023-migration-state-entity, 024-fix-migration-state-ddl, 025-cleanup-migration-legacy  
> **Status**: ✅ Implemented  
> **Date**: 2026-04-17

---

## 1. Tổng Quan (Overview)

Trước đây, mỗi store Pinia gọi thẳng vào `window.xxxApi.*` (IPC bridge của Electron) hoặc `localforage` trực tiếp — không có abstraction layer chung. Feature này thay thế bằng một **Unified Storage Layer** hoạt động nhất quán trên cả hai runtime:

| Runtime | Backend cũ | Backend mới |
|---|---|---|
| **Web / SPA** | `localforage` (gọi thẳng, mỗi store tự quản) | `IDBStorage<T>` (class-based, IndexedDB) |
| **Electron renderer** | `window.xxxApi.*` (IPC) | `createStorageApis()` → IPC-proxy wrappers |
| **Electron main** | `electron-store` (JSON file per collection) | `SQLite3Storage<T>` + `better-sqlite3` |

Tất cả store Pinia giờ chỉ gọi **một entry point duy nhất**: `createStorageApis()` — không cần biết mình đang chạy trên platform nào.

---

## 2. Class Hierarchy

```
BaseStorage<T>                    ← core/storage/base/BaseStorage.ts
│   abstract: name, getOne, getMany, create, update, delete, upsert
│
├── IDBStorage<T>                 ← core/storage/base/IDBStorage.ts
│   │   localforage-backed (Web + Electron renderer)
│   │   constructor(options: { dbName, storeName })
│   │
│   ├── WorkspaceStorage          ← core/storage/entities/WorkspaceStorage.ts
│   ├── ConnectionStorage         ← core/storage/entities/ConnectionStorage.ts
│   ├── WorkspaceStateStorage     ← core/storage/entities/WorkspaceStateStorage.ts
│   ├── TabViewStorage            ← core/storage/entities/TabViewStorage.ts
│   ├── QuickQueryLogStorage      ← core/storage/entities/QuickQueryLogStorage.ts
│   ├── RowQueryFileIDB           ← (internal, part of RowQueryFileStorage.ts)
│   ├── RowQueryFileContentIDB    ← (internal, part of RowQueryFileStorage.ts)
│   ├── EnvironmentTagStorage     ← core/storage/entities/EnvironmentTagStorage.ts
│   ├── AppConfigStorage          ← core/storage/entities/AppConfigStorage.ts
│   ├── AgentStateStorage         ← core/storage/entities/AgentStateStorage.ts
│   ├── QueryBuilderStateStorage  ← core/storage/entities/QueryBuilderStateStorage.ts
│   └── MigrationStateStorage     ← core/storage/entities/MigrationStateStorage.ts
│
└── SQLite3Storage<T>             ← electron/persist/SQLite3Storage.ts
    │   better-sqlite3-backed (Electron main process ONLY)
    │   constructor(db: Database)
    │
    ├── WorkspaceSQLiteStorage
    ├── ConnectionSQLiteStorage
    ├── WorkspaceStateSQLiteStorage
    ├── TabViewSQLiteStorage
    ├── QuickQueryLogSQLiteStorage
    ├── RowQueryFileSQLiteStorage
    ├── RowQueryFileContentSQLiteStorage
    ├── EnvironmentTagSQLiteStorage
    ├── AppConfigSQLiteStorage
    ├── AgentStateSQLiteStorage
    ├── QueryBuilderStateSQLiteStorage
    └── MigrationStateSQLiteStorage
```

---

## 3. Dependency Flow

### 3.1 Web / SPA Runtime

```
Pinia Store
    │
    │  createStorageApis()              ← core/storage/factory.ts
    │  (isElectron() = false)
    ▼
StorageApis {
  workspaceStorage,
  connectionStorage,
  ...
}
    │
    ▼
IDBStorage<T> subclasses
    │
    ▼
localforage.createInstance({ name, storeName })
    │
    ▼
IndexedDB (browser native)
```

### 3.2 Electron Runtime (Renderer → Main)

```
Pinia Store
    │
    │  createStorageApis()              ← core/storage/factory.ts
    │  (isElectron() = true)
    ▼
StorageApis {
  workspaceStorage: IPC wrapper,
  connectionStorage: IPC wrapper,
  ...
}
    │
    │  window.electronAPI.persist.*
    │  (contextBridge / preload.ts)
    ▼
electron/ipc/persist.ts (IPC handlers)
    │
    ▼
electron/persist/store.ts
    │
    ▼
SQLite3Storage<T> singletons
    │
    ▼
better-sqlite3  →  {userData}/orcaq.db
```

---

## 4. Folder Structure

```
core/
├── types/
│   └── entities/                       ← Entity TypeScript interfaces (source of truth)
│       ├── workspace.entity.ts
│       ├── connection.entity.ts
│       ├── workspace-state.entity.ts
│       ├── tab-view.entity.ts
│       ├── quick-query-log.entity.ts
│       ├── row-query-file.entity.ts
│       ├── environment-tag.entity.ts
│       ├── app-config.entity.ts
│       ├── agent-state.entity.ts
│       ├── query-builder-state.entity.ts
│       ├── migration-state.entity.ts   ← NEW (023): MigrationState { id, names }
│       └── index.ts
│
├── storage/                            ← Unified storage layer
│   ├── index.ts                        ← Public API: exports factory + types + entities
│   ├── types.ts                        ← StorageApi interfaces (11 entities + StorageApis)
│   ├── factory.ts                      ← createStorageApis(): StorageApis
│   ├── base/
│   │   ├── BaseStorage.ts              ← Abstract base class
│   │   ├── IDBStorage.ts               ← localforage implementation
│   │   └── index.ts
│   └── entities/                       ← IDB entity classes (singletons)
│       ├── WorkspaceStorage.ts
│       ├── ConnectionStorage.ts
│       ├── WorkspaceStateStorage.ts
│       ├── TabViewStorage.ts
│       ├── QuickQueryLogStorage.ts
│       ├── RowQueryFileStorage.ts
│       ├── EnvironmentTagStorage.ts
│       ├── AppConfigStorage.ts
│       ├── AgentStateStorage.ts
│       ├── QueryBuilderStateStorage.ts
│       ├── MigrationStateStorage.ts    ← NEW (023)
│       └── index.ts
│
└── persist/
    ├── migration/                      ← Web migration system (IDB / localStorage → IDB)
    │   ├── MigrationInterface.ts       ← abstract Migration base class
    │   ├── MigrationRunner.ts          ← executeMigrations(), getApplied(), saveApplied()
    │   ├── compatibility.ts            ← checkImportCompatibility()
    │   ├── platformOps.ts              ← getPlatformOps(): { getAll, replaceAll }
    │   ├── index.ts                    ← ALL_MIGRATIONS, runMigrations(), re-exports
    │   └── versions/                   ← 8 migration classes (timestamp-named)
    │       ├── AddTagIdsToConnections1740477873001.ts
    │       ├── RemoveConnectionIdFromRowQueryFiles1740477873002.ts
    │       ├── AddVariablesToRowQueryFiles1740477873003.ts
    │       ├── RemoveVariablesFromRowQueryFileContents1740477873004.ts
    │       ├── MigrateLegacyAppConfig1740477873005.ts
    │       ├── MigrateLegacyAgentState1740477873006.ts
    │       ├── MigrateRowQueryVariablesToFileMetadata1740477873007.ts
    │       └── MigrateLegacyQueryBuilderState1740477873008.ts
    └── adapters/
        ├── idb/                        ← Low-level IDB primitives + PersistCollection type
        └── electron/                   ← IPC proxy adapters (renderer → main)

electron/
└── persist/
    ├── db.ts                           ← getDB(): Database (singleton, WAL + FK on)
    ├── schema.ts                       ← TypeScript types for SQLite row shapes
    ├── SQLite3Storage.ts               ← Abstract SQLite base class
    ├── store.ts                        ← persistGetAll/persistGetOne/... (Electron main)
    ├── entities/                       ← SQLite entity classes (singletons)
    │   ├── WorkspaceSQLiteStorage.ts
    │   ├── ConnectionSQLiteStorage.ts
    │   ├── WorkspaceStateSQLiteStorage.ts
    │   ├── TabViewSQLiteStorage.ts
    │   ├── QuickQueryLogSQLiteStorage.ts
    │   ├── RowQueryFileSQLiteStorage.ts
    │   ├── EnvironmentTagSQLiteStorage.ts
    │   ├── AppConfigSQLiteStorage.ts
    │   ├── AgentStateSQLiteStorage.ts
    │   ├── QueryBuilderStateSQLiteStorage.ts
    │   ├── MigrationStateSQLiteStorage.ts  ← NEW (023)
    │   └── index.ts
    └── migration/                      ← Electron SQLite schema migration
        ├── runner.ts                   ← runMigrations(db): versioned SQL schema
        └── versions/
            └── v001-initial-schema.ts  ← CREATE TABLE for all 11 entities (incl. migration_state)
```

---

## 5. StorageApis Interface

```typescript
// core/storage/types.ts
export interface StorageApis {
  workspaceStorage:         WorkspaceStorageApi;
  connectionStorage:        ConnectionStorageApi;
  workspaceStateStorage:    WorkspaceStateStorageApi;
  tabViewStorage:           TabViewStorageApi;
  quickQueryLogStorage:     QuickQueryLogStorageApi;
  rowQueryFileStorage:      RowQueryFileStorageApi;
  environmentTagStorage:    EnvironmentTagStorageApi;
  appConfigStorage:         AppConfigStorageApi;
  agentStorage:             AgentStateStorageApi;
  queryBuilderStateStorage: QueryBuilderStateStorageApi;
  migrationStateStorage:    MigrationStateStorageApi;    // NEW (023)
}
```

**Entry point cho mọi Pinia store:**

```typescript
// Bất kỳ store nào cũng dùng như nhau — không cần biết platform
import { createStorageApis } from '~/core/storage';

const storageApis = createStorageApis();
const workspaces = await storageApis.workspaceStorage.getAll();
```

---

## 6. Migration Systems (2 loại)

Feature này có **2 migration systems riêng biệt**, phục vụ 2 mục đích khác nhau:

### 6.1 Electron SQLite Schema Migrations

**Mục đích**: Tạo schema SQLite khi Electron app khởi động lần đầu.  
**Trigger**: `runMigrations(getDB())` trong `electron/main.ts bootstrap()`, trước `createWindow()`.  
**Tracking**: Version number lưu trong bảng `_schema_versions` trong SQLite DB.

```
electron/main.ts
    └── bootstrap()
            ├── runMigrations(getDB())          ← electron/persist/migration/runner.ts
            │       └── v001-initial-schema.ts  ← CREATE TABLE IF NOT EXISTS cho tất cả 11 bảng
            └── createWindow(serverUrl)
```

| Version | Nội dung |
|---|---|
| v001 | `CREATE TABLE IF NOT EXISTS` cho tất cả 11 bảng (bao gồm `migration_state`) |

> **Lưu ý**: Không có v002+ vì đây là bản app đầu tiên. Khi cần thêm bảng/cột mới trong tương lai, tạo v002 mới.

### 6.2 Web Data Migrations (IDB)

**Mục đích**: Migrate dữ liệu user trong IDB/localStorage sang schema mới.  
**Trigger**: `runMigrations()` trong Nuxt plugin `plugins/01.migration.client.ts`.  
**Tracking**: Tên migration đã chạy lưu vào `MigrationState` entity trong IDB (`migrationStateStorage`).  
**Pattern**: Name-sorted (timestamp prefix), idempotent per business logic, re-runnable on failure.

```
plugins/01.migration.client.ts
    └── runMigrations({ onStep })       ← core/persist/migration/index.ts
            └── executeMigrations(ALL_MIGRATIONS)
                    ├── sort by name ascending (timestamp prefix đảm bảo thứ tự)
                    ├── skip already-applied (check migrationStateStorage IDB entity)
                    ├── await migration.up()
                    └── saveApplied() → migrationStateStorage.save(names)
```

**Applied set tracking (MigrationRunner.ts):**

```typescript
// getApplied() — reads from IDB entity (primary, travels with backups)
export async function getApplied(): Promise<Set<string>> {
  const record = await migrationStateStorage.get();
  if (record) return new Set(record.names);
  return new Set();
}

// saveApplied() — writes to IDB entity only
async function saveApplied(names: Set<string>): Promise<void> {
  await migrationStateStorage.save([...names]);
}
```

| Migration class | Nội dung |
|---|---|
| `AddTagIdsToConnections1740477873001` | Thêm field `tagIds: []` vào mọi connection |
| `RemoveConnectionIdFromRowQueryFiles1740477873002` | Xóa field `connectionId` khỏi row query files |
| `AddVariablesToRowQueryFiles1740477873003` | Thêm field `variables: ''` vào row query files |
| `RemoveVariablesFromRowQueryFileContents1740477873004` | Xóa field `variables` khỏi file contents |
| `MigrateLegacyAppConfig1740477873005` | Di chuyển `appConfig` từ localStorage key cũ sang IDB |
| `MigrateLegacyAgentState1740477873006` | Di chuyển `agentState` từ localStorage key cũ sang IDB |
| `MigrateRowQueryVariablesToFileMetadata1740477873007` | Gộp variables từ file contents vào file metadata |
| `MigrateLegacyQueryBuilderState1740477873008` | Di chuyển query builder state từ localStorage sang IDB |

> **Idempotency pattern**: Mỗi migration tự kiểm tra xem dữ liệu đã migrate chưa (ví dụ: `if (docs.every(d => 'tagIds' in d)) return`). Không dùng FLAG trong localStorage — migration runner đã tự track applied set qua `migrationStateStorage`.

---

## 7. Export Flow

**Entry**: `useDataExport()` trong `components/modules/settings/hooks/useDataExport.ts`  
**Output**: File `orcaq-backup-YYYY-MM-DD.json` được download về máy.

### Backup Format (v1)

```typescript
interface BackupData {
  version: number;        // luôn là 1
  exportedAt: string;     // ISO timestamp
  schemaVersion: string[]; // tên các migration đã applied lúc export
  persist: Record<PersistCollection, unknown[]>; // toàn bộ dữ liệu 11 collections
  agent: {
    histories: unknown[];  // agent chat histories (lưu riêng ngoài persist)
  };
}
```

### Collections được export (`PersistCollection`)

```
appConfig | agentState | workspaces | workspaceState | connections
tabViews | quickQueryLogs | rowQueryFiles | rowQueryFileContents
environment-tags | migrationState
```

`migrationState` là collection đặc biệt — lưu `{ id: 'applied-migrations', names: string[] }`. Khi import lại, backup sẽ mang theo danh sách migration đã chạy, tránh chạy lại migration đã có.

### Export Flow Diagram

```
useDataExport.exportData()
    │
    ├── getApplied()                    ← đọc từ migrationStateStorage IDB
    │       → schemaVersion = [...names]
    │
    ├── isElectron()?
    │   ├── true  → electronPersistGetAll(col) for each collection   (IPC → SQLite)
    │   └── false → idbGetAll(col) for each collection               (IndexedDB)
    │       → persist = { workspaces: [...], connections: [...], migrationState: [...], ... }
    │
    ├── agentStore.histories            ← từ Pinia store (không qua storage layer)
    │
    └── JSON.stringify(backup) → Blob → <a download> click
```

---

## 8. Import Flow

**Entry**: `useDataImport()` trong `components/modules/settings/hooks/useDataImport.ts`  
**Input**: File `.json` hoặc JSON string từ clipboard.

### Import Flow Diagram

```
useDataImport.importFromFile(file)
    │
    ├── file.text() → JSON.parse(text)
    │
    └── doImport(rawData)
            │
            ├── 1. Validate: isValidBackup(rawData)          (version + persist fields present)
            │
            ├── 2. Compatibility check:
            │       migrationRecord = rawData.persist?.migrationState?.[0]
            │       backupSchemaVersion = migrationRecord?.names ?? rawData.schemaVersion ?? []
            │       checkImportCompatibility(backupSchemaVersion)
            │           → so sánh backup migrations vs ALL_MIGRATIONS của app hiện tại
            │           → nếu backup có migration lạ → showIncompatibleDialog = true → STOP
            │
            ├── 3. Write data:
            │       isElectron()?
            │       ├── true  → electronPersistReplaceAll(col, data) for each collection
            │       └── false → idbReplaceAll(col, data) for each collection
            │       (bao gồm migrationState collection — applied set được restore tự động)
            │
            ├── 4. Seed fallback (pre-023 backups không có migrationState collection):
            │       if (!restoredMigState && backupSchemaVersion.length > 0)
            │           migrationStateStorage.save(backupSchemaVersion)
            │
            ├── 5. Run gap migrations:
            │       runMigrations()
            │           → getApplied() đọc migrationState vừa restore
            │           → chỉ chạy những migration chưa có trong applied set
            │           → đảm bảo backup từ phiên bản cũ hơn được migrate lên hiện tại
            │
            ├── 6. Reload stores:
            │       appConfigStore.loadPersistData()    (nếu backup có appConfig)
            │       agentStore.loadPersistData()        (nếu backup có agentState)
            │       workspaceStore.loadPersistData()
            │       connectionStore.loadPersistData()
            │       wsStateStore.loadPersistData()
            │
            └── success = true
```

### Compatibility Check Logic

```typescript
// core/persist/migration/compatibility.ts
function checkImportCompatibility(backupSchemaVersion: string[]) {
  const appKnownNames = new Set(ALL_MIGRATIONS.map(m => m.name));
  const unknownMigrations = backupSchemaVersion.filter(
    name => !appKnownNames.has(name)
  );
  // unknownMigrations.length > 0 → backup từ app version mới hơn → BLOCK
  // unknownMigrations.length = 0 → safe to import (backup cũ hơn hoặc bằng)
}
```

### Gap Migration sau Import

Sau khi import xong, `runMigrations()` được gọi. Kịch bản:

| Backup version | Applied set sau restore | Gap migrations chạy |
|---|---|---|
| Backup cũ hơn app (thiếu migration 006, 007, 008) | names = ['001','002','003','004','005'] | 006, 007, 008 chạy |
| Backup cùng version | names = all migrations | Không có gì chạy |
| Backup không có migrationState (pre-023) | seed từ schemaVersion field | migrations còn thiếu chạy |

---

## 9. MigrationState Entity

Entity mới (feature 023) dùng để lưu danh sách migration đã applied. Thay thế localStorage làm storage chính.

```typescript
// core/types/entities/migration-state.entity.ts
export interface MigrationState {
  id: 'applied-migrations';  // singleton — luôn chỉ có 1 record
  names: string[];            // tên các migration đã applied
}
```

**Tại sao cần entity riêng?**
- `names` được export cùng backup → khi import lại, applied set được restore tự động
- Không cần localStorage (sẽ mất khi clear browser data)
- Đồng nhất với các entity khác: IDB (web) và SQLite (Electron) cùng dùng chung storage interface

**Web storage**: `MigrationStateStorage` (IDBStorage) → IndexedDB instance `migrationStateIDB`  
**Electron storage**: `MigrationStateSQLiteStorage` → bảng `migration_state` trong `orcaq.db`

---

## 10. SQLite Schema

Database: `{app.getPath('userData')}/orcaq.db`  
Mode: WAL (`PRAGMA journal_mode = WAL`) + Foreign Keys (`PRAGMA foreign_keys = ON`)

```
┌─────────────────────┐       ┌──────────────────────────────┐
│      workspaces     │       │         connections           │
├─────────────────────┤       ├──────────────────────────────┤
│ id PK               │◀──┐   │ id PK                        │
│ icon                │   │   │ workspace_id FK → workspaces │
│ name                │   │   │ name, type, method           │
│ desc                │   │   │ connection_string, host, port│
│ last_opened         │   │   │ username, password, database │
│ created_at          │   │   │ ssl_config (JSON)            │
│ updated_at          │   │   │ ssh_config (JSON)            │
└─────────────────────┘   │   │ tag_ids (JSON array)         │
                           │   │ created_at, updated_at       │
┌─────────────────────┐   │   └──────────────────────────────┘
│   workspace_states  │   │
├─────────────────────┤   │   ┌──────────────────────────────┐
│ id PK (=workspaceId)│   │   │          tab_views           │
│ connection_id       │   │   ├──────────────────────────────┤
│ connection_states   │   └───│ workspace_id FK              │
│   (JSON array)      │       │ connection_id, schema_id     │
│ opened_at           │       │ tab_index, name, icon        │
│ updated_at          │       │ type, route_name             │
└─────────────────────┘       │ route_params (JSON)          │
                               │ metadata (JSON)              │
┌─────────────────────┐       └──────────────────────────────┘
│   row_query_files   │
├─────────────────────┤       ┌──────────────────────────────┐
│ id PK               │       │    row_query_file_contents   │
│ workspace_id FK     │       ├──────────────────────────────┤
│ parent_id (self-ref)│──────▶│ id PK FK → row_query_files  │
│ title, type         │       │   (ON DELETE CASCADE)        │
│ created_at          │       │ contents TEXT                │
│ updated_at          │       └──────────────────────────────┘
└─────────────────────┘

┌─────────────────────┐       ┌──────────────────────────────┐
│   quick_query_logs  │       │      environment_tags        │
├─────────────────────┤       ├──────────────────────────────┤
│ id PK               │       │ id PK                        │
│ connection_id       │       │ name, color                  │
│ workspace_id        │       │ strict_mode (0/1)            │
│ schema_name         │       │ is_system (0/1)              │
│ table_name, logs    │       │ created_at, updated_at       │
│ query_time          │       └──────────────────────────────┘
│ error (JSON)        │
│ error_message       │       ┌──────────────────────────────┐
│ created_at          │       │         app_config           │
└─────────────────────┘       ├──────────────────────────────┤
                               │ id PK (='app-config')        │
┌─────────────────────┐       │ data TEXT (JSON blob)        │
│    agent_state      │       └──────────────────────────────┘
├─────────────────────┤
│ id PK (='agent-..') │       ┌──────────────────────────────┐
│ data TEXT (JSON)    │       │   query_builder_states       │
└─────────────────────┘       ├──────────────────────────────┤
                               │ id PK (composite key)        │
                               │ workspace_id, connection_id  │
                               │ schema_name, table_name      │
                               │ filters, pagination (JSON)   │
                               │ order_by (JSON)              │
                               │ is_show_filters (0/1)        │
                               │ compose_with                 │
                               │ updated_at                   │
                               └──────────────────────────────┘

┌─────────────────────┐
│   migration_state   │
├─────────────────────┤
│ id PK               │  (='applied-migrations', singleton)
│ data TEXT (JSON)    │  (JSON array of migration names)
└─────────────────────┘

┌─────────────────────┐
│  _schema_versions   │  (internal — SQLite migration tracker)
├─────────────────────┤
│ table_name TEXT PK  │
│ version INTEGER     │
│ applied_at TEXT     │
└─────────────────────┘
```

---

## 11. IDB Store Configuration

| Entity | `localforage name` | `storeName` |
|---|---|---|
| Workspace | `workspaceIDB` | `workspaces` |
| Connection | `connectionIDB` | `connections` |
| WorkspaceState | `workspaceStateIDB` | `workspace_states` |
| TabView | `tabViewIDB` | `tab_views` |
| QuickQueryLog | `quickQueryLogIDB` | `quick_query_logs` |
| RowQueryFile | `rowQueryFileIDB` | `row_query_files` |
| RowQueryFileContent | `rowQueryFileContentIDB` | `row_query_file_contents` |
| EnvironmentTag | `environmentTagIDB` | `environment_tags` |
| AppConfig | `appConfigIDB` | `app_config` |
| AgentState | `agentStateIDB` | `agent_state` |
| QueryBuilderState | `queryBuilderStateIDB` | `query_builder_states` |
| MigrationState | `migrationStateIDB` | `migrationState` |

---

## 12. Stores Đã Migrate

Các Pinia store đã chuyển từ `window.xxxApi.*` sang `createStorageApis()`:

| Store | File | Thay đổi |
|---|---|---|
| Workspaces | `core/stores/useWorkspacesStore.ts` | `window.workspaceApi.*` → `storageApis.workspaceStorage.*` |
| Connections | `core/stores/managementConnectionStore.ts` | `window.connectionApi.*` → `storageApis.connectionStorage.*` |
| WS State | `core/stores/useWSStateStore.ts` | `window.workspaceStateApi.*` → `storageApis.workspaceStateStorage.*` |
| Tab Views | `core/stores/useTabViewsStore.ts` | `window.tabViewsApi.*` → `storageApis.tabViewStorage.*` |
| Query Logs | `core/stores/useQuickQueryLogs.ts` | `window.quickQueryLogsApi.*` → `storageApis.quickQueryLogStorage.*` |
| Explorer Files | `core/stores/useExplorerFileStore.ts` | `window.rowQueryFilesApi.*` → `storageApis.rowQueryFileStorage.*` |
| App Config | `core/stores/appConfigStore.ts` | `window.appConfigApi.*` → `storageApis.appConfigStorage.*` |
| Agent State | `core/stores/agentStore.ts` | `window.agentApi.*` → `storageApis.agentStorage.*` |

---

## 13. Design Decisions

### Single Entry Point
`createStorageApis()` trả về cùng một interface `StorageApis` bất kể platform. Store không cần `if (isElectron())`.

### Browser Safety Boundary
- `IDBStorage<T>` và các entity class trong `core/storage/` không import bất kỳ thứ gì từ `electron/` hoặc Node.js.
- `SQLite3Storage<T>` chỉ tồn tại trong `electron/persist/` — không bao giờ bundle vào web build.

### Cascade Delete
`workspaceStorage.delete(id)` trong browser path thực hiện cascade thủ công: xóa connections, tabViews, rowQueryFiles, workspaceState, quickQueryLogs thuộc workspace đó trước khi xóa workspace.

### Single-Record Entities
`AppConfig`, `AgentState`, và `MigrationState` không dùng `getAll/getOne` theo ID người dùng. Chúng expose `get()` / `save()` — luôn singleton (1 record duy nhất).

### QueryBuilderState Key Format
`{workspaceId}-{connectionId}-{schemaName}-{tableName}` — giống key trong localStorage cũ, đảm bảo backward compat trong migration.

### Migration State as Entity
Applied migration set được lưu trong `MigrationState` entity (IDB / SQLite) thay vì localStorage — vì vậy nó travel cùng với backup export/import và bền vững hơn.

---

## 14. Testing

| File | Loại | Số test |
|---|---|---|
| `test/unit/core/storage/base/IDBStorage.spec.ts` | Unit | 11 |
| `test/unit/core/storage/entities/WorkspaceStorage.spec.ts` | Unit | 5 |
| `test/unit/core/storage/entities/QueryBuilderStateStorage.spec.ts` | Unit | 5 |
| `test/unit/core/persist/migration/MigrationRunner.spec.ts` | Unit | 6 |
| **Total** | | **27** |

Tất cả 27 test đều pass. Dùng `fake-indexeddb` cho IDB tests và `vi.stubGlobal('localStorage', ...)` cho migration runner tests.

---

## 15. Files Đã Xóa (Cleanup)

Các file của migration system cũ và legacy electron store migration đã bị xóa:

```
core/persist/adapters/migration/migrationRunner.ts           ← đã xóa (021)
core/persist/adapters/migration/legacyStoreMigration.ts      ← đã xóa (021)
core/persist/adapters/migration/schemaVersionStore.ts        ← đã xóa (021)
core/persist/adapters/migration/types.ts                     ← đã xóa (021)
core/persist/adapters/migration/index.ts                     ← đã xóa (021)
core/persist/adapters/migration/versions/                    ← đã xóa (021)
test/unit/core/persist/migrationRunner.spec.ts               ← đã xóa (021)
electron/persist/migration/versions/v002-migrate-electron-store.ts  ← đã xóa (025)
electron/persist/migration/versions/v003-add-migration-state.ts     ← không bao giờ đăng ký (024), đã xóa
```

`MigrationStepInfo` (dùng bởi `useMigrationState.ts`) đã được chuyển sang `core/persist/migration/MigrationRunner.ts` và export qua `core/persist/migration/index.ts`.
