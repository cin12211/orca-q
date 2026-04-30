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
