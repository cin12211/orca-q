# Storage Contracts

**Feature**: 021-standardize-storage-layer  
**Generated**: 2026-04-17  
**Data Model**: [data-model.md](../data-model.md)

These contracts define the TypeScript interfaces each layer must implement. They are the source of truth for both IDB and SQLite3 implementations.

---

## 1. `BaseStorage<T>` — Abstract Contract

```ts
// core/storage/base/BaseStorage.ts

export abstract class BaseStorage<T extends { id: string }> {
  /** Unique store identifier (used as localforage name / SQLite table name) */
  abstract readonly name: string;

  /** Retrieve a single record by primary key. Returns null if not found. */
  abstract getOne(id: string): Promise<T | null>;

  /** Retrieve all records, optionally filtered. Returns empty array if none exist. */
  abstract getMany(filters?: Partial<T>): Promise<T[]>;

  /** Create a new record. Sets createdAt/updatedAt timestamps if not provided. */
  abstract create(entity: T): Promise<T>;

  /**
   * Update an existing record by merging partial fields.
   * Returns null if record does not exist.
   */
  abstract update(entity: Partial<T> & { id: string }): Promise<T | null>;

  /** Delete a record by id. Returns the deleted record, or null if not found. */
  abstract delete(id: string): Promise<T | null>;

  /**
   * Insert or replace a record (upsert semantics).
   * If record exists: replaces it. If not: creates it.
   */
  abstract upsert(entity: T): Promise<T>;
}
```

---

## 2. `IDBStorage<T>` — localforage Implementation

```ts
// core/storage/base/IDBStorage.ts

import localforage from 'localforage';
import dayjs from 'dayjs';
import { BaseStorage } from './BaseStorage';

export abstract class IDBStorage<T extends { id: string }> extends BaseStorage<T> {
  /** localforage store name (= IDB database name). Default: `${this.name}IDB` */
  protected readonly dbName: string;

  /** localforage store key (= IDB object store name). Default: `${this.name}s` */
  protected readonly storeName: string;

  /** Lazily initialised localforage instance */
  protected readonly store: LocalForage;

  // ----- Base contract fulfilled -----
  async getOne(id: string): Promise<T | null>;
  async getMany(filters?: Partial<T>): Promise<T[]>;
  async create(entity: T): Promise<T>;              // stamps createdAt + updatedAt
  async update(entity: Partial<T> & { id: string }): Promise<T | null>;
  async delete(id: string): Promise<T | null>;
  async upsert(entity: T): Promise<T>;

  // ----- Internal helpers -----
  protected applyTimestamps(entity: T): T;          // sets createdAt/updatedAt
  protected matchFilters(record: T, filters: Partial<T>): boolean;
}
```

### IDBStorage Behaviour Specification

| Method | Behaviour |
|---|---|
| `getOne(id)` | `store.getItem<T>(id)` — returns null if missing |
| `getMany()` | Iterate store via `store.iterate`, collect all values |
| `getMany(filters)` | iterate + filter using deep equality per field |
| `create(entity)` | `applyTimestamps` → `store.setItem(entity.id, entity)` → return |
| `update({id, ...partial})` | `getOne(id)` → merge + stamp `updatedAt` → `store.setItem` |
| `delete(id)` | `getOne(id)` → `store.removeItem(id)` → return old record |
| `upsert(entity)` | `store.setItem(entity.id, entity)` — always overwrites |

---

## 3. `SQLite3Storage<T>` — better-sqlite3 Implementation

```ts
// electron/persist/SQLite3Storage.ts

import type Database from 'better-sqlite3';
import { BaseStorage } from '../../core/storage/base/BaseStorage';

export abstract class SQLite3Storage<T extends { id: string }> extends BaseStorage<T> {
  constructor(protected readonly db: Database.Database) {}

  /** SQLite table name */
  abstract readonly tableName: string;

  /**
   * Convert a typed entity to a flat SQLite row object.
   * Nested objects must be JSON.stringify'd. Booleans → 0/1.
   */
  abstract toRow(entity: T): Record<string, unknown>;

  /**
   * Convert a raw SQLite row to a typed entity.
   * Parse JSON strings. Convert 0/1 → boolean.
   */
  abstract fromRow(row: Record<string, unknown>): T;

  // ----- Base contract fulfilled -----
  getOne(id: string): Promise<T | null>;
  getMany(filters?: Partial<T>): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(entity: Partial<T> & { id: string }): Promise<T | null>;
  delete(id: string): Promise<T | null>;
  upsert(entity: T): Promise<T>;

  // ----- SQLite internal helpers -----
  protected addDefaultOrder(qb: string): string;     // adds ORDER BY created_at ASC
}
```

### SQLite3Storage Behaviour Specification

| Method | SQL |
|---|---|
| `getOne(id)` | `SELECT * FROM {table} WHERE id = ?` |
| `getMany()` | `SELECT * FROM {table} ORDER BY created_at ASC` |
| `getMany(filters)` | `SELECT * FROM {table} WHERE field1 = ? AND ...` |
| `create(entity)` | `INSERT INTO {table} VALUES (...)` with timestamps |
| `update({id,...})` | `getOne` + merge + `upsert` |
| `delete(id)` | `getOne` + `DELETE FROM {table} WHERE id = ?` |
| `upsert(entity)` | `INSERT OR REPLACE INTO {table} VALUES (...)` |

---

## 4. Entity-Specific Storage Contracts

### 4.1 `WorkspaceStorageApi`

```ts
interface WorkspaceStorageApi {
  getAll(): Promise<Workspace[]>;
  getOne(id: string): Promise<Workspace | null>;
  create(ws: Workspace): Promise<Workspace>;
  update(ws: Workspace): Promise<Workspace | null>;
  delete(id: string): Promise<Workspace | null>;   // cascade: connections, states, logs, files
}
```

### 4.2 `ConnectionStorageApi`

```ts
interface ConnectionStorageApi {
  getAll(): Promise<Connection[]>;
  getOne(id: string): Promise<Connection | null>;
  getByWorkspaceId(wsId: string): Promise<Connection[]>;
  create(conn: Connection): Promise<Connection>;
  update(conn: Connection): Promise<Connection | null>;
  delete(id: string): Promise<Connection | null | void>;
}
```

### 4.3 `WorkspaceStateStorageApi`

```ts
interface WorkspaceStateStorageApi {
  getAll(): Promise<WorkspaceState[]>;
  create(ws: WorkspaceState): Promise<WorkspaceState>;
  update(ws: WorkspaceState): Promise<WorkspaceState | null>;
  delete(id: string): Promise<WorkspaceState | null | void>;
}
```

### 4.4 `TabViewStorageApi`

```ts
interface TabViewStorageApi {
  getAll(): Promise<TabView[]>;
  getByContext(ctx: { workspaceId: string; connectionId: string }): Promise<TabView[]>;
  create(tab: TabView): Promise<TabView>;
  delete(id: string): Promise<TabView | null>;
  deleteByProps(props: DeleteTabViewProps): Promise<void>;
  bulkDeleteByProps(propsArray: DeleteTabViewProps[]): Promise<void>;
  replaceAll(tabs: TabView[]): Promise<void>;
}
```

### 4.5 `QuickQueryLogStorageApi`

```ts
interface QuickQueryLogStorageApi {
  getAll(): Promise<QuickQueryLog[]>;
  getByContext(ctx: { connectionId: string }): Promise<QuickQueryLog[]>;
  create(log: QuickQueryLog): Promise<QuickQueryLog>;
  delete(props: DeleteQQueryLogsProps): Promise<void>;
}
```

### 4.6 `RowQueryFileStorageApi`

```ts
interface RowQueryFileStorageApi {
  getAllFiles(): Promise<RowQueryFile[]>;
  getFilesByContext(ctx: { workspaceId: string }): Promise<RowQueryFile[]>;
  createFiles(file: RowQueryFile): Promise<RowQueryFile>;
  updateFile(file: Partial<RowQueryFile> & { id: string }): Promise<RowQueryFile | null>;
  updateFileContent(content: RowQueryFileContent): Promise<void>;
  getFileContentById(id: string): Promise<RowQueryFileContent | null>;
  deleteFile(props: { id: string }): Promise<void>;
  deleteFileByWorkspaceId(props: { wsId: string }): Promise<void>;
}
```

### 4.7 `EnvironmentTagStorageApi`

```ts
interface EnvironmentTagStorageApi {
  getAll(): Promise<EnvironmentTag[]>;
  create(tag: EnvironmentTag): Promise<EnvironmentTag>;
  update(tag: EnvironmentTag): Promise<EnvironmentTag | null>;
  delete(id: string): Promise<EnvironmentTag | null>;
  replaceAll(tags: EnvironmentTag[]): Promise<void>;
}
```

### 4.8 `AppConfigStorageApi` (single-record)

```ts
interface AppConfigStorageApi {
  get(): Promise<AppConfigPersistedState>;           // never returns null
  save(state: AppConfigPersistedState): Promise<void>;
  delete(): Promise<void>;
}
```

### 4.9 `AgentStateStorageApi` (single-record)

```ts
interface AgentStateStorageApi {
  get(): Promise<AgentPersistedState>;               // never returns null
  save(state: AgentPersistedState): Promise<void>;
  delete(): Promise<void>;
}
```

### 4.10 `QueryBuilderStateStorageApi`

```ts
interface QueryBuilderStateStorageApi {
  load(key: string): Promise<QueryBuilderState | null>;  // checks IDB then localStorage
  save(state: QueryBuilderState): Promise<void>;
  remove(key: string): Promise<void>;
}
```

---

## 5. `StorageApis` — Factory Return Type

```ts
// core/storage/types.ts

export interface StorageApis {
  workspaceStorage: WorkspaceStorageApi;
  connectionStorage: ConnectionStorageApi;
  workspaceStateStorage: WorkspaceStateStorageApi;
  tabViewStorage: TabViewStorageApi;
  quickQueryLogStorage: QuickQueryLogStorageApi;
  rowQueryFileStorage: RowQueryFileStorageApi;
  environmentTagStorage: EnvironmentTagStorageApi;
  appConfigStorage: AppConfigStorageApi;
  agentStorage: AgentStateStorageApi;
  queryBuilderStateStorage: QueryBuilderStateStorageApi;
}
```

---

## 6. `createStorageApis()` — Factory Contract

```ts
// core/storage/factory.ts

/**
 * Returns the correct storage implementation based on runtime platform.
 *   - Browser / Electron renderer → IDB (localforage)
 *   - Electron main process → IPC bridge to SQLite (existing pattern)
 *
 * Stores MUST call this once at init and use the returned instance.
 * Do NOT call window.*Api or read/write localStorage directly.
 */
export function createStorageApis(): StorageApis;
```

### Platform Resolution Logic

```
isElectron()
  └── true  → return IPC-proxy object (existing core/persist/adapters/electron/ pattern)
               [SQLite runs in main process; renderer sees same StorageApis interface via IPC]
  └── false → return IDBStorage-based instances
               [direct localforage reads in renderer]
```

---

## 7. IPC Bridge (Electron — unchanged)

The existing `core/persist/adapters/electron/primitives.ts` IPC bridge is **not changed** by this spec. The Electron renderer uses the same `window.electronAPI.persist.*` IPC calls. What changes is the Electron **main process** side (`electron/persist/store.ts`) which replaces `electron-store` with SQLite.

The IPC channel names and signatures remain identical to preserve backward compatibility.
