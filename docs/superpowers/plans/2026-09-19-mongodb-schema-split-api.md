# MongoDB Schema 2-Phase API & Tree Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple MongoDB schema loading into two APIs (fast structural metadata and background collection/database stats) supporting batch queries, and display collection count (`totalCollections`) on database folder nodes in `ManagementMongoSchemas.vue`.

**Architecture:**

1. Server infrastructure: `listMongoCollectionNames` returns lightweight collection metadata without `collStats`. `listMongoCollectionStats` returns document counts and sizes.
2. Server API endpoints: `POST /api/mongodb/collection-names` handles batch or single-database structure fetching. New `POST /api/mongodb/collection-stats` handles batch or single-database stats fetching. Both use `withMongoClient` once.
3. Frontend composable & UI: `useMongoSchemaTreeData` runs Phase 1 (instant batch structure fetch) to render database nodes with `totalCollections` and collection leaf nodes immediately. Then it fires Phase 2 (batch stats fetch) in the background to asynchronously populate collection `count` and `size`. `ManagementMongoSchemas.vue` conditionally renders meta based on `TabViewType.MongoDatabaseOverview` and `TabViewType.MongoCollectionDetail`.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, MongoDB Node Driver, Vitest.

## Global Constraints

- Must pass `bun run typecheck` and `bun test:unit`.
- Icon usage rules: Only verified `hugeicons:*` icons.
- Typography & styling rules: `text-xxs` for 10px font, size="xxs" for compact controls.
- DOM conditional cleanliness: Distinguish database folders from collections using `TabViewType.MongoDatabaseOverview`.

---

### Task 1: Backend Infrastructure Helpers & Unit Tests

**Files:**

- Modify: `server/infrastructure/nosql/mongodb/mongodb-quick-query.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`

**Interfaces:**

- Produces:

  ```typescript
  export interface MongoCollectionNameItem {
    name: string;
    properties: string[];
  }
  export interface MongoCollectionStatItem {
    name: string;
    size: number;
    count: number;
  }
  export interface MongoDatabaseBatchStats {
    database: string;
    totalSize: number;
    collections: MongoCollectionStatItem[];
  }
  export async function listMongoCollectionNames(
    database: MongoCollectionsSource
  ): Promise<MongoCollectionNameItem[]>;
  export async function listMongoCollectionStats(
    database: MongoCollectionsSource
  ): Promise<MongoCollectionStatItem[]>;
  ```

- [ ] **Step 1: Update unit tests for lightweight collection names and new collection stats**

In `test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`, update the `listMongoCollectionNames` test to verify it only reads `listCollections` and does not call `database.command({ collStats })`. Add tests for `listMongoCollectionStats`.

- [ ] **Step 2: Run unit test to verify failure**

Run: `bun x vitest run test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`
Expected: FAIL due to interface and implementation mismatch.

- [ ] **Step 3: Implement `listMongoCollectionNames` and `listMongoCollectionStats` in `mongodb-quick-query.ts`**

Make `listMongoCollectionNames` only inspect `database.listCollections().toArray()`. Add `listMongoCollectionStats` which executes `collStats` for each collection.

- [ ] **Step 4: Run unit test to verify pass**

Run: `bun x vitest run test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/infrastructure/nosql/mongodb/mongodb-quick-query.ts test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts
git commit -m "feat: optimize listMongoCollectionNames and add listMongoCollectionStats"
```

---

### Task 2: Server API Endpoints (Batch Structure & Batch Stats)

**Files:**

- Modify: `server/api/mongodb/collection-names.post.ts`
- Create: `server/api/mongodb/collection-stats.post.ts`
- Modify: `core/types/database-schemas.types.ts` (if needed for batch params)

**Interfaces:**

- `POST /api/mongodb/collection-names`:
  Input: `{ database?: string; databases?: string[]; ...connectionParams }`
  Output:
  - If `databases`: `{ databases: Array<{ database: string; collections: MongoCollectionNameItem[] }> }`
  - If `database`: `{ collections: MongoCollectionNameItem[] }`
- `POST /api/mongodb/collection-stats`:
  Input: `{ databases?: string[]; database?: string; ...connectionParams }`
  Output:

  - If `databases`: `{ databases: Array<{ database: string; totalSize: number; collections: MongoCollectionStatItem[] }> }`
  - If `database`: `{ totalSize: number; collections: MongoCollectionStatItem[] }`

- [ ] **Step 1: Update `collection-names.post.ts` to support batch databases and single-connection lifecycle**

Use `withMongoClient` when `databases` is provided to query collections for each DB without re-connecting. Use `withMongoDatabase` if single `database` is passed.

- [ ] **Step 2: Create `collection-stats.post.ts` for batch and single database stats**

Connect via `withMongoClient` once. For each requested DB, call `getMongoDatabaseTotalSize` and `listMongoCollectionStats`.

- [ ] **Step 3: Run typecheck to verify server endpoints**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/api/mongodb/collection-names.post.ts server/api/mongodb/collection-stats.post.ts
git commit -m "feat: support batch collection names and add collection-stats api"
```

---

### Task 3: Frontend Composable & Types Update

**Files:**

- Modify: `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`
- Modify: `components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData.ts`

**Interfaces:**

- Consumes: `/api/mongodb/databases`, `/api/mongodb/collection-names`, `/api/mongodb/collection-stats`
- Produces:

  ```typescript
  interface MongoNodeData {
    tabViewType: TabViewType;
    totalCollections?: number;
    totalSize?: number;
    size?: number;
    count?: number;
  }
  ```

- [ ] **Step 1: Update types in `mongo-quick-query.types.ts`**

Add `MongoCollectionItemInfo` (`name`, `properties`), `MongoCollectionStatItem` (`name`, `size`, `count`), and batch response types.

- [ ] **Step 2: Update `useMongoSchemaTreeData.ts` for 2-phase loading**

Phase 1 (Instant):

- Call `fetchDatabases()` to get database names.
- Call `POST /api/mongodb/collection-names` with `{ databases: databases.value }` in ONE batch request.
- Populate `databases` and collection children immediately. Set `totalCollections = collections.length` on database folders.
- Turn `isLoading = false` immediately so the tree is fully interactive.

Phase 2 (Background):

- Call `POST /api/mongodb/collection-stats` with `{ databases: databases.value }` in ONE batch request.
- On arrival, reactively update the nodes' `size` and `count` (and `totalSize`).

- [ ] **Step 3: Update `test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`**

Update mocked fetch responses to provide batch responses and verify `totalCollections`, `TabViewType.MongoDatabaseOverview`, and asynchronous stats updating.

- [ ] **Step 4: Run the nuxt test**

Run: `bun x vitest run test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/modules/quick-query/mongodb/types/ components/modules/management/schemas/mongodb/hooks/ test/nuxt/components/modules/management/schemas/mongodb/
git commit -m "feat: implement 2-phase schema loading and totalCollections tracking"
```

---

### Task 4: Update `ManagementMongoSchemas.vue` Template

**Files:**

- Modify: `components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue`

- [ ] **Step 1: Update `#meta` slot in `ManagementMongoSchemas.vue`**

Cleanly branch on `node.data?.tabViewType`:

```vue
<template #meta="{ node }">
  <span
    v-if="node.data?.tabViewType === TabViewType.MongoDatabaseOverview"
    class="text-xs text-muted-foreground"
  >
    {{ (node.data as any)?.totalCollections ?? 0 }}
  </span>
  <span
    v-else-if="node.data?.tabViewType === TabViewType.MongoCollectionDetail && (node.data as any)?.size !== undefined"
    class="text-xs text-muted-foreground"
  >
    <template v-if="(node.data as any)?.count !== undefined">
      {{ ((node.data as any)?.count as number).toLocaleString() }} ·
      {{ formatBytes(((node.data as any)?.size as number) || 0) }}
    </template>
    <template v-else>
      {{ formatBytes(((node.data as any)?.size as number) || 0) }}
    </template>
  </span>
</template>
```

- [ ] **Step 2: Run typecheck and test**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue
git commit -m "feat: display totalCollections on database nodes in ManagementMongoSchemas"
```

---

### Task 5: Final Full Verification

**Files:**

- All touched files

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 2: Run unit test suite**

Run: `bun test:unit`
Expected: All unit tests PASS

- [ ] **Step 3: Run targeted Nuxt tests**

Run: `bun x vitest run test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit any final cleanup if needed**
