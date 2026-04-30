# Technical Plan: Multi-DB Instance Insights

## Objective

Thiết kế lại kiến trúc `Instance Insights` để:

- không còn PG-first ở tầng type và adapter contract
- cho phép implement riêng theo DB type
- giữ shared shell hợp lý ở UI

## Current Technical State

Current code has:

- PG-specific shared types:
  - `InstanceInsightsDashboard`
  - `InstanceInsightsState`
  - `InstanceInsightsConfiguration`
  - `InstanceInsightsReplication`
- one adapter interface for all DBs
- one main PG-oriented panel
- non-Postgres adapters mostly unsupported

References:

- `core/types/instance-insights.types.ts`
- `server/infrastructure/database/adapters/instance-insights/types.ts`
- `server/infrastructure/database/adapters/instance-insights/postgres/postgres-instance-insights.adapter.ts`
- `server/infrastructure/database/adapters/instance-insights/mysql/mysql-instance-insights.adapter.ts`
- `server/infrastructure/database/adapters/instance-insights/oracle/oracle-instance-insights.adapter.ts`
- `server/infrastructure/database/adapters/instance-insights/sqlite/sqlite-instance-insights.adapter.ts`

## Core Technical Decision

### Decision 1

Không mở rộng tiếp PG types hiện tại cho các DB khác.

### Decision 2

Chuyển sang per-db contracts và capability metadata.

### Decision 3

UI shell shared, section components per DB type.

## Target Architecture

### 1. Domain contracts

Thay vì một contract duy nhất, tạo:

- `PostgresInstanceInsightsContract`
- `MysqlInstanceInsightsContract`
- `MariaDbInstanceInsightsContract`
- `OracleInstanceInsightsContract`
- `SqliteInsightsContract`
- `SqlServerInstanceInsightsContract`

Mỗi contract có:

- `dbType`
- `title`
- `sections`
- `capabilities`
- `payload`

### 2. Capability model

Đề xuất capability layer:

- `supportsSessionInspection`
- `supportsLockInspection`
- `supportsConfiguration`
- `supportsReplication`
- `supportsDataGuard`
- `supportsStorageHealth`
- `supportsIntegrityChecks`
- `supportsCancelQuery`
- `supportsTerminateConnection`
- `supportsReplicationActions`

### 3. UI composition

Tách UI theo 2 lớp:

- shared shell
  - page header
  - section tabs
  - error/loading/empty states
- db-specific section components

Ví dụ:

- `MysqlInstanceInsightsPanel.vue`
- `MariaDbInstanceInsightsPanel.vue`
- `OracleInstanceInsightsPanel.vue`
- `SqliteInsightsPanel.vue`
- `SqlServerInstanceInsightsPanel.vue`

### 4. Server adapter structure

Tách adapter outputs theo DB type, không ép cùng method names nếu không tự nhiên.

Preferred shape:

- `getOverview()`
- `getSessions()`
- `getConfiguration()`
- `getReplication()`
- `getMemoryAndLimits()`
- `getStorageHealth()`
- `runIntegrityCheck()`
- `getAvailability()`

DB nào không support thì không implement capability đó.

## Proposed Delivery Phases

## Phase 0: Architecture Refactor

### Deliverables

- new domain types
- capability model
- adapter registry by DB type
- shared page shell refactor

### Tasks

1. Create new type folder for per-db insights
2. Introduce capability metadata
3. Refactor adapter factory to return DB-specific adapters
4. Decouple current PG panel from shared route
5. Keep Postgres backward-compatible during transition

### Acceptance

- current PG flow still works
- architecture allows plugging non-PG contracts cleanly

## Phase 1: MySQL

### Deliverables

- MySQL adapter
- MySQL panel
- overview, sessions/locks, config, replication

### Notes

- prefer `performance_schema` and `sys` views
- use `SHOW` only when appropriate

## Phase 2: MariaDB

### Deliverables

- MariaDB adapter
- MariaDB panel
- overview, sessions/locks, config, replication

### Notes

- do not blindly reuse MySQL query layer
- metadata lock support must be capability-gated

## Phase 3: SQLite

### Deliverables

- SQLite insights adapter
- SQLite panel
- overview, storage health, config, integrity

### Notes

- treat as database/file insights
- no fake replication/session tabs

## Phase 4: Oracle

### Deliverables

- Oracle adapter
- Oracle panel
- overview, sessions/locks, memory/limits, config, Data Guard

### Notes

- define minimum privileges early
- start single-instance first

## Phase 5: SQL Server

### Deliverables

- SQL Server runtime support in driver layer
- SQL Server domain adapters
- SQL Server insights panel
- overview, sessions/locks, config, availability

### Notes

- this phase is not only an `instance insights` task
- current codebase exposes `DatabaseClientType.MSSQL` in enum/parser/UI surfaces, but does not expose active SQL Server runtime adapter support
- package/runtime dependency and adapter-factory work must be completed first

## API / Adapter Refactor Recommendation

### Option A: Keep current endpoint names and vary payload by db type

Pros:

- smaller route churn

Cons:

- payload typing becomes awkward
- semantic mismatch remains

### Option B: New capability-based endpoints per section

Pros:

- cleaner long-term model
- closer to real DB semantics

Cons:

- more route churn

### Recommendation

Use hybrid approach:

- keep outer route namespace `/api/instance-insights/*`
- but change internals to section-based handlers and typed unions

## Suggested Type Strategy

### Shared discriminated union

Use a discriminated union with `dbType`.

Example design direction:

- `InstanceInsightsPayload = Postgres | Mysql | MariaDb | Oracle | Sqlite | SqlServer`

Use section-specific payloads:

- `OverviewSectionPayload`
- `SessionsSectionPayload`
- `ConfigSectionPayload`
- `ReplicationSectionPayload`
- `StorageSectionPayload`
- `IntegritySectionPayload`

## Suggested File Organization

### Client

- `components/modules/instance-insights/shared/*`
- `components/modules/instance-insights/postgres/*`
- `components/modules/instance-insights/mysql/*`
- `components/modules/instance-insights/mariadb/*`
- `components/modules/instance-insights/oracle/*`
- `components/modules/instance-insights/sqlite/*`
- `components/modules/instance-insights/sql-server/*`

### Server

- `server/infrastructure/database/adapters/instance-insights/postgres/*`
- `server/infrastructure/database/adapters/instance-insights/mysql/*`
- `server/infrastructure/database/adapters/instance-insights/mariadb/*`
- `server/infrastructure/database/adapters/instance-insights/oracle/*`
- `server/infrastructure/database/adapters/instance-insights/sqlite/*`
- `server/infrastructure/database/adapters/instance-insights/sql-server/*`

## Testing Strategy

### Unit

- section mappers
- capability detection
- response normalization

### Integration

- adapter queries against real DB containers / fixtures
- privilege-denied fallback behavior
- replication unavailable behavior

### E2E

- open insights tab by DB type
- correct tabs render
- unsupported sections show graceful messaging

## Environments Needed

- MySQL fixture with replication optional
- MariaDB fixture with replication optional
- Oracle environment with enough visibility into `V$` views
- SQLite sample db files
- SQL Server environment with DMV access and, if possible, an Always On test topology

## Risk Register

### Risk 1

PG-first code leaks into new contracts.

Mitigation:

- freeze PG types
- create new per-db types instead of extending old ones

### Risk 2

MariaDB and MySQL divergence underestimated.

Mitigation:

- separate docs and query plans
- no shared query assumptions unless proven

### Risk 3

Oracle privilege requirements block delivery.

Mitigation:

- define minimum grants before implementation
- phase Oracle after architecture is stable

### Risk 4

SQLite shoehorned into server model.

Mitigation:

- explicitly separate SQLite mental model in product and tech docs

## Implementation Backlog Suggestion

### Story 1

Refactor insight domain model to DB-specific contracts.

### Story 2

Refactor UI shell to capability-driven sections.

### Story 3

Implement MySQL overview and sessions.

### Story 4

Implement MySQL config and replication.

### Story 5

Implement MariaDB overview and sessions.

### Story 6

Implement MariaDB config and replication.

### Story 7

Implement SQLite overview and storage health.

### Story 8

Implement SQLite config and integrity.

### Story 9

Implement Oracle overview and sessions.

### Story 10

Implement Oracle memory/limits, config, and Data Guard.

### Story 11

Enable SQL Server driver/runtime support in database adapter layer.

### Story 12

Implement SQL Server overview and sessions/locks.

### Story 13

Implement SQL Server configuration and availability insights.
