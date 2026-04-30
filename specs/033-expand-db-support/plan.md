# Implementation Plan: Expanded Database Support

**Branch**: `033-expand-db-support` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/connection-family-capability-contract.md](./contracts/connection-family-capability-contract.md), [contracts/managed-sqlite-session-contract.md](./contracts/managed-sqlite-session-contract.md), [contracts/nosql-workspace-contract.md](./contracts/nosql-workspace-contract.md) | **Quickstart**: [quickstart.md](./quickstart.md)

## Summary

Add Cloudflare D1 and Turso as managed SQLite providers on HeraQ's SQL path, while introducing Redis and MongoDB as separate connection families with dedicated components, routes, and tab types instead of forcing them through RDS/SQL workflows. The core design is a capability registry keyed by the active connection family so SQL-only features such as schema trees, ERD, users/roles, schema diff, backup/restore, and raw SQL editors are hidden or redirected for Redis/MongoDB sessions, and Redis/MongoDB-specific browsers and tools are hidden for SQL sessions.

## Technical Context

**Language/Version**: TypeScript 5.6, Vue 3.5, Nuxt 3.16, Node 18+, Electron 41  
**Primary Dependencies**: Nuxt 3 SPA + Nitro server routes, Pinia, existing SQL stack (`knex`, `pg`, `mysql2`, `sqlite3`, `oracledb`), plus new runtime clients `@libsql/client` for Turso, `redis` for Redis, and `mongodb` for MongoDB; Cloudflare D1 uses server-side HTTP/fetch against the Cloudflare D1 query API  
**Storage**: Existing IndexedDB/Electron persistence for workspaces, connections, and tabs; SQL sessions through existing adapter/cache flow; managed SQLite provider state on saved connections; Redis and MongoDB session state through dedicated server clients and persisted UI filters  
**Testing**: Vitest 4 (`unit`, `nuxt`, `e2e`) and Playwright for connection-family routing and workspace visibility flows  
**Target Platform**: Electron desktop app with Nuxt SPA web fallback; local SQLite file remains desktop-only, while D1, Turso, Redis, and MongoDB are remote-capable  
**Project Type**: Single-repo desktop/web database client with family-specific workspace modules behind a shared app shell  
**Performance Goals**: Reach a usable first data surface within 5 seconds for small/medium datasets, keep sidebar family switching immediate, use paging/sampling/search-first browsing for Redis/MongoDB, and preserve existing SQL query responsiveness for D1/Turso  
**Constraints**: Redis and MongoDB must not reuse SQL-only components as a superficial skin; SQL-only activity tabs and routes must hide or redirect for NoSQL families and vice versa; persisted sidebar state must recover cleanly when the active connection family changes; no implicit PostgreSQL fallback in touched paths; D1 must use remote API semantics rather than pretending to be a local SQLite file  
**Scale/Scope**: 2 managed SQLite providers (D1, Turso), 2 NoSQL families (Redis, MongoDB), 1 capability registry, multiple new family-specific modules/tab types/routes, targeted server runtime additions, and app-shell gating across activity bar, primary sidebar, route entries, and tab management

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The constitution file remains the default placeholder template, so there are no enforceable project-specific constitutional gates to fail against.

**Temporary gates applied for this feature:**

- [x] Redis and MongoDB are treated as distinct workspace families, not as thin skins over the existing SQL/RDS panels.
- [x] Cloudflare D1 and Turso remain on the SQL browsing/query path and do not create duplicate relational workspaces.
- [x] SQL-only features are hidden or redirected for Redis/MongoDB sessions, and Redis/MongoDB-only tools are hidden for SQL sessions.
- [x] Existing saved SQL connections and tabs remain backward-compatible; invalid persisted sidebar state falls back to a supported family surface.
- [x] No new touched flow is allowed to silently default to PostgreSQL when the active connection type is something else.

**Post-design re-check:**

- [x] The design centers on one shared capability registry instead of ad hoc per-component visibility checks.
- [x] Dedicated Redis/MongoDB modules are introduced where the workflows differ materially from SQL.
- [x] The plan keeps SQL-family reuse high for D1/Turso while isolating NoSQL-specific runtime and UI concerns.
- [x] Route and tab contracts explicitly describe what happens when a user lands on an unsupported feature for the current connection family.

## Project Structure

### Documentation (this feature)

```text
specs/033-expand-db-support/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── connection-family-capability-contract.md
│   ├── managed-sqlite-session-contract.md
│   └── nosql-workspace-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
components/modules/
├── connection/
├── management/
│   ├── explorer/
│   ├── schemas/
│   ├── database-tools/
│   ├── erd-diagram/
│   ├── role-permission/
│   ├── redis-browser/              # new family-specific explorer panel
│   ├── redis-tools/                # new family-specific tools panel
│   ├── mongodb-explorer/           # new family-specific explorer panel
│   ├── mongodb-schema/             # new family-specific schema panel
│   └── mongodb-tools/              # new family-specific tools panel
├── quick-query/                    # SQL family only
├── raw-query/                      # SQL family only
├── redis-workspace/                # new key browser/workbench/value editor flows
└── mongodb-workspace/              # new documents/schema/aggregation flows

core/
├── constants/
│   ├── database-client-type.ts
│   └── connection-capabilities.ts  # new
├── composables/
│   └── useTabManagement.ts
├── stores/
│   ├── managementConnectionStore.ts
│   ├── useActivityBarStore.ts
│   └── useTabViewsStore.ts
└── types/entities/
    └── connection.entity.ts

pages/[workspaceId]/[connectionId]/
├── index.vue
├── quick-query/[tabViewId].vue     # SQL family route
├── redis/[tabViewId].vue           # new
├── mongodb/[tabViewId].vue         # new
├── database-tools/
├── instance-insights/
├── schema-diff/
└── user-permissions/

server/
├── api/
│   ├── managment-connection/health-check.ts
│   ├── query/                      # SQL + managed SQLite only
│   ├── redis/                      # new key/workbench/analysis operations
│   └── mongodb/                    # new documents/schema/aggregation operations
├── infrastructure/
│   ├── driver/
│   │   ├── factory.ts
│   │   ├── db-connection.ts
│   │   ├── postgres.adapter.ts
│   │   ├── mysql.adapter.ts
│   │   ├── oracle.adapter.ts
│   │   ├── sqlite.adapter.ts
│   │   └── managed-sqlite/         # new D1/Turso transports
│   └── nosql/                      # new redis/mongodb runtime clients and mappers

test/
├── nuxt/
│   ├── components/modules/app-shell/
│   ├── components/modules/management/
│   ├── components/modules/redis-workspace/
│   └── components/modules/mongodb-workspace/
├── unit/
│   └── server/
│       ├── api/
│       ├── infrastructure/driver/
│       └── infrastructure/nosql/
└── playwright/
```

**Structure Decision**: Keep the existing single Nuxt/Electron application and shared app shell, but make the shell family-aware through a central capability registry. SQL-family workflows stay inside the current relational modules, D1/Turso plug into the SQL runtime as managed SQLite providers, and Redis/MongoDB get their own cohesive modules plus dedicated routes/tab types where the interaction model is not relational.

## Complexity Tracking

No constitution violations or exceptional complexity exemptions are required for this plan. The design contains new modules because the user requirement explicitly distinguishes Redis/MongoDB from RDS/SQL behavior, and the alternative of stretching SQL panels to fit NoSQL workflows was rejected as higher-risk and lower-clarity.

*** Add File: /Volumes/Cinny/Cinny/Project/HeraQ/specs/033-expand-db-support/research.md
# Research: Expanded Database Support

**Feature**: 033-expand-db-support  
**Generated**: 2026-04-28

---

## 1. Current Codebase State

### 1.1 Connection and parser groundwork already exists, but support stops at the edge

The repo already recognizes `mongodb`, `mongodb+srv`, `redis`, and `rediss` in `core/helpers/parser-connection-string.ts`, and the connection picker already shows MongoDB and Redis cards. However, MongoDB and Redis remain blocked in `components/modules/connection/constants/index.ts` as “Coming soon,” and the backend driver factory in `server/infrastructure/driver/factory.ts` still only creates SQL-family adapters.

### 1.2 The shell is currently SQL-biased and unconditional

The current activity bar and primary sidebar are static:

- `components/modules/app-shell/activity-bar/hooks/useActivityMenu.ts`
- `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue`
- `core/stores/useActivityBarStore.ts`

They always surface the SQL-centric set of tabs: Explorer, Schemas, ERD, Users & Roles, Database Tools, Agent. This is the wrong behavior for Redis and MongoDB because the user explicitly wants those families treated differently from RDS/SQL connections.

### 1.3 Several major workflows still assume relational metadata and SQL text

Concrete SQL-only assumptions already present:

- `components/modules/management/schemas/ManagementSchemas.vue` is built around schema trees and SQL object types.
- `components/modules/management/database-tools/ManagementDatabaseTools.vue` assumes backup/restore, instance insights, and schema diff.
- `components/modules/quick-query/QuickQuery.vue` hardcodes `DatabaseClientType.POSTGRES` into its filter UI.
- `components/modules/raw-query/hooks/useQueryExecution.ts` and related SQL diagnostics still fall back to PostgreSQL semantics in some touched paths.
- `core/composables/useTabManagement.ts` only knows SQL-flavored tab openings and routes.

### 1.4 SQLite support exists today, but only as local file or app persistence

SQLite is already supported for desktop file connections and internal Electron persistence. Cloudflare D1 and Turso are different: they are remote, managed SQLite-compatible systems. They should reuse SQL-facing UI, but not the local file transport or the local-file assumptions in the connection form.

---

## 2. Technology Decisions

### 2.1 Introduce connection-family capability gating as the primary control plane

**Decision**: Derive a `ConnectionFamily` from the active connection and drive activity-bar visibility, sidebar panel selection, route guards, tab-type availability, and empty states from a single capability registry.

**Rationale**:

- The user explicitly called out that Redis and MongoDB are different from RDS/SQL and require both new features and hidden incompatible features.
- The current shell is static; without a central registry, family-specific behavior would devolve into scattered `if (type === ...)` checks.
- The existing control points are already centralized enough to support this: `useActivityMenu`, `PrimarySideBar`, `useTabManagement`, `useTabViewsStore`, and route entry pages.

**Alternatives considered**:

- Ad hoc visibility checks in each component: rejected because it would drift quickly and miss route/tab fallbacks.
- Separate app shells per family: rejected because the existing shell and workspace model already support multiple connection types and should remain shared.

### 2.2 Preserve the shell shape, but swap family-specific panels behind it

**Decision**: Keep the current activity-bar slot model, but make the contents family-aware:

- `Explorer`: SQL explorer, Redis key browser, or MongoDB collections explorer
- `Schemas`: SQL schema tree or MongoDB schema analysis; hidden for Redis
- `DatabaseTools`: SQL tools, Redis tools, or MongoDB tools
- `ERD` and `UsersRoles`: SQL family only

**Rationale**:

- This respects the current sidebar architecture and minimizes shell churn.
- It gives Redis/MongoDB room for dedicated components without exploding the number of activity-bar items in the first milestone.

**Alternatives considered**:

- Add a full new icon strip for Redis and MongoDB: rejected as unnecessary shell churn for the first release.

### 2.3 Model D1 and Turso as managed SQLite providers, not as separate database families

**Decision**: Keep D1 and Turso on `DatabaseClientType.SQLITE3`, but add provider-aware state such as `providerKind` and provider-specific config so they route into SQL workspaces instead of the local-file flow.

**Rationale**:

- D1 and Turso should inherit SQL schema browsing and SQL query behavior.
- Creating separate database types for D1 and Turso would duplicate capability matrices, query surfaces, and SQL UI logic unnecessarily.

**Alternatives considered**:

- Separate top-level database types for D1 and Turso: rejected because they are SQLite-compatible providers, not a new query family.
- Pretend D1/Turso are local SQLite files: rejected because their credentials, runtime transport, and lifecycle are remote.

### 2.4 Use Cloudflare D1 through a dedicated server-side REST transport

**Decision**: Implement D1 access through a dedicated managed-SQLite transport that talks to Cloudflare’s D1 query endpoint with account ID, database ID, and API token.

**Rationale**:

- D1 is not a raw TCP SQLite server or a local file.
- Cloudflare exposes remote query access through its API, so the app needs a provider-aware transport rather than another Knex file/TCP adapter.

**Alternatives considered**:

- Treat D1 as a Knex SQLite connection: rejected because there is no local SQLite file or socket to attach to.
- Require users to supply their own Worker proxy for the first release: rejected because it adds avoidable setup burden and contradicts the “connect directly” expectation.

### 2.5 Use `@libsql/client` for Turso

**Decision**: Use the official `@libsql/client` package for Turso connections, with `url`, `authToken`, and optional branch selection exposed in the connection/session model.

**Rationale**:

- The official libSQL client supports remote Turso URLs and auth tokens directly.
- It preserves room for embedded replica or sync features later without forcing that complexity into the first release.

**Alternatives considered**:

- Build a custom HTTP wrapper around Turso endpoints: rejected because the official client already covers the needed lifecycle and SQL execution behavior.

### 2.6 Use a dedicated Redis runtime and workspace, not the SQL editors

**Decision**: Use the official `redis` Node client and build dedicated Redis modules for key browsing, type-aware value viewing/editing, workbench/CLI, profiling, slow log, and analysis.

**Rationale**:

- Redis Insight-like behavior is explicitly requested.
- Redis is not table-oriented; key namespaces, logical DBs, data types, command execution, and monitoring are better represented by dedicated tools than by `quick-query` or `raw-query`.

**Alternatives considered**:

- Reuse `raw-query` and label it “commands”: rejected because the SQL editor, result rendering, and placeholder logic are wrong for Redis commands.
- Reuse `quick-query` and pretend keys are rows: rejected because Redis types and operations are not relational.

### 2.7 Use a dedicated MongoDB runtime and workspace, not relational projections of collections

**Decision**: Use the official `mongodb` Node driver and build dedicated MongoDB modules for collections/documents, query filter bars, schema sampling, aggregation pipelines, and index-aware metadata.

**Rationale**:

- MongoDB Compass-style behavior is explicitly requested.
- Document filters, aggregation pipelines, sampled schema summaries, and collection/index metadata do not fit the current relational table/view/function abstraction.

**Alternatives considered**:

- Map collections to SQL tables and reuse quick-query: rejected because it would lose document-native behavior and create a misleading UX.

### 2.8 Add dedicated route families and tab types for NoSQL workspaces

**Decision**: Keep the existing SQL `quick-query/[tabViewId].vue` route for SQL family tabs, and add dedicated route families for Redis and MongoDB tabs plus new `TabViewType` values.

**Rationale**:

- The current `quick-query` route component is SQL-specific and dispatches only SQL tab types.
- Dedicated route families make capability checks, lazy loading, status-bar behavior, and deep-link handling clearer.

**Alternatives considered**:

- Force Redis/MongoDB tabs through `quick-query/[tabViewId].vue`: rejected because the route name and switch logic are already SQL-biased.

### 2.9 Reset hidden or incompatible persisted UI state on connection-family switches

**Decision**: When the active connection family changes, any persisted unsupported sidebar item or route must fall back to that family’s default landing surface.

**Rationale**:

- `useActivityBarStore` persists the active activity item globally.
- If a user last viewed `ERD` under SQL and then opens Redis, the app must not leave them in a blank or broken state.

**Alternatives considered**:

- Preserve the invalid view and show empty states everywhere: rejected because it feels broken and defeats the hiding requirement.

---

## 3. Dependency Decisions

### 3.1 New runtime dependencies

**Decision**: Add these runtime packages:

- `@libsql/client` for Turso
- `redis` for Redis
- `mongodb` for MongoDB

Keep the existing SQL stack as-is:

- `pg`
- `mysql2`
- `sqlite3`
- `oracledb`
- `knex`

**Rationale**:

- These are the official transports for the new providers/families.
- The current `package.json` already contains the SQL runtime stack needed for the existing relational family.

### 3.2 Cloudflare D1 transport dependency choice

**Decision**: Use existing Nitro/`fetch` capabilities for D1 instead of introducing an extra Cloudflare SDK dependency for the first release.

**Rationale**:

- The D1 requirement is remote SQL execution against a known HTTP API.
- The app already has server-side HTTP facilities through Nitro.

---

## 4. Resolved Unknowns

| Unknown | Resolution |
| --- | --- |
| How should Redis/MongoDB differ from SQL in the shell? | Through a central capability registry that hides incompatible activity items and routes while swapping in family-specific panels. |
| Should D1/Turso be their own database families? | No. They are managed SQLite providers on the SQL family path. |
| How should D1 connect? | Server-side REST transport using Cloudflare account/database identifiers and bearer auth. |
| How should Turso connect? | Official libSQL client with URL, auth token, and optional branch selection. |
| Should Redis reuse raw-query? | No. Redis gets a dedicated browser/workbench/tooling workspace. |
| Should MongoDB reuse quick-query? | No. MongoDB gets dedicated documents/schema/aggregation workspaces. |
| How should persisted SQL-only sidebar state behave on Redis/MongoDB? | It must fall back to a supported family default instead of rendering broken UI. |

---

## 5. Highest-Risk Areas

1. Current shell state is persisted globally, so family switching can strand users on hidden tabs unless fallback logic is centralized.
2. D1 uses remote API semantics and permissions, so connection testing and error messages must be much more provider-aware than local SQLite.
3. Large Redis keyspaces and MongoDB collections require search-first, paged, or sampled UX to avoid loading too much data at once.
4. SQL-specific defaults still exist in `quick-query` and `raw-query`; touched flows must stop assuming PostgreSQL.
5. Route/tab additions for Redis and MongoDB require synchronized updates across `TabViewType`, `useTabManagement`, page entries, and status/empty-state components.

*** Add File: /Volumes/Cinny/Cinny/Project/HeraQ/specs/033-expand-db-support/data-model.md
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

*** Add File: /Volumes/Cinny/Cinny/Project/HeraQ/specs/033-expand-db-support/quickstart.md
# Quickstart: Expanded Database Support

**Feature**: 033-expand-db-support  
**Date**: 2026-04-28

---

## What This Feature Changes

This feature turns HeraQ into a family-aware multi-database client. D1 and Turso are added as managed SQLite providers that reuse SQL workflows, while Redis and MongoDB get dedicated workspaces, tools, and route/tab types because they are not RDS/relational cases. The app shell becomes capability-driven so SQL-only features disappear for Redis/MongoDB connections, and Redis/MongoDB-specific surfaces disappear for SQL connections.

---

## Files Expected to Change

| Area | Representative files |
| --- | --- |
| Connection model and persistence | `core/types/entities/connection.entity.ts`, `core/storage/entities/ConnectionStorage.ts`, Electron persistence schema files |
| Connection picker and form | `components/modules/connection/constants/index.ts`, `components/modules/connection/hooks/useConnectionForm.ts`, create/edit connection components |
| Capability registry and shell gating | `core/constants/connection-capabilities.ts`, `core/stores/useActivityBarStore.ts`, `components/modules/app-shell/activity-bar/hooks/useActivityMenu.ts`, `components/modules/app-shell/primary-side-bar/components/PrimarySideBar.vue` |
| SQL-family routing for managed SQLite | `server/api/managment-connection/health-check.ts`, `server/api/query/*.ts`, `server/infrastructure/driver/db-connection.ts`, new managed SQLite transport files |
| Redis runtime and UI | new `server/api/redis/**`, `server/infrastructure/nosql/redis/**`, `components/modules/redis-workspace/**`, `components/modules/management/redis-*` |
| MongoDB runtime and UI | new `server/api/mongodb/**`, `server/infrastructure/nosql/mongodb/**`, `components/modules/mongodb-workspace/**`, `components/modules/management/mongodb-*` |
| Tabs and routes | `core/stores/useTabViewsStore.ts`, `core/composables/useTabManagement.ts`, new `pages/[workspaceId]/[connectionId]/redis/**`, new `pages/[workspaceId]/[connectionId]/mongodb/**`, existing `pages/[workspaceId]/[connectionId]/index.vue` |
| SQL-only feature guards | management panels, database tools, instance insights, schema diff, quick query, raw query, status/empty-state components |
| Tests | Vitest app-shell/management/unit tests and Playwright connection-family routing tests |

---

## Developer Walkthrough

### 1. Extend the connection model with provider-aware family data

1. Add `providerKind` and `managedSqlite` to the shared connection shape.
2. Introduce `method = 'managed'` for D1 and Turso.
3. Keep existing direct SQL and local SQLite records backward-compatible.

### 2. Build the capability registry before touching feature visibility

1. Create a single source of truth mapping connection family to visible activity-bar items, allowed tab types, default fallbacks, and hidden-feature reasons.
2. Apply that registry in the activity menu, primary sidebar, route entry pages, and tab-management helpers.
3. Make hidden-item fallback explicit so Redis/MongoDB never land on ERD or SQL-only tools.

### 3. Add managed SQLite providers on the SQL path

1. Extend the connection form so SQLite lets users choose between local file, Cloudflare D1, and Turso.
2. Implement D1 validation/query transport through the Cloudflare API.
3. Implement Turso transport through `@libsql/client`.
4. Keep both providers on the existing SQL explorer/query surface instead of inventing a separate “cloud SQLite” workspace.

### 4. Build Redis as its own workspace family

1. Add Redis connection support in the picker and health-check flow.
2. Create Redis browser, value editor, workbench, profiler/slowlog, and analysis modules.
3. Replace SQL-centric result routing with Redis-specific tab types and pages.
4. Hide SQL-only surfaces for Redis connections.

### 5. Build MongoDB as its own workspace family

1. Add MongoDB connection support in the picker and validation flow.
2. Create collection/document browsing, filter bar, schema sampling, aggregation, and index-oriented modules.
3. Add MongoDB-specific tab types and page entries.
4. Hide SQL-only surfaces and show only the MongoDB-relevant sidebar panels.

### 6. Guard routes, tabs, and empty states by family

1. Update `TabViewType` and `useTabManagement` so unsupported tabs cannot be opened for the current family.
2. Update route entry components to redirect or show actionable unavailable states when a URL targets the wrong family.
3. Replace SQL-only empty-state copy in the connection root with family-aware guidance.

### 7. Verify switching behavior between families

1. Open a SQL connection, set the sidebar to ERD, then switch to Redis and confirm the shell falls back to a supported Redis surface.
2. Switch back to SQL and confirm SQL-specific tabs still behave normally.
3. Repeat with MongoDB and SQL-only routes such as schema diff or user permissions.

---

## Local Verification Checklist

- [ ] Cloudflare D1 connection can be created, validated, saved, reopened, and routed into SQL workflows.
- [ ] Turso connection can be created, validated, saved, reopened, and routed into SQL workflows with visible active-branch context when applicable.
- [ ] Redis connection hides `Schemas`, `ERD`, `UsersRoles`, and SQL-only database tools.
- [ ] Redis connection exposes key browsing, type-aware value inspection, workbench/command execution, and at least one operational tool surface.
- [ ] MongoDB connection hides `ERD`, `UsersRoles`, schema diff, and SQL-only backup/restore/instance-insight surfaces.
- [ ] MongoDB connection exposes collection browsing, document filtering, schema analysis, and aggregation workflow entry points.
- [ ] Opening a connection with a previously persisted unsupported sidebar tab redirects to a supported family default without blank UI.
- [ ] Existing SQL connections keep all current SQL workflows and do not show Redis/MongoDB-only tools.
- [ ] Touched SQL paths no longer default silently to PostgreSQL when the active connection type is something else.

---

## Suggested Implementation Order

1. Connection model expansion and provider/family capability registry
2. Activity bar, primary sidebar, route, and tab gating
3. Managed SQLite providers for D1 and Turso on the SQL path
4. Redis workspace runtime and UI
5. MongoDB workspace runtime and UI
6. Family-aware empty states, status bar, and command-palette updates
7. Focused Vitest and Playwright regression coverage

*** Add File: /Volumes/Cinny/Cinny/Project/HeraQ/specs/033-expand-db-support/contracts/connection-family-capability-contract.md
# Contract: Connection Family Capability Gating

**Feature**: 033-expand-db-support  
**Generated**: 2026-04-28  
**Data Model**: [../data-model.md](../data-model.md)

---

## Summary

This contract defines how the active connection family controls visible activity-bar items, sidebar panels, routes, and tab types. It exists specifically to satisfy the requirement that Redis and MongoDB behave differently from RDS/SQL connections, with incompatible features hidden in both directions.

---

## 1. Family Classification Contract

Every active connection MUST resolve to exactly one family:

| Connection type / provider | Family |
| --- | --- |
| Postgres, MySQL, MariaDB, Oracle | `sql` |
| SQLite file | `sql` |
| Cloudflare D1 | `sql` |
| Turso | `sql` |
| Redis | `redis` |
| MongoDB | `mongodb` |

The family, not the raw database type alone, is the authoritative input for shell visibility.

---

## 2. Activity Bar Visibility Matrix

| Activity item | SQL family | Redis family | MongoDB family |
| --- | --- | --- | --- |
| `Explorer` | Visible | Visible | Visible |
| `Schemas` | Visible | Hidden | Visible |
| `ERD` | Visible | Hidden | Hidden |
| `UsersRoles` | Visible | Hidden | Hidden |
| `DatabaseTools` | Visible | Visible | Visible |
| `Agent` | Visible | Visible | Visible |

### Rules

- Hidden items MUST not render in the activity bar.
- Hidden items MUST not be focusable through keyboard or command-palette shortcuts.
- If the persisted active item is hidden for the current family, the shell MUST switch to the family default instead.

### Defaults

| Family | Default activity item |
| --- | --- |
| `sql` | Existing SQL default (`Schemas` unless a more appropriate tab is active) |
| `redis` | `Explorer` |
| `mongodb` | `Explorer` |

---

## 3. Sidebar Panel Dispatch Contract

The shell MAY reuse activity item IDs across families, but the rendered panel MUST match the family.

| Activity item | SQL panel | Redis panel | MongoDB panel |
| --- | --- | --- | --- |
| `Explorer` | SQL explorer | Redis browser | MongoDB collections explorer |
| `Schemas` | SQL schema tree | N/A | MongoDB schema analysis |
| `DatabaseTools` | Backup/restore, schema diff, instance-insight launcher | Redis workbench/tools | MongoDB aggregations/index tools |

`ERD` and `UsersRoles` are SQL-only and must not dispatch a placeholder component for Redis or MongoDB.

---

## 4. Route and Tab Compatibility Contract

### SQL-only routes

These route families are SQL-only:

- `/[workspaceId]/[connectionId]/quick-query/**`
- `/[workspaceId]/[connectionId]/user-permissions/**`
- `/[workspaceId]/[connectionId]/instance-insights/**`
- `/[workspaceId]/[connectionId]/schema-diff/**`
- SQL-only database-tools pages

### NoSQL-only routes

These route families are family-specific:

- `/[workspaceId]/[connectionId]/redis/**`
- `/[workspaceId]/[connectionId]/mongodb/**`

### Rules

- The app MUST reject navigation to a route family that is incompatible with the current connection family.
- On incompatible navigation, the app MUST redirect to the current family’s default landing surface.
- The redirect MUST be silent for passive state recovery and user-visible only when the user explicitly invoked an unavailable feature.

---

## 5. Unsupported Feature Contract

### Proactive hiding

When a feature is clearly incompatible with the family, it SHOULD be hidden before the user can invoke it.

Examples:

- ERD under Redis or MongoDB
- Redis workbench under SQL
- MongoDB aggregation tab under Redis

### Explicit unavailable states

When a feature is visible at a generic surface but unavailable due to permissions or provider limits, the app MUST show an actionable unavailable state.

Examples:

- MongoDB index metadata hidden by server role
- Redis slow log not accessible with current ACL
- D1 operation unsupported by provider transport

---

## 6. Incompatible Persisted State Contract

The following persisted state MUST be revalidated on connection activation:

- `activityActive`
- current route
- open tab type for the active route

If any of the above is incompatible with the current family, HeraQ MUST:

1. choose the family default activity item,
2. navigate to a compatible route or connection root,
3. preserve the rest of the workspace state without deleting saved connections.

*** Add File: /Volumes/Cinny/Cinny/Project/HeraQ/specs/033-expand-db-support/contracts/managed-sqlite-session-contract.md
# Contract: Managed SQLite Sessions (Cloudflare D1 and Turso)

**Feature**: 033-expand-db-support  
**Generated**: 2026-04-28  
**Data Model**: [../data-model.md](../data-model.md)

---

## Summary

This contract defines how Cloudflare D1 and Turso are represented and used inside HeraQ. Both providers are treated as managed SQLite sessions: they connect differently from local SQLite, but once connected they must route into HeraQ’s SQL-family explorer and query surfaces rather than into separate NoSQL workspaces.

---

## 1. Connection Variants

### Variant A: Cloudflare D1

```json
{
  "type": "sqlite3",
  "providerKind": "cloudflare-d1",
  "method": "managed",
  "managedSqlite": {
    "provider": "cloudflare-d1",
    "accountId": "cf-account-id",
    "databaseId": "d1-database-id",
    "apiToken": "token"
  }
}
```

### Variant B: Turso

```json
{
  "type": "sqlite3",
  "providerKind": "turso",
  "method": "managed",
  "managedSqlite": {
    "provider": "turso",
    "url": "libsql://example-db.turso.io",
    "authToken": "token",
    "branchName": "main"
  }
}
```

---

## 2. Session Routing Invariants

- D1 and Turso MUST resolve to the `sql` family.
- D1 and Turso MUST open the SQL-family activity bar and routes.
- D1 and Turso MUST NOT open Redis or MongoDB workspace modules.
- Local SQLite file selection remains a separate provider kind from D1 and Turso.

---

## 3. Runtime Transport Expectations

### Cloudflare D1

- The server runtime MUST execute SQL through a D1-specific remote transport.
- The transport MUST use provider credentials from the managed SQLite config.
- Validation failures MUST return provider-aware errors such as invalid account, database, token, or permission scope.

### Turso

- The server runtime MUST execute SQL through `@libsql/client`.
- The session MUST preserve the selected database URL and auth token.
- If a branch is specified, the session header or connection context MUST display it.
- If a saved branch is no longer available, validation/open MUST fail with an actionable message.

---

## 4. SQL Workflow Contract

Once connected, both providers MUST support the same core SQL-family entry points as other SQLite-compatible sessions where the provider allows it:

- schema browsing
- table browsing
- SQL query execution
- result inspection

Provider limitations MUST be surfaced as provider-specific unavailable states rather than by silently redirecting the user elsewhere.

---

## 5. Hidden Feature Rules

Even though D1 and Turso are part of the SQL family, not every SQL admin feature is automatically required.

### Required for first release

- connection validation
- save/reopen
- SQL-family explorer access
- query execution

### Provider-limited or optional

- backup/restore
- instance insights
- schema diff

When these are not supported, HeraQ MUST keep the session in the SQL family while showing a clear unavailable state.

---

## 6. Backward Compatibility

- Existing local SQLite connections MUST remain valid.
- Existing SQL route logic may stay intact for `type = sqlite3`, but touched flows MUST branch on `providerKind` when transport behavior differs.
- Managed SQLite state MUST not break previously saved SQLite file records.

*** Add File: /Volumes/Cinny/Cinny/Project/HeraQ/specs/033-expand-db-support/contracts/nosql-workspace-contract.md
# Contract: NoSQL Workspaces (Redis and MongoDB)

**Feature**: 033-expand-db-support  
**Generated**: 2026-04-28  
**Data Model**: [../data-model.md](../data-model.md)

---

## Summary

This contract defines the minimum workspace behavior for Redis and MongoDB. Both families require dedicated UI and server operations instead of reusing SQL-only query or schema surfaces. This is the direct response to the requirement that Redis/MongoDB are different from RDS/relational workflows and need some new features while hiding incompatible SQL features.

---

## 1. Redis Workspace Contract

### Visible shell surfaces

- `Explorer` -> Redis browser
- `DatabaseTools` -> Redis workbench/tools
- `Agent` -> shared agent surface

### Hidden shell surfaces

- `Schemas`
- `ERD`
- `UsersRoles`
- SQL-only backup/restore and schema diff entry points

### Minimum first-release tools

- key browser with list/tree views
- namespace/key-pattern filters
- logical database selection when available
- type-aware value viewer/editor
- command workbench/CLI
- at least one operational surface from profiler, slow log, or keyspace analysis

### Server operations

Redis workspaces MUST use Redis-specific server routes and MUST NOT send commands through SQL query endpoints.

Representative route family:

- `/api/redis/browser/*`
- `/api/redis/workbench/*`
- `/api/redis/analysis/*`

---

## 2. MongoDB Workspace Contract

### Visible shell surfaces

- `Explorer` -> database/collection explorer
- `Schemas` -> schema analysis surface
- `DatabaseTools` -> aggregation/index-oriented tools
- `Agent` -> shared agent surface

### Hidden shell surfaces

- `ERD`
- `UsersRoles`
- SQL-only quick-query and raw-query flows
- SQL-only backup/restore, schema diff, and instance-insight entry points unless a later MongoDB-specific equivalent exists

### Minimum first-release tools

- database and collection browser
- document results in grid and JSON-oriented views
- query/filter bar
- schema sampling/shape analysis
- aggregation pipeline workflow
- collection metadata with index visibility when permitted

### Server operations

MongoDB workspaces MUST use MongoDB-specific server routes and MUST NOT reuse SQL metadata or SQL query endpoints.

Representative route family:

- `/api/mongodb/documents/*`
- `/api/mongodb/schema/*`
- `/api/mongodb/aggregations/*`
- `/api/mongodb/indexes/*`

---

## 3. Cross-Family Hiding Rules

- Redis-only tools MUST NOT appear for SQL or MongoDB connections.
- MongoDB-only tools MUST NOT appear for SQL or Redis connections.
- SQL-only tools MUST NOT appear for Redis or MongoDB connections.
- Shared surfaces such as Agent may stay visible, but their context payload must respect the active family.

---

## 4. Route and Tab Rules

- Redis tabs MUST use Redis-specific tab types and page entries.
- MongoDB tabs MUST use MongoDB-specific tab types and page entries.
- Neither family may route through SQL-only `TabViewType` values such as table/view/function detail, ERD, user permissions, schema diff, or raw SQL file tabs.

If a user deep-links into an incompatible route, HeraQ MUST redirect to the family’s default landing surface.

---

## 5. Permission and Capability States

The app MUST distinguish between:

- hidden because the family does not support the feature at all,
- visible but unavailable because the connected account lacks permission,
- visible and active because the provider/family supports the feature.

This distinction is required for:

- Redis slow log, profiler, and analysis tools
- MongoDB schema, aggregation, and index metadata
- any future Redis ACL or MongoDB admin surfaces

