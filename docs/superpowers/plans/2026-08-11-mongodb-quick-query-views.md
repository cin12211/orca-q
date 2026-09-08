# MongoDB Quick Query Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give MongoDB connections their own Quick Query navigation — a
database → collection sidebar tree, a Database Overview tab listing
collections, and a Collection Detail tab with Table/List/Object List
display modes — without adding any MongoDB branch into the existing SQL
Quick Query components.

**Architecture:** All new code lives in two new flat sub-modules:
`components/modules/quick-query/mongodb/` (views) and
`components/modules/management/schemas/mongodb/` (sidebar tree). Both are
wired in at the same seams the codebase already uses per connection family
(tab-type enum, `useTabManagement`, `PrimarySideBar`), mirroring the
existing Redis integration. Reads reuse the existing
`server/api/mongodb/quick-query.post.ts` endpoint; a new
`server/api/mongodb/collections.post.ts` lists collections for the tree and
the Database Overview grid.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup lang="ts">`, Pinia, AG Grid via
`BaseDataGrid`, MongoDB Node driver, Vitest.

## Global Constraints

- Never add a MongoDB branch inside `QuickQuery.vue`, `TableOverview.vue`,
  `ViewOverview.vue`, `FunctionOverview.vue`, `FunctionDetail.vue`,
  `useTableQueryBuilder.ts`, or the SQL schema tree
  (`components/modules/management/schemas/hooks/useSchemaTreeData.ts`).
  MongoDB gets sibling files, not branches in SQL files.
  See `docs/superpowers/specs/2026-08-11-mongodb-quick-query-views-design.md`.
  New Mongo components must not import `QuickQuery.vue`,
  `QuickQueryControlBar.vue`, or their hooks — mirror the layout/classes
  instead of extracting a shared base (out of scope this phase).
- This phase is **read-only** for documents: Table/List/Object List views
  display data; insert/update/delete UI is not built in this plan (the
  mutation server endpoint from the prior MongoDB Quick Query foundation
  work stays unused by the UI for now).
- One database per MongoDB connection (matches the existing connection
  form): the sidebar tree root is the connection's configured `database`;
  it is not a multi-database browser.
- `_id` is always the row/document identity; never a grid row offset.
- Preserve all SQL and Redis behavior. Run `bun run typecheck` after every
  task; run `bun vitest --run --project unit` (and `--project nuxt` for
  component/composable tests) before considering a task done.

---

### Task 1: Add MongoDB tab types and capability wiring

**Files:**

- Modify: `core/types/entities/tab-view.entity.ts`
- Modify: `core/constants/connection-capabilities.ts`
- Test: `test/unit/core/constants/connection-capabilities.spec.ts`

**Interfaces:**

- Produces: `TabViewType.MongoDatabaseOverview`, `TabViewType.MongoCollectionDetail`, `MongoDatabaseOverviewMetadata`, `MongoCollectionDetailMetadata` (both exported from `tab-view.entity.ts`) — every later task that opens or renders a Mongo tab uses these exact names.

- [ ] **Step 1: Write the failing test**

Add to `test/unit/core/constants/connection-capabilities.spec.ts`:

```ts
it('exposes MongoDB database and collection tab types', () => {
  const profile = getConnectionCapabilityProfile({
    type: DatabaseClientType.MONGODB,
  });

  expect(profile.allowedTabTypes).toContain(TabViewType.MongoDatabaseOverview);
  expect(profile.allowedTabTypes).toContain(TabViewType.MongoCollectionDetail);
  expect(profile.allowedTabTypes).not.toContain(TabViewType.TableOverview);
});
```

(Add the needed `TabViewType` and `getConnectionCapabilityProfile`/`DatabaseClientType` imports at the top of the file if not already present — check the existing imports first.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest --run --project unit test/unit/core/constants/connection-capabilities.spec.ts`
Expected: FAIL — `TabViewType.MongoDatabaseOverview` is `undefined`, or the `toContain` assertion fails.

- [ ] **Step 3: Implement the enum and metadata types**

In `core/types/entities/tab-view.entity.ts`, add to the `TabViewType` enum (after `RedisPubSub`):

```ts
  MongoDatabaseOverview = 'MongoDatabaseOverview',
  MongoCollectionDetail = 'MongoCollectionDetail',
```

Add new metadata interfaces after `RedisPubSubMetadata`:

```ts
export interface MongoDatabaseOverviewMetadata extends BaseTabMetadata {
  type: TabViewType.MongoDatabaseOverview;
  databaseName: string;
}

export interface MongoCollectionDetailMetadata extends BaseTabMetadata {
  type: TabViewType.MongoCollectionDetail;
  databaseName: string;
  collectionName: string;
}
```

Add both to the `TabMetadata` union:

```ts
export type TabMetadata =
  | TableDetailMetadata
  | ViewDetailMetadata
  | FunctionDetailMetadata
  | ErdDetailMetadata
  | CodeQueryMetadata
  | AgentChatMetadata
  | RedisBrowserMetadata
  | RedisPubSubMetadata
  | MongoDatabaseOverviewMetadata
  | MongoCollectionDetailMetadata
  | BaseTabMetadata;
```

- [ ] **Step 4: Update the capability registry**

In `core/constants/connection-capabilities.ts`, replace the `MONGODB_TAB_TYPES` array:

```ts
const MONGODB_TAB_TYPES = [
  TabViewType.MongoDatabaseOverview,
  TabViewType.MongoCollectionDetail,
  TabViewType.Connection,
  TabViewType.Explorer,
  TabViewType.AgentChat,
] as const;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun vitest --run --project unit test/unit/core/constants/connection-capabilities.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/types/entities/tab-view.entity.ts core/constants/connection-capabilities.ts test/unit/core/constants/connection-capabilities.spec.ts
git commit -m "feat(mongodb): add MongoDatabaseOverview and MongoCollectionDetail tab types"
```

---

### Task 2: Pure view-building utilities (column defs, preview fields)

**Files:**

- Create: `components/modules/quick-query/mongodb/utils/buildMongoColumnDefs.ts`
- Create: `components/modules/quick-query/mongodb/utils/buildMongoPreviewFields.ts`
- Create: `components/modules/quick-query/mongodb/utils/index.ts`
- Create: `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`
- Create: `components/modules/quick-query/mongodb/types/index.ts`
- Test: `test/unit/components/modules/quick-query/mongodb/buildMongoColumnDefs.spec.ts`
- Test: `test/unit/components/modules/quick-query/mongodb/buildMongoPreviewFields.spec.ts`

**Interfaces:**

- Produces: `MongoDocument` (`{ _id: string; [key: string]: unknown }`), `MongoCollectionSummary` (`{ name: string; documentCount: number }`), `MongoCollectionViewMode` (`'table' | 'list' | 'object-list'`) from `mongodb/types`; `buildMongoColumnDefs(documents: MongoDocument[]): ColDef[]` and `buildMongoPreviewFields(document: MongoDocument, maxFields?: number): { key: string; value: unknown }[]` from `mongodb/utils`.

- [ ] **Step 1: Write the failing tests**

`test/unit/components/modules/quick-query/mongodb/buildMongoColumnDefs.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMongoColumnDefs } from '~/components/modules/quick-query/mongodb/utils/buildMongoColumnDefs';

describe('buildMongoColumnDefs', () => {
  it('puts _id first and orders remaining keys by first appearance', () => {
    const columns = buildMongoColumnDefs([
      { _id: '1', name: 'Alice', age: 30 },
      { _id: '2', name: 'Bob', email: 'bob@example.com' },
    ]);

    expect(columns.map(col => col.field)).toEqual([
      '_id',
      'name',
      'age',
      'email',
    ]);
  });

  it('stringifies object and array values for cell display', () => {
    const columns = buildMongoColumnDefs([
      { _id: '1', tags: ['a', 'b'], address: { city: 'Hanoi' } },
    ]);

    const tagsCol = columns.find(col => col.field === 'tags');
    const rowValue = tagsCol?.valueGetter?.({
      data: { tags: ['a', 'b'] },
    } as any);
    expect(rowValue).toBe('["a","b"]');
  });

  it('returns just the _id column for an empty document list', () => {
    expect(buildMongoColumnDefs([])).toEqual([
      { field: '_id', headerName: '_id' },
    ]);
  });
});
```

`test/unit/components/modules/quick-query/mongodb/buildMongoPreviewFields.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMongoPreviewFields } from '~/components/modules/quick-query/mongodb/utils/buildMongoPreviewFields';

describe('buildMongoPreviewFields', () => {
  it('returns up to maxFields scalar top-level fields, excluding _id', () => {
    const fields = buildMongoPreviewFields(
      { _id: '1', name: 'Alice', age: 30, city: 'Hanoi', country: 'VN' },
      3
    );

    expect(fields).toEqual([
      { key: 'name', value: 'Alice' },
      { key: 'age', value: 30 },
      { key: 'city', value: 'Hanoi' },
    ]);
  });

  it('skips object/array values', () => {
    const fields = buildMongoPreviewFields(
      { _id: '1', name: 'Alice', address: { city: 'Hanoi' }, tags: ['a'] },
      3
    );

    expect(fields).toEqual([{ key: 'name', value: 'Alice' }]);
  });

  it('defaults maxFields to 3', () => {
    const fields = buildMongoPreviewFields({
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    });

    expect(fields).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun vitest --run --project unit test/unit/components/modules/quick-query/mongodb/`
Expected: FAIL — modules under `components/modules/quick-query/mongodb/utils/` do not exist yet.

- [ ] **Step 3: Write the types**

`components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`:

```ts
export interface MongoDocument {
  _id: string;
  [key: string]: unknown;
}

export interface MongoCollectionSummary {
  name: string;
  documentCount: number;
}

export type MongoCollectionViewMode = 'table' | 'list' | 'object-list';
```

`components/modules/quick-query/mongodb/types/index.ts`:

```ts
export * from './mongo-quick-query.types';
```

- [ ] **Step 4: Implement the utilities**

`components/modules/quick-query/mongodb/utils/buildMongoColumnDefs.ts`:

```ts
import type { ColDef } from 'ag-grid-community';
import type { MongoDocument } from '../types';

function formatCellValue(value: unknown): unknown {
  if (value !== null && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

export function buildMongoColumnDefs(documents: MongoDocument[]): ColDef[] {
  const orderedFields: string[] = [];
  const seen = new Set<string>();

  for (const document of documents) {
    for (const key of Object.keys(document)) {
      if (key === '_id' || seen.has(key)) continue;
      seen.add(key);
      orderedFields.push(key);
    }
  }

  const idColumn: ColDef = { field: '_id', headerName: '_id' };
  const otherColumns: ColDef[] = orderedFields.map(field => ({
    field,
    headerName: field,
    valueGetter: params => formatCellValue(params.data?.[field]),
  }));

  return [idColumn, ...otherColumns];
}
```

`components/modules/quick-query/mongodb/utils/buildMongoPreviewFields.ts`:

```ts
import type { MongoDocument } from '../types';

export function buildMongoPreviewFields(
  document: MongoDocument,
  maxFields = 3
): { key: string; value: unknown }[] {
  const fields: { key: string; value: unknown }[] = [];

  for (const [key, value] of Object.entries(document)) {
    if (key === '_id') continue;
    if (value !== null && typeof value === 'object') continue;
    fields.push({ key, value });
    if (fields.length >= maxFields) break;
  }

  return fields;
}
```

`components/modules/quick-query/mongodb/utils/index.ts`:

```ts
export * from './buildMongoColumnDefs';
export * from './buildMongoPreviewFields';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun vitest --run --project unit test/unit/components/modules/quick-query/mongodb/`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add components/modules/quick-query/mongodb/utils components/modules/quick-query/mongodb/types test/unit/components/modules/quick-query/mongodb
git commit -m "feat(mongodb): add pure column-def and preview-field builders for Quick Query views"
```

---

### Task 3: List collections in a database (server)

**Files:**

- Modify: `server/infrastructure/nosql/mongodb/mongodb-quick-query.ts`
- Create: `server/api/mongodb/collections.post.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`

**Interfaces:**

- Consumes: `withMongoDatabase` from `mongodb.client.ts` (existing, unchanged).
- Produces: `listMongoCollections(database: MongoCollectionsSource): Promise<{ name: string; documentCount: number }[]>` from `mongodb-quick-query.ts`, and the `POST /api/mongodb/collections` endpoint returning `{ collections: { name: string; documentCount: number }[] }`.

- [ ] **Step 1: Write the failing test**

Add to `test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`:

```ts
import { listMongoCollections } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';

describe('listMongoCollections', () => {
  it('returns each collection name with its document count, sorted by name', async () => {
    const fakeDatabase = {
      listCollections: () => ({
        toArray: async () => [{ name: 'users' }, { name: 'orders' }],
      }),
      collection: (name: string) => ({
        countDocuments: async () => (name === 'users' ? 42 : 7),
      }),
    };

    const collections = await listMongoCollections(fakeDatabase as any);

    expect(collections).toEqual([
      { name: 'orders', documentCount: 7 },
      { name: 'users', documentCount: 42 },
    ]);
  });

  it('returns an empty array when the database has no collections', async () => {
    const fakeDatabase = {
      listCollections: () => ({ toArray: async () => [] }),
      collection: () => ({ countDocuments: async () => 0 }),
    };

    expect(await listMongoCollections(fakeDatabase as any)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest --run --project unit test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`
Expected: FAIL — `listMongoCollections` is not exported.

- [ ] **Step 3: Implement `listMongoCollections`**

Add to `server/infrastructure/nosql/mongodb/mongodb-quick-query.ts`:

```ts
interface MongoCollectionsSource {
  listCollections(): { toArray(): Promise<{ name: string }[]> };
  collection(name: string): { countDocuments(): Promise<number> };
}

export async function listMongoCollections(
  database: MongoCollectionsSource
): Promise<{ name: string; documentCount: number }[]> {
  const collectionInfos = await database.listCollections().toArray();
  const collections = await Promise.all(
    collectionInfos.map(async info => ({
      name: info.name,
      documentCount: await database.collection(info.name).countDocuments(),
    }))
  );

  return collections.sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest --run --project unit test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`
Expected: PASS

- [ ] **Step 5: Add the endpoint**

`server/api/mongodb/collections.post.ts`:

```ts
import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { listMongoCollections } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  const collections = await withMongoDatabase(body, database =>
    listMongoCollections(database)
  );

  return { collections };
});
```

No new test file for the endpoint itself in this task — it is a thin
wrapper over `listMongoCollections` (unit-tested above) and
`withMongoDatabase` (already covered by the connection health-check path);
covering it end-to-end belongs in the project's Mongo fixture integration
suite, not this plan.

- [ ] **Step 6: Run the full Mongo unit suite and typecheck**

Run: `bun vitest --run --project unit test/unit/server/infrastructure/nosql/mongodb/` and `bun run typecheck`
Expected: PASS / no type errors

- [ ] **Step 7: Commit**

```bash
git add server/infrastructure/nosql/mongodb/mongodb-quick-query.ts server/api/mongodb/collections.post.ts test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts
git commit -m "feat(mongodb): add collections.post endpoint listing collections with document counts"
```

---

### Task 4: Data-fetching hooks for Database Overview and Collection Detail

**Files:**

- Create: `components/modules/quick-query/mongodb/hooks/useMongoDatabaseCollections.ts`
- Create: `components/modules/quick-query/mongodb/hooks/useMongoCollectionQuery.ts`
- Create: `components/modules/quick-query/mongodb/hooks/index.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/useMongoDatabaseCollections.test.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/useMongoCollectionQuery.test.ts`

**Interfaces:**

- Consumes: `getConnectionParams` from `core/helpers/connection-helper.ts` (existing), `MongoCollectionSummary`/`MongoDocument` from `mongodb/types` (Task 2), `POST /api/mongodb/collections` (Task 3), `POST /api/mongodb/quick-query` (existing).
- Produces:

  - `useMongoDatabaseCollections(params: { connection: Ref<Connection | undefined> }): { collections: Ref<MongoCollectionSummary[]>; isLoading: Ref<boolean>; error: Ref<string | undefined>; fetchCollections: () => Promise<void> }`
  - `useMongoCollectionQuery(params: { connection: Ref<Connection | undefined>; collectionName: Ref<string> }): { documents: Ref<MongoDocument[]>; total: Ref<number>; queryTime: Ref<number>; isLoading: Ref<boolean>; error: Ref<string | undefined>; limit: Ref<number>; skip: Ref<number>; fetchDocuments: () => Promise<void>; onNextPage: () => void; onPreviousPage: () => void; onRefresh: () => void }`

- [ ] **Step 1: Write the failing tests**

`test/nuxt/components/modules/quick-query/mongodb/useMongoDatabaseCollections.test.ts`:

```ts
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useMongoDatabaseCollections } from '~/components/modules/quick-query/mongodb/hooks/useMongoDatabaseCollections';

describe('useMongoDatabaseCollections', () => {
  it('fetches collections for the given connection and stores the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      collections: [{ name: 'users', documentCount: 3 }],
    });
    vi.stubGlobal('$fetch', fetchMock);

    const connection = ref({ id: 'c1', database: 'shop' } as any);
    const { collections, isLoading, fetchCollections } =
      useMongoDatabaseCollections({ connection });

    await fetchCollections();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mongodb/collections',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ database: 'shop' }),
      })
    );
    expect(collections.value).toEqual([{ name: 'users', documentCount: 3 }]);
    expect(isLoading.value).toBe(false);
  });

  it('records an error message when the request fails', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn().mockRejectedValue(new Error('connection refused'))
    );

    const { error, fetchCollections } = useMongoDatabaseCollections({
      connection: ref({ id: 'c1', database: 'shop' } as any),
    });

    await fetchCollections();

    expect(error.value).toBe('connection refused');
  });
});
```

`test/nuxt/components/modules/quick-query/mongodb/useMongoCollectionQuery.test.ts`:

```ts
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useMongoCollectionQuery } from '~/components/modules/quick-query/mongodb/hooks/useMongoCollectionQuery';

describe('useMongoCollectionQuery', () => {
  it('fetches the first page of documents for the collection', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      documents: [{ _id: '1', name: 'Alice' }],
      total: 1,
      queryTime: 2.5,
    });
    vi.stubGlobal('$fetch', fetchMock);

    const { documents, total, fetchDocuments } = useMongoCollectionQuery({
      connection: ref({ id: 'c1', database: 'shop' } as any),
      collectionName: ref('users'),
    });

    await fetchDocuments();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mongodb/quick-query',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          collection: 'users',
          skip: 0,
          limit: 100,
        }),
      })
    );
    expect(documents.value).toEqual([{ _id: '1', name: 'Alice' }]);
    expect(total.value).toBe(1);
  });

  it('advances skip by limit on next page and re-fetches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ documents: [], total: 0, queryTime: 0 });
    vi.stubGlobal('$fetch', fetchMock);

    const { skip, onNextPage } = useMongoCollectionQuery({
      connection: ref({ id: 'c1', database: 'shop' } as any),
      collectionName: ref('users'),
    });

    onNextPage();
    await Promise.resolve();

    expect(skip.value).toBe(100);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mongodb/quick-query',
      expect.objectContaining({ body: expect.objectContaining({ skip: 100 }) })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/`
Expected: FAIL — hook modules do not exist yet.

- [ ] **Step 3: Implement `useMongoDatabaseCollections`**

```ts
import { ref, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoCollectionSummary } from '../types';

export function useMongoDatabaseCollections(params: {
  connection: Ref<Connection | undefined>;
}) {
  const collections = ref<MongoCollectionSummary[]>([]);
  const isLoading = ref(false);
  const error = ref<string | undefined>();

  const fetchCollections = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<{ collections: MongoCollectionSummary[] }>(
        '/api/mongodb/collections',
        {
          method: 'POST',
          body: getConnectionParams(params.connection.value),
        }
      );
      collections.value = response.collections;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  return { collections, isLoading, error, fetchCollections };
}
```

- [ ] **Step 4: Implement `useMongoCollectionQuery`**

```ts
import { ref, type Ref } from 'vue';
import { DEFAULT_QUERY_SIZE } from '~/core/constants';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import type { MongoDocument } from '../types';

interface MongoQuickQueryResponse {
  documents: MongoDocument[];
  total: number;
  queryTime: number;
}

export function useMongoCollectionQuery(params: {
  connection: Ref<Connection | undefined>;
  collectionName: Ref<string>;
}) {
  const documents = ref<MongoDocument[]>([]);
  const total = ref(0);
  const queryTime = ref(0);
  const isLoading = ref(false);
  const error = ref<string | undefined>();
  const limit = ref(DEFAULT_QUERY_SIZE);
  const skip = ref(0);

  const fetchDocuments = async () => {
    isLoading.value = true;
    error.value = undefined;
    try {
      const response = await $fetch<MongoQuickQueryResponse>(
        '/api/mongodb/quick-query',
        {
          method: 'POST',
          body: {
            ...getConnectionParams(params.connection.value),
            collection: params.collectionName.value,
            skip: skip.value,
            limit: limit.value,
          },
        }
      );
      documents.value = response.documents;
      total.value = response.total;
      queryTime.value = response.queryTime;
    } catch (fetchError) {
      error.value =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  };

  const onNextPage = () => {
    skip.value += limit.value;
    fetchDocuments();
  };

  const onPreviousPage = () => {
    skip.value = Math.max(0, skip.value - limit.value);
    fetchDocuments();
  };

  const onRefresh = () => {
    fetchDocuments();
  };

  return {
    documents,
    total,
    queryTime,
    isLoading,
    error,
    limit,
    skip,
    fetchDocuments,
    onNextPage,
    onPreviousPage,
    onRefresh,
  };
}
```

Check `core/constants/index.ts` exports `DEFAULT_QUERY_SIZE` (it is already
imported this way in `QuickQuery.vue:5`) — reuse the existing constant, do
not redefine a new default page size.

- [ ] **Step 5: Barrel export**

`components/modules/quick-query/mongodb/hooks/index.ts`:

```ts
export * from './useMongoDatabaseCollections';
export * from './useMongoCollectionQuery';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add components/modules/quick-query/mongodb/hooks test/nuxt/components/modules/quick-query/mongodb
git commit -m "feat(mongodb): add useMongoDatabaseCollections and useMongoCollectionQuery hooks"
```

---

### Task 5: View-mode switcher and toolbar

**Files:**

- Create: `components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue`
- Create: `components/modules/quick-query/mongodb/components/MongoQuickQueryControlBar.vue`
- Create: `components/modules/quick-query/mongodb/components/index.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts`

**Interfaces:**

- Consumes: `MongoCollectionViewMode` from `mongodb/types` (Task 2).
- Produces: `MongoViewModeSwitcher` (props `modelValue: MongoCollectionViewMode`; emits `update:modelValue: [MongoCollectionViewMode]`), `MongoQuickQueryControlBar` (props `totalRows: number; currentTotalRows: number; limit: number; skip: number; isLoading: boolean; viewMode: MongoCollectionViewMode`; emits `onNextPage`, `onPreviousPage`, `onRefresh`, `update:viewMode: [MongoCollectionViewMode]`) — Task 6/7 wire these directly.

- [ ] **Step 1: Write the failing test**

`test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoViewModeSwitcher from '~/components/modules/quick-query/mongodb/components/MongoViewModeSwitcher.vue';

describe('MongoViewModeSwitcher', () => {
  it('emits update:modelValue with the clicked mode', async () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: 'table' },
    });

    await wrapper.get('[data-testid="mongo-view-mode-list"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['list']);
  });

  it('marks the active mode button', () => {
    const wrapper = mount(MongoViewModeSwitcher, {
      props: { modelValue: 'object-list' },
    });

    expect(
      wrapper
        .get('[data-testid="mongo-view-mode-object-list"]')
        .attributes('aria-pressed')
    ).toBe('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts`
Expected: FAIL — component file does not exist.

- [ ] **Step 3: Implement `MongoViewModeSwitcher.vue`**

Styled as a segmented control matching the existing Data/Structure/Erd
tab-strip look (`components/ui` button/tabs primitives + the same spacing
classes `QuickQueryControlBar.vue` uses for its tab-strip), without
importing that component:

```vue
<script setup lang="ts">
import type { MongoCollectionViewMode } from '../types';

defineProps<{ modelValue: MongoCollectionViewMode }>();
const emit = defineEmits<{ 'update:modelValue': [MongoCollectionViewMode] }>();

const MODES: { value: MongoCollectionViewMode; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'list', label: 'List' },
  { value: 'object-list', label: 'Object List' },
];
</script>

<template>
  <div class="flex items-center gap-1 rounded-md border p-0.5">
    <button
      v-for="mode in MODES"
      :key="mode.value"
      type="button"
      :data-testid="`mongo-view-mode-${mode.value}`"
      :aria-pressed="modelValue === mode.value"
      class="px-2.5 py-1 text-sm rounded-sm transition-colors"
      :class="
        modelValue === mode.value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      "
      @click="emit('update:modelValue', mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts`
Expected: PASS

- [ ] **Step 5: Implement `MongoQuickQueryControlBar.vue`** (no new test — thin presentational wrapper, exercised indirectly by Task 6's `MongoCollectionDetail` test)

```vue
<script setup lang="ts">
import { Button } from '~/components/ui/button';
import type { MongoCollectionViewMode } from '../types';
import MongoViewModeSwitcher from './MongoViewModeSwitcher.vue';

const props = defineProps<{
  totalRows: number;
  currentTotalRows: number;
  limit: number;
  skip: number;
  isLoading: boolean;
  viewMode: MongoCollectionViewMode;
}>();

const emit = defineEmits<{
  onNextPage: [];
  onPreviousPage: [];
  onRefresh: [];
  'update:viewMode': [MongoCollectionViewMode];
}>();
</script>

<template>
  <div class="flex items-center justify-between gap-2 px-1 py-1.5">
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        :disabled="props.isLoading"
        @click="emit('onRefresh')"
      >
        <Icon name="hugeicons:refresh" />
      </Button>
      <span class="text-sm text-muted-foreground">
        {{ props.skip + 1 }}-{{ props.skip + props.currentTotalRows }} of
        {{ props.totalRows }}
      </span>
      <Button
        variant="ghost"
        size="icon"
        :disabled="props.skip === 0"
        @click="emit('onPreviousPage')"
      >
        <Icon name="hugeicons:arrow-left-01" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :disabled="props.skip + props.limit >= props.totalRows"
        @click="emit('onNextPage')"
      >
        <Icon name="hugeicons:arrow-right-01" />
      </Button>
    </div>

    <MongoViewModeSwitcher
      :model-value="props.viewMode"
      @update:model-value="mode => emit('update:viewMode', mode)"
    />
  </div>
</template>
```

Verify `Button` is importable from `~/components/ui/button` and `Icon` is a
globally available component (both already used across `quick-query/`
components — check one existing usage, e.g. in `QuickQueryControlBar.vue`,
to confirm the exact import path before using it here).

- [ ] **Step 6: Barrel export**

`components/modules/quick-query/mongodb/components/index.ts`:

```ts
export { default as MongoViewModeSwitcher } from './MongoViewModeSwitcher.vue';
export { default as MongoQuickQueryControlBar } from './MongoQuickQueryControlBar.vue';
```

- [ ] **Step 7: Run typecheck and commit**

Run: `bun run typecheck`

```bash
git add components/modules/quick-query/mongodb/components test/nuxt/components/modules/quick-query/mongodb/MongoViewModeSwitcher.test.ts
git commit -m "feat(mongodb): add view-mode switcher and Quick Query toolbar for Mongo"
```

---

### Task 6: Collection Detail — three view components and container

**Files:**

- Create: `components/modules/quick-query/mongodb/components/MongoCollectionTableView.vue`
- Create: `components/modules/quick-query/mongodb/components/MongoCollectionListView.vue`
- Create: `components/modules/quick-query/mongodb/components/MongoCollectionObjectListView.vue`
- Create: `components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue`
- Create: `components/modules/quick-query/mongodb/containers/index.ts`
- Modify: `components/modules/quick-query/mongodb/components/index.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts`

**Interfaces:**

- Consumes: `useMongoCollectionQuery` (Task 4), `buildMongoColumnDefs`/`buildMongoPreviewFields` (Task 2), `MongoQuickQueryControlBar` (Task 5), `BaseDataGrid` (existing, `components/base/data-grid/BaseDataGrid.vue`).
- Produces: `MongoCollectionDetail` (props `connectionId: string; workspaceId: string; databaseName: string; collectionName: string`) — Task 8's route page renders this directly for `TabViewType.MongoCollectionDetail` tabs.

- [ ] **Step 1: Write the failing test**

`test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoCollectionDetail from '~/components/modules/quick-query/mongodb/containers/MongoCollectionDetail.vue';

vi.stubGlobal(
  '$fetch',
  vi.fn().mockResolvedValue({
    documents: [{ _id: '1', name: 'Alice' }],
    total: 1,
    queryTime: 1,
  })
);

describe('MongoCollectionDetail', () => {
  it('renders the table view by default and switches to list view on mode change', async () => {
    const wrapper = mount(MongoCollectionDetail, {
      props: {
        connectionId: 'c1',
        workspaceId: 'w1',
        databaseName: 'shop',
        collectionName: 'users',
      },
    });
    await flushPromises();

    expect(
      wrapper.findComponent({ name: 'MongoCollectionTableView' }).exists()
    ).toBe(true);

    await wrapper.get('[data-testid="mongo-view-mode-list"]').trigger('click');

    expect(
      wrapper.findComponent({ name: 'MongoCollectionTableView' }).exists()
    ).toBe(false);
    expect(
      wrapper.findComponent({ name: 'MongoCollectionListView' }).exists()
    ).toBe(true);
  });
});
```

Confirm `flushPromises` is available the same way other Quick Query nuxt
tests import it (check an existing `test/nuxt/components/modules/quick-query/**/*.test.ts`
file for the import source and mirror it exactly).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts`
Expected: FAIL — `MongoCollectionDetail.vue` does not exist.

- [ ] **Step 3: Implement the three view components**

`MongoCollectionTableView.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import type { MongoDocument } from '../types';
import { buildMongoColumnDefs } from '../utils';

const props = defineProps<{ documents: MongoDocument[] }>();

const columnDefs = computed(() => buildMongoColumnDefs(props.documents));
</script>

<template>
  <BaseDataGrid
    class="h-full border rounded-md"
    :column-defs="columnDefs"
    :row-data="props.documents"
    :grid-options="{ getRowId: params => params.data._id }"
  />
</template>
```

`MongoCollectionListView.vue`:

```vue
<script setup lang="ts">
import type { MongoDocument } from '../types';
import { buildMongoPreviewFields } from '../utils';

const props = defineProps<{ documents: MongoDocument[] }>();
</script>

<template>
  <div class="h-full overflow-auto divide-y">
    <div
      v-for="document in props.documents"
      :key="document._id"
      class="flex items-center gap-4 px-3 py-2 text-sm"
    >
      <span class="font-mono text-muted-foreground shrink-0">{{
        document._id
      }}</span>
      <span
        v-for="field in buildMongoPreviewFields(document)"
        :key="field.key"
        class="truncate"
      >
        <span class="text-muted-foreground">{{ field.key }}:</span>
        {{ field.value }}
      </span>
    </div>
  </div>
</template>
```

`MongoCollectionObjectListView.vue`:

```vue
<script setup lang="ts">
import type { MongoDocument } from '../types';

const props = defineProps<{ documents: MongoDocument[] }>();
</script>

<template>
  <div class="h-full overflow-auto flex flex-col gap-2 p-2">
    <pre
      v-for="document in props.documents"
      :key="document._id"
      class="text-xs rounded-md border bg-muted/40 p-2 overflow-auto"
      >{{ JSON.stringify(document, null, 2) }}</pre
    >
  </div>
</template>
```

- [ ] **Step 4: Implement `MongoCollectionDetail.vue`**

```vue
<script setup lang="ts">
import { ref, toRef, watch } from 'vue';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import MongoCollectionListView from '../components/MongoCollectionListView.vue';
import MongoCollectionObjectListView from '../components/MongoCollectionObjectListView.vue';
import MongoCollectionTableView from '../components/MongoCollectionTableView.vue';
import MongoQuickQueryControlBar from '../components/MongoQuickQueryControlBar.vue';
import { useMongoCollectionQuery } from '../hooks';
import type { MongoCollectionViewMode } from '../types';

const props = defineProps<{
  connectionId: string;
  workspaceId: string;
  databaseName: string;
  collectionName: string;
}>();

const connectionStore = useManagementConnectionStore();
const connection = toRef(connectionStore, 'selectedConnection');
const collectionName = toRef(props, 'collectionName');

const {
  documents,
  total,
  isLoading,
  limit,
  skip,
  fetchDocuments,
  onNextPage,
  onPreviousPage,
  onRefresh,
} = useMongoCollectionQuery({ connection, collectionName });

const viewMode = ref<MongoCollectionViewMode>('table');

watch(collectionName, fetchDocuments, { immediate: true });
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <MongoQuickQueryControlBar
      :total-rows="total"
      :current-total-rows="documents.length"
      :limit="limit"
      :skip="skip"
      :is-loading="isLoading"
      :view-mode="viewMode"
      @on-next-page="onNextPage"
      @on-previous-page="onPreviousPage"
      @on-refresh="onRefresh"
      @update:view-mode="mode => (viewMode = mode)"
    />

    <div class="flex-1 overflow-hidden px-1">
      <MongoCollectionTableView
        v-if="viewMode === 'table'"
        :documents="documents"
      />
      <MongoCollectionListView
        v-else-if="viewMode === 'list'"
        :documents="documents"
      />
      <MongoCollectionObjectListView v-else :documents="documents" />
    </div>
  </div>
</template>
```

- [ ] **Step 5: Barrel exports**

Add to `components/modules/quick-query/mongodb/components/index.ts`:

```ts
export { default as MongoCollectionTableView } from './MongoCollectionTableView.vue';
export { default as MongoCollectionListView } from './MongoCollectionListView.vue';
export { default as MongoCollectionObjectListView } from './MongoCollectionObjectListView.vue';
```

`components/modules/quick-query/mongodb/containers/index.ts`:

```ts
export { default as MongoCollectionDetail } from './MongoCollectionDetail.vue';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/modules/quick-query/mongodb/components components/modules/quick-query/mongodb/containers test/nuxt/components/modules/quick-query/mongodb/MongoCollectionDetail.test.ts
git commit -m "feat(mongodb): add Collection Detail container with Table/List/Object List views"
```

---

### Task 7: Database Overview container

**Files:**

- Create: `components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue`
- Modify: `components/modules/quick-query/mongodb/containers/index.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts`

**Interfaces:**

- Consumes: `useMongoDatabaseCollections` (Task 4), `BaseDataGrid` (existing), `useTabManagement` (Task 8 adds `openMongoCollectionTab` — this task's row-click handler calls it, so implement this task's component to accept the click handler already, and finish wiring once Task 8 lands; see Step 4 note).
- Produces: `MongoDatabaseOverview` (props `connectionId: string; workspaceId: string; databaseName: string`) — Task 8's route page renders this for `TabViewType.MongoDatabaseOverview` tabs.

- [ ] **Step 1: Write the failing test**

`test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoDatabaseOverview from '~/components/modules/quick-query/mongodb/containers/MongoDatabaseOverview.vue';

const openMongoCollectionTab = vi.fn();
vi.mock('~/core/composables/useTabManagement', () => ({
  useTabManagement: () => ({ openMongoCollectionTab }),
}));

vi.stubGlobal(
  '$fetch',
  vi.fn().mockResolvedValue({
    collections: [{ name: 'users', documentCount: 3 }],
  })
);

describe('MongoDatabaseOverview', () => {
  it('lists collections and opens a Collection Detail tab on row click', async () => {
    const wrapper = mount(MongoDatabaseOverview, {
      props: { connectionId: 'c1', workspaceId: 'w1', databaseName: 'shop' },
    });
    await flushPromises();

    const grid = wrapper.findComponent({ name: 'BaseDataGrid' });
    expect(grid.props('rowData')).toEqual([
      { name: 'users', documentCount: 3 },
    ]);

    grid.vm.$emit('rowClicked', { data: { name: 'users', documentCount: 3 } });

    expect(openMongoCollectionTab).toHaveBeenCalledWith({
      databaseName: 'shop',
      collectionName: 'users',
    });
  });
});
```

Check whether `BaseDataGrid` emits a `rowClicked` AG Grid event today (grep
its `defineEmits` block); if it does not yet forward that event, add
`rowClicked: [event: RowClickedEvent]` to its `defineEmits` and pass
`@row-clicked="emit('rowClicked', $event)"` on the underlying `AgGridVue` —
this is an additive emit on the shared grid primitive, not SQL-specific
logic, and every other grid consumer keeps working unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `MongoDatabaseOverview.vue`**

```vue
<script setup lang="ts">
import { toRef, watch, type ColDef } from 'vue';
import type { RowClickedEvent } from 'ag-grid-community';
import BaseDataGrid from '~/components/base/data-grid/BaseDataGrid.vue';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useMongoDatabaseCollections } from '../hooks';
import type { MongoCollectionSummary } from '../types';

const props = defineProps<{
  connectionId: string;
  workspaceId: string;
  databaseName: string;
}>();

const connectionStore = useManagementConnectionStore();
const { collections, fetchCollections } = useMongoDatabaseCollections({
  connection: toRef(connectionStore, 'selectedConnection'),
});
const { openMongoCollectionTab } = useTabManagement();

const columnDefs: ColDef[] = [
  { field: 'name', headerName: 'Collection' },
  { field: 'documentCount', headerName: 'Documents' },
];

const onRowClicked = (event: RowClickedEvent<MongoCollectionSummary>) => {
  if (!event.data) return;
  openMongoCollectionTab({
    databaseName: props.databaseName,
    collectionName: event.data.name,
  });
};

watch(() => props.databaseName, fetchCollections, { immediate: true });
</script>

<template>
  <div class="h-full w-full px-1">
    <BaseDataGrid
      class="h-full border rounded-md"
      :column-defs="columnDefs"
      :row-data="collections"
      @row-clicked="onRowClicked"
    />
  </div>
</template>
```

- [ ] **Step 4: Barrel export**

Add to `components/modules/quick-query/mongodb/containers/index.ts`:

```ts
export { default as MongoDatabaseOverview } from './MongoDatabaseOverview.vue';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts`
Expected: PASS — this will only go green once Task 8 has added
`openMongoCollectionTab` to `useTabManagement`, since the test mocks that
composable's shape. If Task 8 has not run yet, this is expected to fail on
the `toHaveBeenCalledWith` assertion only (the mock intercepts the import
regardless of the real composable, so it should actually still pass — the
mock fully replaces the module). Run it now; it must pass standalone.

- [ ] **Step 6: Commit**

```bash
git add components/modules/quick-query/mongodb/containers components/base/data-grid/BaseDataGrid.vue test/nuxt/components/modules/quick-query/mongodb/MongoDatabaseOverview.test.ts
git commit -m "feat(mongodb): add Database Overview container listing collections"
```

---

### Task 8: Tab dispatch and route

**Files:**

- Modify: `core/composables/useTabManagement.ts`
- Create: `pages/[workspaceId]/[connectionId]/mongodb/[tabViewId].vue`
- Test: `test/nuxt/core/composables/useTabManagement.test.ts`

**Interfaces:**

- Consumes: `TabViewType.MongoDatabaseOverview`/`MongoCollectionDetail` (Task 1), `MongoDatabaseOverview`/`MongoCollectionDetail` containers (Tasks 6-7).
- Produces: `openMongoDatabaseTab(params: { databaseName: string }): Promise<void>`, `openMongoCollectionTab(params: { databaseName: string; collectionName: string }): Promise<void>` on the object returned by `useTabManagement()`.

- [ ] **Step 1: Write the failing test**

`test/nuxt/core/composables/useTabManagement.test.ts` (check whether this
file already exists; if it does, add these two `it` blocks inside its
existing `describe`, otherwise create it following the setup pattern of a
neighboring composable test, e.g.
`test/nuxt/core/composables/usePreviewRelations.test.ts` — mock
`useTabViewsStore().ensureTab` the same way that file mocks its store):

```ts
it('resolveRouteNameForTabType routes Mongo tab types to the mongodb page', () => {
  expect(resolveRouteNameForTabType(TabViewType.MongoDatabaseOverview)).toBe(
    'workspaceId-connectionId-mongodb-tabViewId'
  );
  expect(resolveRouteNameForTabType(TabViewType.MongoCollectionDetail)).toBe(
    'workspaceId-connectionId-mongodb-tabViewId'
  );
});

it('openMongoDatabaseTab opens a MongoDatabaseOverview tab keyed by database name', async () => {
  const { openMongoDatabaseTab } = useTabManagement();

  await openMongoDatabaseTab({ databaseName: 'shop' });

  expect(ensureTabMock).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'mongo-database-shop',
      type: TabViewType.MongoDatabaseOverview,
      routeName: 'workspaceId-connectionId-mongodb-tabViewId',
      metadata: expect.objectContaining({
        type: TabViewType.MongoDatabaseOverview,
        databaseName: 'shop',
      }),
    })
  );
});

it('openMongoCollectionTab opens a MongoCollectionDetail tab keyed by database and collection', async () => {
  const { openMongoCollectionTab } = useTabManagement();

  await openMongoCollectionTab({
    databaseName: 'shop',
    collectionName: 'users',
  });

  expect(ensureTabMock).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'mongo-collection-shop-users',
      type: TabViewType.MongoCollectionDetail,
      metadata: expect.objectContaining({
        type: TabViewType.MongoCollectionDetail,
        databaseName: 'shop',
        collectionName: 'users',
      }),
    })
  );
});
```

Adapt the mock variable name (`ensureTabMock`) to whatever the existing
test file's `useTabViewsStore` mock is actually called — read the file
first and match its existing convention rather than introducing a second
one.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest --run --project nuxt test/nuxt/core/composables/useTabManagement.test.ts`
Expected: FAIL — `openMongoDatabaseTab`/`openMongoCollectionTab` undefined, Mongo case missing from `resolveRouteNameForTabType`.

- [ ] **Step 3: Update `resolveRouteNameForTabType`**

In `core/composables/useTabManagement.ts`:

```ts
export function resolveRouteNameForTabType(type: TabViewType): RoutesNamesList {
  switch (type) {
    case TabViewType.AgentChat:
      return 'workspaceId-connectionId-agent-tabViewId';
    case TabViewType.RedisBrowser:
    case TabViewType.RedisPubSub:
      return 'workspaceId-connectionId-redis-tabViewId' as RoutesNamesList;
    case TabViewType.MongoDatabaseOverview:
    case TabViewType.MongoCollectionDetail:
      return 'workspaceId-connectionId-mongodb-tabViewId' as RoutesNamesList;
    default:
      return 'workspaceId-connectionId-quick-query-tabViewId';
  }
}
```

- [ ] **Step 4: Add `openMongoDatabaseTab` and `openMongoCollectionTab`**

Add inside `useTabManagement`, after `openRedisTab`:

```ts
const openMongoDatabaseTab = async (params: { databaseName: string }) => {
  await openTab({
    id: `mongo-database-${params.databaseName}`,
    name: params.databaseName,
    icon: 'hugeicons:database-01',
    type: TabViewType.MongoDatabaseOverview,
    routeName: resolveRouteNameForTabType(TabViewType.MongoDatabaseOverview),
    routeParams: {
      tabViewId: `mongo-database-${params.databaseName}`,
    },
    metadata: {
      databaseName: params.databaseName,
    },
  });
};

const openMongoCollectionTab = async (params: {
  databaseName: string;
  collectionName: string;
}) => {
  await openTab({
    id: `mongo-collection-${params.databaseName}-${params.collectionName}`,
    name: params.collectionName,
    icon: 'hugeicons:grid-table',
    type: TabViewType.MongoCollectionDetail,
    routeName: resolveRouteNameForTabType(TabViewType.MongoCollectionDetail),
    routeParams: {
      tabViewId: `mongo-collection-${params.databaseName}-${params.collectionName}`,
    },
    metadata: {
      databaseName: params.databaseName,
      collectionName: params.collectionName,
    },
  });
};
```

Add both to the `return { ... }` block at the end of `useTabManagement`.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun vitest --run --project nuxt test/nuxt/core/composables/useTabManagement.test.ts`
Expected: PASS

- [ ] **Step 6: Add the route page**

`pages/[workspaceId]/[connectionId]/mongodb/[tabViewId].vue`:

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import {
  MongoCollectionDetail,
  MongoDatabaseOverview,
} from '~/components/modules/quick-query/mongodb/containers';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import type {
  MongoCollectionDetailMetadata,
  MongoDatabaseOverviewMetadata,
} from '~/core/types/entities/tab-view.entity';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-mongodb-tabViewId');
const tabViewStore = useTabViewsStore();
const connectionStore = useManagementConnectionStore();
const { tabViews } = storeToRefs(tabViewStore);

const tabInfo = computed(() =>
  tabViews.value.find(tab => tab.id === route.params.tabViewId)
);

const activeComponent = computed(() => {
  if (tabInfo.value?.type === TabViewType.MongoCollectionDetail) {
    return MongoCollectionDetail;
  }
  return MongoDatabaseOverview;
});

const databaseOverviewProps = computed(() => {
  const metadata = tabInfo.value?.metadata as
    | MongoDatabaseOverviewMetadata
    | undefined;
  return { databaseName: metadata?.databaseName || '' };
});

const collectionDetailProps = computed(() => {
  const metadata = tabInfo.value?.metadata as
    | MongoCollectionDetailMetadata
    | undefined;
  return {
    databaseName: metadata?.databaseName || '',
    collectionName: metadata?.collectionName || '',
  };
});
</script>

<template>
  <component
    :is="activeComponent"
    :connection-id="route.params.connectionId"
    :workspace-id="route.params.workspaceId"
    v-bind="
      tabInfo?.type === TabViewType.MongoCollectionDetail
        ? collectionDetailProps
        : databaseOverviewProps
    "
  />
</template>
```

- [ ] **Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: no new type errors. If `RoutesNamesList` does not yet include
`'workspaceId-connectionId-mongodb-tabViewId'`, confirm the typed-router
route names regenerate from the new page file automatically (this is how
`workspaceId-connectionId-redis-tabViewId` became available) — re-run
`bun run typecheck` after the dev server/typegen has had a chance to run
once if the name is still missing.

- [ ] **Step 8: Commit**

```bash
git add core/composables/useTabManagement.ts "pages/[workspaceId]/[connectionId]/mongodb/[tabViewId].vue" test/nuxt/core/composables/useTabManagement.test.ts
git commit -m "feat(mongodb): route Mongo tabs to a dedicated mongodb page"
```

---

### Task 9: Sidebar database → collection tree

**Files:**

- Create: `components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData.ts`
- Create: `components/modules/management/schemas/mongodb/hooks/index.ts`
- Create: `components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue`
- Create: `components/modules/management/schemas/mongodb/index.ts`
- Modify: `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`
- Test: `test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`

**Interfaces:**

- Consumes: `useMongoDatabaseCollections` (Task 4), `FileNode` type (`~/components/base/tree-folder/types`, existing), `FileTree` component (`~/components/base/tree-folder/FileTree.vue`, existing), `useTabManagement` (Task 8).
- Produces: `useMongoSchemaTreeData(params: { connection: Ref<Connection | undefined> }): { fileTreeData: Ref<Record<string, FileNode>>; isLoading: Ref<boolean> }`, `ManagementMongoSchemas.vue` (no props — reads the selected connection itself, mirroring `ManagementRedisBrowser`).

- [ ] **Step 1: Write the failing test**

`test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`:

```ts
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useMongoSchemaTreeData } from '~/components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

vi.stubGlobal(
  '$fetch',
  vi.fn().mockResolvedValue({
    collections: [{ name: 'users', documentCount: 3 }],
  })
);

describe('useMongoSchemaTreeData', () => {
  it('builds a database root node with collection leaf nodes tagged with TabViewType', async () => {
    const connection = ref({ id: 'c1', database: 'shop' } as any);
    const { fileTreeData } = useMongoSchemaTreeData({ connection });
    await flushPromises();

    const root = fileTreeData.value.shop;
    expect(root.type).toBe('folder');
    expect(root.data?.tabViewType).toBe(TabViewType.MongoDatabaseOverview);
    expect(root.children).toEqual(['shop.users']);

    const collectionNode = fileTreeData.value['shop.users'];
    expect(collectionNode.type).toBe('file');
    expect(collectionNode.parentId).toBe('shop');
    expect(collectionNode.data?.tabViewType).toBe(
      TabViewType.MongoCollectionDetail
    );
  });
});
```

Check how `flushPromises` is imported in the neighboring
`useSchemaTreeData` test (if one exists) or another `test/nuxt` composable
test, and mirror that import.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `useMongoSchemaTreeData`**

```ts
import { computed, toRef, watch, type Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { useMongoDatabaseCollections } from '~/components/modules/quick-query/mongodb/hooks';
import type { Connection } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

export function useMongoSchemaTreeData(params: {
  connection: Ref<Connection | undefined>;
}) {
  const { collections, isLoading, fetchCollections } =
    useMongoDatabaseCollections({ connection: params.connection });

  const databaseName = computed(() => params.connection.value?.database || '');

  const fileTreeData = computed<
    Record<string, FileNode<{ tabViewType: TabViewType }>>
  >(() => {
    const rootId = databaseName.value;
    if (!rootId) return {};

    const nodes: Record<string, FileNode<{ tabViewType: TabViewType }>> = {
      [rootId]: {
        id: rootId,
        parentId: null,
        name: rootId,
        type: 'folder',
        depth: 0,
        iconOpen: 'hugeicons:database-01',
        iconClose: 'hugeicons:database-01',
        children: [],
        data: { tabViewType: TabViewType.MongoDatabaseOverview },
      },
    };

    for (const collection of collections.value) {
      const nodeId = `${rootId}.${collection.name}`;
      nodes[nodeId] = {
        id: nodeId,
        parentId: rootId,
        name: collection.name,
        type: 'file',
        depth: 1,
        iconOpen: 'hugeicons:grid-table',
        iconClose: 'hugeicons:grid-table',
        data: { tabViewType: TabViewType.MongoCollectionDetail },
      };
      nodes[rootId].children!.push(nodeId);
    }

    return nodes;
  });

  watch(databaseName, fetchCollections, { immediate: true });

  return { fileTreeData, isLoading };
}
```

`components/modules/management/schemas/mongodb/hooks/index.ts`:

```ts
export * from './useMongoSchemaTreeData';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`
Expected: PASS

- [ ] **Step 5: Implement `ManagementMongoSchemas.vue`**

```vue
<script setup lang="ts">
import { toRef } from 'vue';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { useMongoSchemaTreeData } from './hooks';

const connectionStore = useManagementConnectionStore();
const { fileTreeData } = useMongoSchemaTreeData({
  connection: toRef(connectionStore, 'selectedConnection'),
});
const { openMongoDatabaseTab, openMongoCollectionTab } = useTabManagement();

const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  const tabViewType = node.data?.tabViewType as TabViewType | undefined;

  if (tabViewType === TabViewType.MongoDatabaseOverview) {
    await openMongoDatabaseTab({ databaseName: node.name });
    return;
  }

  if (tabViewType === TabViewType.MongoCollectionDetail) {
    await openMongoCollectionTab({
      databaseName: node.parentId || '',
      collectionName: node.name,
    });
  }
};
</script>

<template>
  <div class="h-full">
    <FileTree :initial-data="fileTreeData" @click="handleTreeClick" />
  </div>
</template>
```

`components/modules/management/schemas/mongodb/index.ts`:

```ts
export { default as ManagementMongoSchemas } from './ManagementMongoSchemas.vue';
```

- [ ] **Step 6: Wire the family branch into `PrimarySideBar.vue`**

In `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`,
import `ManagementMongoSchemas` alongside the other `#components` imports,
then add a MongoDB branch to the `current` computed, mirroring the
existing Redis branch:

```ts
  if (currentFamily.value === EConnectionFamily.MONGODB) {
    if (activityStore.activityActive === ActivityBarItemType.Explorer) {
      return ManagementExplorer;
    }

    if (activityStore.activityActive === ActivityBarItemType.Schemas) {
      return ManagementMongoSchemas;
    }

    if (activityStore.activityActive === ActivityBarItemType.Agent) {
      return ManagementAgent;
    }

    return null;
  }
```

Place this block before the existing `if (currentFamily.value === EConnectionFamily.REDIS)` block (or after — order between the two family branches does not matter since they are mutually exclusive on `currentFamily`).

- [ ] **Step 7: Run typecheck and full nuxt/unit suites**

Run: `bun run typecheck`, `bun vitest --run --project unit`, `bun vitest --run --project nuxt`
Expected: no new failures.

- [ ] **Step 8: Commit**

```bash
git add components/modules/management/schemas/mongodb components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue test/nuxt/components/modules/management/schemas/mongodb
git commit -m "feat(mongodb): add database/collection sidebar tree for MongoDB connections"
```

---

### Task 10: Full verification and graphify update

- [ ] **Step 1: Run the full unit and nuxt suites**

Run: `bun test:unit` and `bun test:nuxt`
Expected: all green, including every test added in Tasks 1-9.

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Update the knowledge graph**

Run: `graphify update .`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(mongodb): finish MongoDB Quick Query database/collection views"
```
