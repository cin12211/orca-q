# Data Model: Expanded Database Support

**Feature**: 033-expand-db-support  
**Generated**: 2026-04-28  
**Research**: [research.md](./research.md)

---

## 1. Primary Entities

### 1.1 `ConnectionProviderKind`

Represents how a connection is reached, independent of the underlying database dialect.

| Field | Type | Notes |
| --- | --- | --- |
| `providerKind` | `'direct-sql' \| 'sqlite-file' \| 'cloudflare-d1' \| 'turso' \| 'redis-direct' \| 'mongodb-direct'` | `cloudflare-d1` and `turso` still route to SQL family; Redis and MongoDB each have their own family |
| `family` | `'sql' \| 'redis' \| 'mongodb'` | Derived from `type + providerKind` |

**Rules**:

- `providerKind = 'cloudflare-d1'` and `providerKind = 'turso'` MUST map to `family = 'sql'`.
- `providerKind = 'sqlite-file'` is Electron-only.
- `providerKind = 'redis-direct'` and `providerKind = 'mongodb-direct'` MUST never expose SQL-only workspace capabilities.

### 1.2 `ConnectionProfile`

Represents a saved connection entry in the workspace.

```ts
type ConnectionProfile = {
  id: string;
  workspaceId: string;
  name: string;
  type: DatabaseClientType;
  providerKind: ConnectionProviderKind;
  method: 'string' | 'form' | 'file' | 'managed';
  connectionString?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  managedSqlite?: {
    provider: 'cloudflare-d1' | 'turso';
    accountId?: string;
    databaseId?: string;
    databaseName?: string;
    apiToken?: string;
    url?: string;
    authToken?: string;
    branchName?: string;
  };
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
  tagIds?: string[];
  createdAt: string;
  updatedAt?: string;
};
```

**Relationships**:

- One workspace has many `ConnectionProfile` records.
- One `ConnectionProfile` derives exactly one `ConnectionCapabilityProfile`.
- One `ConnectionProfile` can open one of three workspace families: SQL, Redis, or MongoDB.

**Validation rules by provider/method**:

| Provider kind | `type` | Method | Required fields |
| --- | --- | --- | --- |
| `direct-sql` | `postgres`, `mysql`, `mariadb`, `oracledb` | `string` | `connectionString` |
| `direct-sql` | `postgres`, `mysql`, `mariadb` | `form` | `host`, `port`, `username`, `database` |
| `direct-sql` | `oracledb` | `form` | `host`, `port`, `username`, `password`, `serviceName` |
| `sqlite-file` | `sqlite3` | `file` | `filePath` |
| `cloudflare-d1` | `sqlite3` | `managed` | `managedSqlite.accountId`, `managedSqlite.databaseId`, `managedSqlite.apiToken` |
| `turso` | `sqlite3` | `managed` | `managedSqlite.url`, `managedSqlite.authToken` |
| `redis-direct` | `redis` | `string` or `form` | `connectionString` or `host`, `port` |
| `mongodb-direct` | `mongodb` | `string` or `form` | `connectionString` or `host`, `port` |

**Additional rules**:

- `method = 'managed'` is valid only for managed SQLite providers.
- `managedSqlite` MUST be absent for non-SQLite connections.
- `filePath` MUST be absent unless `providerKind = 'sqlite-file'`.
- `serviceName` MUST remain Oracle-only.

### 1.3 `ConnectionCapabilityProfile`

Derived capability snapshot that controls which shell surfaces are visible for the active connection.

| Field | Type | Notes |
| --- | --- | --- |
| `family` | `'sql' \| 'redis' \| 'mongodb'` | Derived from connection |
| `visibleActivityItems` | `ActivityBarItemType[]` | Sidebar tabs user can access |
| `allowedTabTypes` | `TabViewType[]` | Tab families valid for routing/opening |
| `defaultActivityItem` | `ActivityBarItemType` | Fallback when persisted item is incompatible |
| `primaryQuerySurface` | `'sql-editor' \| 'redis-workbench' \| 'mongodb-documents'` | Determines main query/view experience |
| `supportsRawSql` | `boolean` | SQL family only |
| `supportsSchemaTree` | `boolean` | SQL, plus MongoDB schema analysis through a different component |
| `supportsErd` | `boolean` | SQL only |
| `supportsUsersRoles` | `boolean` | SQL only |
| `supportsDatabaseTools` | `boolean` | All families, but contents differ |
| `hiddenFeatureReasons` | `Record<string, string>` | User-facing reasons for blocked capabilities |

**Rules**:

- SQL family exposes Explorer, Schemas, ERD, UsersRoles, DatabaseTools, Agent.
- MongoDB family exposes Explorer, Schemas, DatabaseTools, Agent.
- Redis family exposes Explorer, DatabaseTools, Agent.
- Any persisted `activityActive` not in `visibleActivityItems` MUST be replaced with `defaultActivityItem` during connection activation.

### 1.4 `SqlWorkspaceSession`

Represents runtime UI state for relational/managed-SQLite sessions.

| Field | Type | Notes |
| --- | --- | --- |
| `connectionId` | `string` | Active connection |
| `providerKind` | `ConnectionProviderKind` | Distinguishes direct SQL, local SQLite, D1, Turso |
| `schemaId` | `string` | Existing SQL schema selection |
| `activeSqlTabType` | `TabViewType` | Existing SQL tab flow |
| `providerBadge` | `string` | UI hint such as `D1` or `Turso` |
| `branchName?` | `string` | Turso only |

### 1.5 `RedisWorkspaceSession`

Represents runtime UI state for Redis.

| Field | Type | Notes |
| --- | --- | --- |
| `connectionId` | `string` | Active connection |
| `selectedDatabaseIndex` | `number` | Logical DB index |
| `viewMode` | `'tree' \| 'list'` | Browser mode |
| `keyPattern` | `string` | Search/prefix filter |
| `keyTypeFilter` | `string[]` | Strings, hashes, sets, streams, JSON, etc. |
| `selectedKey` | `string \| null` | Active key |
| `activeTool` | `'browser' \| 'workbench' \| 'profiler' \| 'slowlog' \| 'analysis'` | Redis tools surface |
| `autoRefreshMs?` | `number` | Streams/profiler refresh |

### 1.6 `MongoWorkspaceSession`

Represents runtime UI state for MongoDB.

| Field | Type | Notes |
| --- | --- | --- |
| `connectionId` | `string` | Active connection |
| `databaseName` | `string` | Selected database |
| `collectionName` | `string` | Selected collection |
| `filterDocument` | `string` | Mongo filter text |
| `sortDocument?` | `string` | Optional sort JSON |
| `projectDocument?` | `string` | Optional projection JSON |
| `schemaSampleSize` | `number` | Sampling size for schema analysis |
| `aggregationPipeline` | `string[]` | Saved pipeline stages |
| `activeTool` | `'documents' \| 'schema' \| 'aggregations' \| 'indexes'` | Mongo work surface |

### 1.7 `CapabilityGateDecision`

Represents the runtime result of checking whether a feature can be opened.

| Field | Type | Notes |
| --- | --- | --- |
| `featureId` | `string` | Sidebar item, route, or tab type |
| `state` | `'allowed' \| 'hidden' \| 'redirect' \| 'blocked'` | Hidden is proactive; blocked is explicit unavailable |
| `reason?` | `string` | Message shown to the user when appropriate |
| `fallbackTarget?` | `ActivityBarItemType \| TabViewType \| string` | Used for redirects |

---

## 2. State Transitions

### 2.1 Connection Creation and Family Resolution

```text
draft
  -> database type selected
  -> provider kind selected
  -> family derived
  -> method selected
  -> credentials entered
  -> validation requested
  -> validation-success | validation-error
  -> saved
  -> reopened
  -> family capabilities resolved
```

### 2.2 Managed SQLite Session Activation

```text
saved D1/Turso profile
  -> managed auth check
  -> provider transport created
  -> branch validated (Turso only)
  -> SQL family route selected
  -> schema/query workspace active
```

### 2.3 Family-Aware Shell Routing

```text
connection activated
  -> capability profile resolved
  -> visible activity items published
  -> persisted activity item validated
  -> unsupported item redirected to family default
  -> compatible route/tab rendered
```

### 2.4 Redis/Mongo Workspace Navigation

```text
family-specific explorer opened
  -> item selected (key or collection)
  -> family-specific tab opened
  -> filters/tool state updated
  -> tool-specific query or analysis run
```

---

## 3. Persistence Impact

### 3.1 Connection persistence changes

The persisted connection record must expand to support:

- `providerKind`
- `method = 'managed'`
- `managedSqlite?: { ... }`

Backward compatibility rules:

- Existing SQL records without `providerKind` default to `direct-sql`.
- Existing local SQLite records default to `providerKind = 'sqlite-file'` when `type = sqlite3` and `filePath` exists.
- Existing Redis/Mongo records created during future rollout can keep `string` or `form` semantics without `managedSqlite`.

### 3.2 UI persistence changes

- `activityActive` remains persisted, but must be validated against the current `ConnectionCapabilityProfile` every time a connection is activated.
- `TabViewType` persistence expands with Redis and MongoDB tab types.
- Family-specific filters and selected items should persist only within their family-specific session state, not globally across unrelated connection families.

---

## 4. Derived Request Shapes

### 4.1 Managed SQLite validation request

```ts
type ManagedSqliteValidationRequest =
  | {
      type: 'sqlite3';
      providerKind: 'cloudflare-d1';
      method: 'managed';
      managedSqlite: {
        provider: 'cloudflare-d1';
        accountId: string;
        databaseId: string;
        apiToken: string;
      };
    }
  | {
      type: 'sqlite3';
      providerKind: 'turso';
      method: 'managed';
      managedSqlite: {
        provider: 'turso';
        url: string;
        authToken: string;
        branchName?: string;
      };
    };
```

### 4.2 Redis browser request

```ts
type RedisBrowseRequest = {
  connectionId: string;
  databaseIndex: number;
  keyPattern?: string;
  keyTypes?: string[];
  cursor?: string;
};
```

### 4.3 Mongo documents request

```ts
type MongoDocumentsRequest = {
  connectionId: string;
  databaseName: string;
  collectionName: string;
  filter?: string;
  sort?: string;
  project?: string;
  limit?: number;
  skip?: number;
};
```

---

## 5. Minimum Family Capability Matrix for Release

| Family / provider | Connect & save | Main data surface | Query/tool surface | Schema/shape surface | SQL-only admin features |
| --- | --- | --- | --- | --- | --- |
| Direct SQL | Yes | Existing explorer + quick query | Existing raw SQL | Existing schema tree | Existing behavior |
| SQLite file | Yes | Existing SQL explorer | Existing raw SQL | Existing schema tree | Existing SQLite limits |
| Cloudflare D1 | Yes | Existing SQL explorer | Existing raw SQL | Existing schema tree where supported | Hidden/blocked when unsupported |
| Turso | Yes | Existing SQL explorer | Existing raw SQL | Existing schema tree where supported | Hidden/blocked when unsupported |
| Redis | Yes | Redis browser | Redis workbench/tools | N/A | Hidden |
| MongoDB | Yes | Documents/collections explorer | Filter + aggregation tools | Mongo schema analysis | Hidden |
