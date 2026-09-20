# Design Spec: MongoDB Schema 2-Phase API Optimization & Tree Display

## Overview

Optimize MongoDB Schema tree loading in `ManagementMongoSchemas.vue` and `useMongoSchemaTreeData.ts` by decoupling fast structural metadata from heavy collection/database stats into two distinct APIs, supporting batch fetching across databases, and updating the sidebar tree to show collection count (`totalCollections`) on database nodes using `TabViewType.MongoDatabaseOverview`.

## Problem Statement

Currently, loading MongoDB schemas executes:

1. `POST /api/mongodb/databases` to get database names.
2. For each database individually (N requests): `POST /api/mongodb/collection-names`, which invokes:
   - `database.listCollections().toArray()` (fast)
   - `collStats` for every single collection (very slow)
   - `dbStats` for the database (slow)
   - Each HTTP request creates a new `MongoClient` connection and tears it down.
     This creates substantial latency, network congestion, and blocks the tree UI from rendering until all stats complete.

## Requirements

1. **API 1 (Structure / Fast Path)**:
   - Endpoint: `POST /api/mongodb/collection-names`
   - Returns database collections with names and properties (`Capped`, `View`), but **without** `count`, collection `size`, or database `totalSize`.
   - Supports single database (`database?: string`) or batch databases (`databases?: string[]`), returning collections per database.
   - Fast response (< 50ms) with a single `MongoClient` connection lifecycle.
2. **API 2 (Stats / Background Path)**:
   - Endpoint: `POST /api/mongodb/collection-stats`
   - Returns collection item counts (`count`), collection sizes (`size`), and database size (`totalSize`) in a batch for all requested databases.
   - Uses a single `MongoClient` connection lifecycle.
3. **Frontend Tree & Hook (`useMongoSchemaTreeData.ts` & `ManagementMongoSchemas.vue`)**:
   - Call API 1 in batch, immediately populate the tree structure, and set `isLoading = false` so users can interact immediately.
   - Database nodes display `totalCollections` (number of collections) instead of `totalSize`.
   - Template uses `node.data?.tabViewType === TabViewType.MongoDatabaseOverview` and `node.data?.tabViewType === TabViewType.MongoCollectionDetail` for clean DOM conditionals.
   - Call API 2 in the background to fetch stats for all databases in one batch call.
   - When stats arrive, update collection nodes with `size` and `count` reactively.

## API Contracts

### API 1: `POST /api/mongodb/collection-names`

**Request Body**:

```typescript
interface MongoCollectionNamesRequestParams
  extends DatabaseMetadataRequestParams {
  database?: string;
  databases?: string[];
}
```

**Response Body**:
When `databases` is provided:

```typescript
interface MongoDatabasesCollectionsResponse {
  databases: Array<{
    database: string;
    collections: Array<{
      name: string;
      properties: string[];
    }>;
  }>;
}
```

When single `database` is provided (backwards compatibility):

```typescript
interface MongoSingleDatabaseCollectionsResponse {
  collections: Array<{
    name: string;
    properties: string[];
  }>;
}
```

### API 2: `POST /api/mongodb/collection-stats`

**Request Body**:

```typescript
interface MongoCollectionStatsRequestParams
  extends DatabaseMetadataRequestParams {
  databases?: string[];
  database?: string;
}
```

**Response Body**:
When `databases` is provided:

```typescript
interface MongoDatabasesStatsResponse {
  databases: Array<{
    database: string;
    totalSize: number;
    collections: Array<{
      name: string;
      size: number;
      count: number;
    }>;
  }>;
}
```

When single `database` is provided:

```typescript
interface MongoSingleDatabaseStatsResponse {
  totalSize: number;
  collections: Array<{
    name: string;
    size: number;
    count: number;
  }>;
}
```

## Backend Infrastructure Changes

In `server/infrastructure/nosql/mongodb/mongodb-quick-query.ts`:

- Update `listMongoCollectionNames(database)` to only call `listCollections().toArray()` and return `{ name, properties }`.
- Add `getMongoCollectionStats(database)` (or `listMongoCollectionStats`) to call `collStats` for collections in a database, returning `{ name, size, count }`.
- Export typed interfaces for the fast collection name/properties and the collection stats.

## Frontend Changes

1. `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`:
   - Define `MongoCollectionItemInfo`: `{ name: string; properties: string[] }`
   - Define `MongoCollectionStatItem`: `{ name: string; size: number; count: number }`
2. `components/modules/management/schemas/mongodb/hooks/useMongoSchemaTreeData.ts`:
   - `MongoNodeData`:
     ```typescript
     interface MongoNodeData {
       tabViewType: TabViewType;
       totalCollections?: number;
       totalSize?: number;
       size?: number;
       count?: number;
     }
     ```
   - Load phase 1: Fetch databases and their collection names via batch `collection-names`. Set `totalCollections: collections.length` on database folders. Set `isLoading = false`.
   - Load phase 2: Trigger batch `collection-stats` in the background. On arrival, update each collection's `size` and `count` (and database `totalSize`).
3. `components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue`:
   - In `#meta="{ node }"`:
     - `v-if="node.data?.tabViewType === TabViewType.MongoDatabaseOverview"`: render `{{ (node.data as any)?.totalCollections ?? 0 }}`
     - `v-else-if="node.data?.tabViewType === TabViewType.MongoCollectionDetail && (node.data as any)?.size !== undefined"`: render count and size.

## Testing Plan

- `test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`:
  - Verify `listMongoCollectionNames` returns `{ name, properties }` quickly without calling `collStats`.
  - Verify collection stats function returns `{ name, size, count }`.
- `test/nuxt/components/modules/management/schemas/mongodb/useMongoSchemaTreeData.test.ts`:
  - Verify database folders are created with `tabViewType: TabViewType.MongoDatabaseOverview` and `totalCollections`.
  - Verify collection items are created immediately, and stats (`size`, `count`) are populated after stats resolve.
- Run `bun run typecheck` and `bun test:unit`.
