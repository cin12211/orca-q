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
- [ ] Redis connection hides `Explorer`, `ERD`, `UsersRoles`, and SQL-only database tools while exposing key browsing from the `Schemas` sidebar.
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
