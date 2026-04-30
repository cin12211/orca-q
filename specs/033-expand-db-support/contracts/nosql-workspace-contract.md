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
