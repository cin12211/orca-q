# Data Model: Standardise Storage Layer

**Feature**: 021-standardize-storage-layer  
**Generated**: 2026-04-17  
**Research**: [research.md](./research.md)

---

## 1. Entity TypeScript Interfaces

All interfaces live in `core/types/entities/`. File per entity. `index.ts` re-exports all.

### 1.1 `workspace.entity.ts`

```ts
export interface Workspace {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lastOpened?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### 1.2 `connection.entity.ts`

```ts
import type { DatabaseClientType } from '~/core/constants/database-client-type';
import type { EConnectionMethod, ISSHConfig, ISSLConfig } from '~/components/modules/connection';

export interface Connection {
  id: string;
  workspaceId: string;
  name: string;
  type: DatabaseClientType;
  method: EConnectionMethod;
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  tagIds?: string[];
  createdAt: string;
  updatedAt?: string;
}
```

### 1.3 `workspace-state.entity.ts`

```ts
export interface WorkspaceState {
  id: string;            // = workspaceId (primary key)
  connectionId?: string;
  connectionStates?: {
    id: string;          // = connectionId
    schemaId: string;
    tabViewId?: string;
    sideBarExplorer?: unknown;
    sideBarSchemas?: unknown;
  }[];
  openedAt?: string;
  updatedAt?: string;
}
```

### 1.4 `tab-view.entity.ts`

```ts
// Must stay `type` (not interface) — Atlassian drag-and-drop library constraint
export type TabView = {
  id: string;
  workspaceId: string;
  connectionId: string;
  schemaId: string;
  index: number;
  name: string;
  icon: string;
  iconClass?: string;
  type: string;                              // TabViewType enum value
  routeName: string;
  routeParams?: Record<string, string | number>;
  metadata?: Record<string, unknown>;
};
```

### 1.5 `quick-query-log.entity.ts`

```ts
export interface QuickQueryLog {
  id: string;
  connectionId: string;
  workspaceId: string;
  schemaName: string;
  tableName: string;
  logs: string;
  queryTime: number;     // milliseconds
  createdAt: string;
  updatedAt?: string;
  error?: Record<string, unknown>;
  errorMessage?: string;
}
```

### 1.6 `row-query-file.entity.ts`

```ts
// RowQueryFile shares shape with TreeFileSystemItem (file-tree component)
export interface RowQueryFile {
  id: string;
  workspaceId: string;
  parentId?: string;
  title: string;
  type: 'file' | 'folder';
  createdAt: string;
  updatedAt?: string;
  connectionId?: string; // stripped before persist (deprecated field)
  [key: string]: unknown;
}

export interface RowQueryFileContent {
  id: string;            // matches RowQueryFile.id
  contents: string;
}
```

### 1.7 `environment-tag.entity.ts`

```ts
export interface EnvironmentTag {
  id: string;
  label: string;
  color: string;
  strictMode: boolean;
  workspaceId?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### 1.8 `app-config.entity.ts`

```ts
// Full shape defined in core/persist/store-state.ts (normalizeAppConfigState)
// This type is a reference alias — store-state.ts is the single source of truth
export type { AppConfigPersistedState } from '~/core/persist/store-state';
```

### 1.9 `agent-state.entity.ts`

```ts
// Full shape defined in core/persist/store-state.ts (normalizeAgentState)
export type { AgentPersistedState } from '~/core/persist/store-state';
```

### 1.10 `query-builder-state.entity.ts`

```ts
export interface QueryBuilderState {
  id: string;            // composite key: {workspaceId}-{connectionId}-{schemaName}-{tableName}
  workspaceId: string;
  connectionId: string;
  schemaName: string;
  tableName: string;
  filters: FilterSchema[];
  pagination: { limit: number; offset: number };
  orderBy: { columnName?: string; order?: 'ASC' | 'DESC' };
  isShowFilters: boolean;
  composeWith: string;   // ComposeOperator enum value
  updatedAt: string;
}
```

### `index.ts` (re-exports)

```ts
export type { Workspace } from './workspace.entity';
export type { Connection } from './connection.entity';
export type { WorkspaceState } from './workspace-state.entity';
export type { TabView } from './tab-view.entity';
export type { QuickQueryLog } from './quick-query-log.entity';
export type { RowQueryFile, RowQueryFileContent } from './row-query-file.entity';
export type { EnvironmentTag } from './environment-tag.entity';
export type { AppConfigPersistedState } from './app-config.entity';
export type { AgentPersistedState } from './agent-state.entity';
export type { QueryBuilderState } from './query-builder-state.entity';
```

---

## 2. IDB Store Configuration

Each entity class creates a `localforage` instance. Convention: `name = '{Entity}IDB'`, `storeName = '{collection}'`.

| Entity | `name` | `storeName` |
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

---

## 3. SQLite Schema

Database file: `{app.getPath('userData')}/orcaq.db`  
Opened with WAL mode (`PRAGMA journal_mode = WAL`) + FK enforcement (`PRAGMA foreign_keys = ON`).

### 3.1 `workspaces`

```sql
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  icon        TEXT NOT NULL,
  name        TEXT NOT NULL,
  desc        TEXT,
  last_opened TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT
);
```

### 3.2 `connections`

```sql
CREATE TABLE IF NOT EXISTS connections (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces(id),
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,
  method            TEXT NOT NULL,
  connection_string TEXT,
  host              TEXT,
  port              TEXT,
  username          TEXT,
  password          TEXT,
  database_name     TEXT,
  ssl_config        TEXT,   -- JSON string
  ssh_config        TEXT,   -- JSON string
  tag_ids           TEXT,   -- JSON array string
  created_at        TEXT NOT NULL,
  updated_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_connections_workspace ON connections(workspace_id);
```

### 3.3 `workspace_states`

```sql
CREATE TABLE IF NOT EXISTS workspace_states (
  id                TEXT PRIMARY KEY,   -- = workspaceId
  connection_id     TEXT,
  connection_states TEXT,               -- JSON array string
  opened_at         TEXT,
  updated_at        TEXT
);
```

### 3.4 `tab_views`

```sql
CREATE TABLE IF NOT EXISTS tab_views (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES workspaces(id),
  connection_id TEXT NOT NULL,
  schema_id     TEXT NOT NULL,
  tab_index     INTEGER NOT NULL,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  icon_class    TEXT,
  type          TEXT NOT NULL,
  route_name    TEXT NOT NULL,
  route_params  TEXT,        -- JSON object string
  metadata      TEXT         -- JSON object string
);
CREATE INDEX IF NOT EXISTS idx_tab_views_ctx ON tab_views(workspace_id, connection_id);
```

### 3.5 `quick_query_logs`

```sql
CREATE TABLE IF NOT EXISTS quick_query_logs (
  id            TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  workspace_id  TEXT NOT NULL,
  schema_name   TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  logs          TEXT NOT NULL,
  query_time    REAL NOT NULL,
  error         TEXT,        -- JSON object string
  error_message TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_qlogs_conn ON quick_query_logs(connection_id);
```

### 3.6 `row_query_files`

```sql
CREATE TABLE IF NOT EXISTS row_query_files (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  parent_id    TEXT,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK(type IN ('file','folder')),
  created_at   TEXT NOT NULL,
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_rqf_workspace ON row_query_files(workspace_id);
```

### 3.7 `row_query_file_contents`

```sql
CREATE TABLE IF NOT EXISTS row_query_file_contents (
  id       TEXT PRIMARY KEY REFERENCES row_query_files(id) ON DELETE CASCADE,
  contents TEXT NOT NULL DEFAULT ''
);
```

### 3.8 `environment_tags`

```sql
CREATE TABLE IF NOT EXISTS environment_tags (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  color        TEXT NOT NULL,
  strict_mode  INTEGER NOT NULL DEFAULT 0,   -- 0 = false, 1 = true
  workspace_id TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT
);
```

### 3.9 `app_config`

```sql
CREATE TABLE IF NOT EXISTS app_config (
  id   TEXT PRIMARY KEY,   -- always 'app-config'
  data TEXT NOT NULL        -- JSON blob of full AppConfigPersistedState
);
```

### 3.10 `agent_state`

```sql
CREATE TABLE IF NOT EXISTS agent_state (
  id   TEXT PRIMARY KEY,   -- always 'agent-state'
  data TEXT NOT NULL        -- JSON blob of full AgentPersistedState
);
```

### 3.11 `query_builder_states`

```sql
CREATE TABLE IF NOT EXISTS query_builder_states (
  id            TEXT PRIMARY KEY,   -- {workspaceId}-{connectionId}-{schemaName}-{tableName}
  workspace_id  TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  schema_name   TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  filters       TEXT NOT NULL,      -- JSON array
  pagination    TEXT NOT NULL,      -- JSON object { limit, offset }
  order_by      TEXT NOT NULL,      -- JSON object { columnName?, order? }
  is_show_filters INTEGER NOT NULL DEFAULT 0,
  compose_with  TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_qbs_ctx ON query_builder_states(workspace_id, connection_id);
```

### 3.12 `_schema_versions` (migration tracking)

```sql
CREATE TABLE IF NOT EXISTS _schema_versions (
  table_name TEXT PRIMARY KEY,
  version    INTEGER NOT NULL DEFAULT 0,
  applied_at TEXT NOT NULL
);
```

---

## 4. Class Hierarchy Diagram

```
BaseStorage<T>
├── getOne(id): Promise<T | null>
├── getMany(filters?): Promise<T[]>
├── create(entity: T): Promise<T>
├── update(entity: Partial<T> & { id: string }): Promise<T | null>
├── delete(id: string): Promise<T | null>
└── upsert(entity: T): Promise<T>

    IDBStorage<T> extends BaseStorage<T>
    │  (localforage, async)
    ├── WorkspaceStorage extends IDBStorage<Workspace>
    │     + getAll(): Promise<Workspace[]>
    │     + deleteWithCascade(id): Promise<Workspace | null>
    ├── ConnectionStorage extends IDBStorage<Connection>
    │     + getAll(): Promise<Connection[]>
    │     + getByWorkspaceId(wsId): Promise<Connection[]>
    ├── WorkspaceStateStorage extends IDBStorage<WorkspaceState>
    │     + getAll(): Promise<WorkspaceState[]>
    ├── TabViewStorage extends IDBStorage<TabView>
    │     + getByContext({workspaceId, connectionId}): Promise<TabView[]>
    │     + deleteByProps(props): Promise<void>
    │     + bulkDeleteByProps(propsArray): Promise<void>
    ├── QuickQueryLogStorage extends IDBStorage<QuickQueryLog>
    │     + getByContext({connectionId}): Promise<QuickQueryLog[]>
    │     + deleteByProps(props): Promise<void>
    ├── RowQueryFileStorage
    │     + getAllFiles(): Promise<RowQueryFile[]>
    │     + getFilesByContext({workspaceId}): Promise<RowQueryFile[]>
    │     + createFile(file): Promise<RowQueryFile>
    │     + updateFile(file): Promise<RowQueryFile | null>
    │     + getFileContentById(id): Promise<RowQueryFileContent>
    │     + updateFileContent(fc): Promise<void>
    │     + deleteFile({id}): Promise<void>
    │     + deleteFileByWorkspaceId({wsId}): Promise<void>
    ├── EnvironmentTagStorage extends IDBStorage<EnvironmentTag>
    │     + getAll(): Promise<EnvironmentTag[]>
    ├── AppConfigStorage (single-record, not extending IDBStorage directly)
    │     + get(): Promise<AppConfigPersistedState>
    │     + save(state): Promise<void>
    │     + delete(): Promise<void>
    ├── AgentStateStorage (single-record)
    │     + get(): Promise<AgentPersistedState>
    │     + save(state): Promise<void>
    │     + delete(): Promise<void>
    └── QueryBuilderStateStorage extends IDBStorage<QueryBuilderState>
          + load(key): Promise<QueryBuilderState | null>   ← includes localStorage migration
          + save(state): Promise<void>
          + remove(key): Promise<void>

    SQLite3Storage<T> extends BaseStorage<T>
       (better-sqlite3, synchronous in main process)
       └── [same entity-specific subclasses with SQLite-specific toRow/fromRow]
```

---

## 5. StorageApis Factory Type

```ts
export interface StorageApis {
  workspaceStorage: WorkspaceStorage;
  connectionStorage: ConnectionStorage;
  workspaceStateStorage: WorkspaceStateStorage;
  tabViewStorage: TabViewStorage;
  quickQueryLogStorage: QuickQueryLogStorage;
  rowQueryFileStorage: RowQueryFileStorage;
  environmentTagStorage: EnvironmentTagStorage;
  appConfigStorage: AppConfigStorage;
  agentStorage: AgentStateStorage;
  queryBuilderStateStorage: QueryBuilderStateStorage;
}
```

> **Note**: On Electron, `createStorageApis()` returns the same `StorageApis` interface, but backed by the IPC-proxy adapters (existing `core/persist/adapters/electron/`). The SQLite storage runs in the main process and is accessed via the existing IPC bridge. Direct SQLite access from the renderer is never used.
