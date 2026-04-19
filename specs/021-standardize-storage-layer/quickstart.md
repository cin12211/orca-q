# Quickstart: Standardise Storage Layer

**Feature**: 021-standardize-storage-layer  
**Generated**: 2026-04-17

---

## How to Use the Storage Layer from a Store

### Before (current pattern)

```ts
// core/stores/useWorkspacesStore.ts — OLD
const loadPersistData = async () => {
  const load = await window.workspaceApi.getAll(); // ← global, untestable
  workspaces.value = load;
};
```

### After (new pattern)

```ts
// core/stores/useWorkspacesStore.ts — NEW
import { createStorageApis } from '~/core/storage';

const storage = createStorageApis();

const loadPersistData = async () => {
  workspaces.value = await storage.workspaceStorage.getAll();
};

const createWorkspace = async (ws: Workspace) => {
  const created = await storage.workspaceStorage.create(ws);
  workspaces.value.push(created);
};

const deleteWorkspace = async (id: string) => {
  await storage.workspaceStorage.delete(id); // cascade handled in WorkspaceStorage
  await loadPersistData();
};
```

---

## How to Add a New Persisted Entity

### Step 1 — Create the entity type file

```ts
// core/types/entities/order.entity.ts
export interface Order {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}
```

Add to `core/types/entities/index.ts`:
```ts
export type { Order } from './order.entity';
```

### Step 2 — Create the IDB storage class

```ts
// core/storage/entities/OrderStorage.ts
import { IDBStorage } from '../base/IDBStorage';
import type { Order } from '~/core/types/entities';

class OrderIDBStorage extends IDBStorage<Order> {
  readonly name = 'orderIDB';
  protected readonly storeName = 'orders';

  // Domain-specific methods
  async getByWorkspaceId(wsId: string): Promise<Order[]> {
    return this.getMany({ workspaceId: wsId } as Partial<Order>);
  }
}

export const orderStorage = new OrderIDBStorage();
```

### Step 3 — Register in the factory

```ts
// core/storage/factory.ts
import { orderStorage } from './entities/OrderStorage';

// Add to StorageApis return:
return {
  ...existingApis,
  orderStorage,
};
```

### Step 4 — Add to `StorageApis` type

```ts
// core/storage/types.ts
import type { OrderIDBStorage } from './entities/OrderStorage';

export interface StorageApis {
  ...existing...
  orderStorage: OrderIDBStorage;
}
```

That's it — 4 changes, no store files modified during setup.

### Step 5 (optional) — Create the SQLite class for Electron

```ts
// electron/persist/entities/OrderSQLiteStorage.ts
import { SQLite3Storage } from '../SQLite3Storage';
import type { Order } from '../../../core/types/entities';

export class OrderSQLiteStorage extends SQLite3Storage<Order> {
  readonly name = 'orders';
  readonly tableName = 'orders';

  toRow(order: Order) {
    return {
      id: order.id,
      workspace_id: order.workspaceId,
      name: order.name,
      created_at: order.createdAt,
      updated_at: order.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): Order {
    return {
      id: row.id as string,
      workspaceId: row.workspace_id as string,
      name: row.name as string,
      createdAt: row.created_at as string,
      updatedAt: (row.updated_at as string) ?? undefined,
    };
  }
}
```

---

## QueryBuilderState — Migration from localStorage

`QueryBuilderStateStorage.load(key)` automatically migrates from `localStorage`:

```ts
async load(key: string): Promise<QueryBuilderState | null> {
  // 1. Try IDB first
  const fromIDB = await this.getOne(key);
  if (fromIDB) return fromIDB;

  // 2. Fall back to localStorage (one-time migration)
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as QueryBuilderState;
  await this.upsert({ ...parsed, id: key });  // write to IDB
  localStorage.removeItem(key);               // remove from localStorage
  return parsed;
}
```

---

## Running Storage Tests

Storage classes are tested without Pinia, Vue, or a browser:

```ts
// test/unit/core/storage/base/IDBStorage.spec.ts
import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';              // in-memory IDB for tests
import { WorkspaceStorage } from '~/core/storage/entities/WorkspaceStorage';

describe('WorkspaceStorage', () => {
  let storage: WorkspaceStorage;

  beforeEach(() => {
    storage = new WorkspaceStorage();
  });

  it('creates and retrieves a workspace', async () => {
    const ws = { id: '1', icon: '🐋', name: 'Test', createdAt: new Date().toISOString() };
    await storage.create(ws);
    const found = await storage.getOne('1');
    expect(found?.name).toBe('Test');
  });

  it('getAll returns sorted by createdAt', async () => {
    // ...
  });
});
```

---

## File Paths at a Glance

```
core/
├── types/entities/
│   ├── workspace.entity.ts      ← Workspace interface
│   ├── connection.entity.ts     ← Connection interface
│   ├── ... (9 total)
│   └── index.ts                 ← re-exports all
└── storage/
    ├── base/
    │   ├── BaseStorage.ts       ← abstract class
    │   └── IDBStorage.ts        ← localforage implementation
    ├── entities/
    │   ├── WorkspaceStorage.ts  ← extends IDBStorage<Workspace>
    │   ├── ConnectionStorage.ts
    │   ├── WorkspaceStateStorage.ts
    │   ├── TabViewStorage.ts
    │   ├── QuickQueryLogStorage.ts
    │   ├── RowQueryFileStorage.ts
    │   ├── EnvironmentTagStorage.ts
    │   ├── AppConfigStorage.ts
    │   ├── AgentStateStorage.ts
    │   ├── QueryBuilderStateStorage.ts  ← includes localStorage migration
    │   └── index.ts
    ├── factory.ts               ← createStorageApis()
    ├── types.ts                 ← StorageApis interface
    └── index.ts                 ← public exports

electron/persist/
├── SQLite3Storage.ts            ← abstract SQLite base class
├── db.ts                        ← better-sqlite3 singleton
├── schema.ts                    ← TypeScript table interfaces
├── entities/
│   ├── WorkspaceSQLiteStorage.ts
│   ├── ConnectionSQLiteStorage.ts
│   └── ... (9 total)
├── migration/
│   ├── runner.ts                ← runMigrations(db)
│   └── versions/
│       ├── v001-initial-schema.ts
│       └── v002-migrate-electron-store.ts
└── store.ts                     ← REWRITTEN: routes to SQLite entities
```
