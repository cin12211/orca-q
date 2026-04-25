# Research: Expanded Database Type Support

**Feature**: 030-add-multi-db-support  
**Generated**: 2026-04-22

---

## 1. Current Codebase State

### What Already Exists

| Path                                                            | Status               | Notes                                                                                                                                |
| --------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `components/modules/connection/constants/index.ts`              | Partial              | PostgreSQL is supported, MySQL is visible but flagged unsupported, MariaDB/SQLite/Oracle are absent from the picker                  |
| `components/modules/connection/hooks/useConnectionForm.ts`      | Partial              | Flow supports only `string` and `form` methods and generates Postgres/MySQL-oriented placeholders and URLs                           |
| `core/helpers/parser-connection-string.ts`                      | Partial              | Recognizes Postgres, MySQL, MariaDB-as-MySQL alias, and SQL Server style strings; no SQLite or Oracle scheme parsing                 |
| `server/infrastructure/driver/postgres.adapter.ts`              | Complete             | Only real low-level DB adapter today                                                                                                 |
| `server/infrastructure/driver/mysql.adapter.ts`                 | Stub                 | Throws placeholder errors and returns false from `healthCheck()`                                                                     |
| `server/infrastructure/driver/factory.ts`                       | Partial              | Registers Postgres + MySQL stub and explicitly rejects SQLite                                                                        |
| `server/infrastructure/database/adapters/*`                     | Mostly Postgres-only | Query, metadata, tables, views, functions, roles, metrics, and instance insights factories mostly only wire Postgres implementations |
| `electron/preload.ts` + `electron/ipc/window.ts`                | No file picker       | There is no existing desktop API for selecting a local SQLite file                                                                   |
| `core/types/entities/connection.entity.ts` + persistence layers | Partial              | Saved connection model has no `filePath` or Oracle-specific structured field                                                         |

### Key Observation — Multi-Database Support Is Uneven

The repo already contains enum values and a few UI utilities for `oracledb` and `sqlite3`, but the runtime path is still effectively Postgres-only. Several client/server flows silently rely on Postgres defaults when `type` is missing, which is a rollout risk for any new database support.

### Key Observation — SQLite Means Two Different Things Here

`better-sqlite3` is already in use for **internal Electron app persistence**, but the requested feature is about **user-selected external SQLite database files**. Those must remain separate concerns: app-storage SQLite should not be conflated with user-database connectivity.

---

## 2. Technology Decisions

### 2.1 MySQL and MariaDB Runtime Strategy

**Decision**: Use Knex with the MySQL dialect runtime (`client: 'mysql'`) backed by `mysql2`, while introducing a first-class `MARIADB` product type for user-visible selection and saved metadata.

**Rationale**:

- The feature spec requires MariaDB to be distinguishable in the UI and saved connection metadata.
- Knex documentation treats MySQL/MariaDB through the MySQL family client and requires an installed MySQL driver package.
- Sharing the same low-level adapter keeps the first release smaller while preserving room for MariaDB-specific behavior later.

**Alternatives considered**:

- Treat MariaDB purely as a parser alias to MySQL: rejected because it fails the product requirement to distinguish the type in picker and saved metadata.
- Add a fully separate MariaDB adapter stack immediately: rejected because the current repo does not yet demonstrate any MariaDB-specific behavior that justifies a second low-level implementation in the first milestone.

### 2.2 SQLite Connection Strategy

**Decision**: Represent user-facing SQLite as a desktop-only file-backed connection with a dedicated `FILE` connection method, a persisted `filePath`, and a secure Electron file-picker bridge. Use Knex `client: 'sqlite3'` with `connection.filename` for external SQLite database access.

**Rationale**:

- The feature spec explicitly limits SQLite to the app version, which maps to Electron runtime only.
- Electron’s recommended secure pattern is `ipcMain.handle(...)` in the main process plus a thin `contextBridge` wrapper in preload that returns the selected file path.
- Knex documents SQLite file-based connections through `client: 'sqlite3'` and `connection.filename`, and the repo already has `sqlite3` installed.
- Keeping external SQLite access on `sqlite3` avoids coupling user database access to the separate `better-sqlite3` persistence layer used internally by the app.

**Alternatives considered**:

- Reuse `better-sqlite3` for user-selected databases: rejected for the first milestone because it blurs the boundary between internal persistence and external DB connectivity and would require a separate synchronous adapter design choice.
- Accept SQLite URI/file strings in the web build: rejected because the browser runtime cannot reliably access local files and the feature is explicitly desktop-only.

### 2.3 Oracle Structured Input Scope

**Decision**: Support Oracle with two connection entry paths: connection string or structured form using `host`, `port`, `username`, `password`, and `serviceName`. Persist `serviceName` as an explicit field. Use Knex `client: 'oracledb'` with the `oracledb` driver.

**Rationale**:

- The existing generic `database` field is ambiguous for Oracle structured input.
- An explicit `serviceName` field is easier to validate and explain in UI than a generic free-form options bag.
- Knex supports Oracle through the `oracledb` client and requires the `oracledb` package.

**Alternatives considered**:

- Generic `options` bag for all new database types: rejected because it weakens validation and makes the UI harder to reason about.
- Full Oracle SID/service-name/TNS matrix in the first milestone: rejected because the feature spec only requires core connection and browsing/query workflows, not every Oracle connection style.

### 2.4 Unsupported Feature Signaling

**Decision**: Preserve the existing explicit unsupported contract: UI-disabled states where practical, and `501` adapter responses with clear `statusMessage` for server-side unsupported features.

**Rationale**:

- The repo already uses visible unsupported indicators in the connection picker and `501` adapter errors in server-side factories.
- The feature spec requires the system to communicate limitations clearly instead of exposing broken behavior.
- This allows the first milestone to ship core workflows without pretending deeper Postgres-only features already work.

**Alternatives considered**:

- Silent Postgres fallback: rejected because it is unsafe and would hide real database-specific behavior gaps.
- Hide every secondary feature by database type in the UI immediately: rejected because many surfaces are already generic and it is simpler to keep the current explicit server-side unsupported contract for the first milestone.

### 2.5 Core Workflow Rollout Policy

**Decision**: Treat connection creation, health check, reopen, raw query, and minimum structure browsing as the required baseline for the new database types. Leave roles, metrics, instance insights, import/export, and other deeper admin features explicitly unsupported unless a dedicated adapter exists.

**Rationale**:

- This matches the feature spec’s bounded scope around core workflows.
- The current adapter tree shows that most advanced features are Postgres-catalog-specific.
- A capability-based rollout is smaller and safer than pretending full parity exists.

**Alternatives considered**:

- Full adapter parity across all database features in one release: rejected because the current codebase is not close to that state.
- Limit support to connection testing only: rejected because the spec requires usable post-connection workflows.

---

## 3. Dependency and Packaging Decisions

### 3.1 Required Runtime Packages

**Decision**: Add `mysql2` and `oracledb` to runtime dependencies. Keep existing `sqlite3` for external SQLite database access and existing `better-sqlite3` for internal Electron persistence only.

**Rationale**:

- Knex requires a database-specific driver package per client.
- `mysql2` is the missing dependency for real MySQL/MariaDB connections.
- `oracledb` is required for Oracle support and is currently absent from `package.json`.

**Alternatives considered**:

- Keep MySQL/MariaDB behind the existing stub without adding dependencies: rejected because it cannot satisfy the spec.
- Switch the whole app to a single SQLite library for both persistence and external DB access: rejected because the use cases are distinct and already separated in the repo.

### 3.2 Type Propagation Rule

**Decision**: All connection-dependent routes and hooks must pass an explicit database `type`; implicit Postgres fallback is not acceptable in new or updated code paths.

**Rationale**:

- Several current flows omit `type`, which silently routes work through Postgres assumptions.
- New database support will be fragile unless `type` is treated as mandatory through connection, health-check, raw-query, and structure-browsing flows.

**Alternatives considered**:

- Keep fallback-to-Postgres behavior in mixed paths: rejected because it will mask bugs and misroute requests.

---

## 4. Resolved Unknowns

| Unknown                                              | Resolution                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| How should MariaDB appear?                           | First-class product type, normalized to MySQL-family runtime adapter behavior            |
| How should desktop SQLite be entered?                | New `FILE` connection method with persisted `filePath` and Electron-only picker          |
| Which SQLite driver should power external DB access? | Knex `sqlite3` for external user DBs; keep `better-sqlite3` for internal app persistence |
| How should Oracle structured input be modeled?       | Explicit `serviceName` field plus existing host/port/user/password                       |
| How should unsupported advanced features behave?     | Explicit disabled/501 contract, no silent fallback                                       |
| What is the minimum release scope?                   | Connect, validate, save/reopen, raw query, and minimum metadata/tables browsing          |

---

## 5. Highest-Risk Areas

1. `oracledb` packaging and environment requirements may complicate local setup, CI, and Electron distribution.
2. External SQLite support needs a new desktop file-picker API and a clear boundary from internal Electron persistence.
3. Existing Postgres defaults in raw-query and metadata flows make silent fallback a real regression risk unless type propagation is tightened.
4. Parser updates and saved-connection display must land together, or the connection list can break on newly supported schemes.
