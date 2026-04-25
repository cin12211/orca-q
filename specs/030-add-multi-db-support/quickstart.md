# Quickstart: Expanded Database Type Support

**Feature**: 030-add-multi-db-support  
**Date**: 2026-04-22

---

## What This Feature Changes

This feature expands the connection workflow from a Postgres-first flow into a capability-based multi-database flow. It adds new selectable database types, a desktop-only SQLite file picker, real low-level adapters for new drivers, and type-aware raw-query and structure-browsing paths. It does not promise full parity for every advanced database-management feature.

---

## Files Expected to Change

| Area                       | Representative files                                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database type model        | `core/constants/database-client-type.ts`, `core/types/entities/connection.entity.ts`, `core/stores/managementConnectionStore.ts`                                                                                                                     |
| Connection UI              | `components/modules/connection/constants/index.ts`, `components/modules/connection/hooks/useConnectionForm.ts`, `components/modules/connection/components/CreateConnectionModal.vue`, `components/modules/connection/components/ConnectionsList.vue` |
| Parser and display         | `core/helpers/parser-connection-string.ts`                                                                                                                                                                                                           |
| Desktop SQLite picker      | `electron/ipc/window.ts`, `electron/preload.ts`, Electron type declarations                                                                                                                                                                          |
| Low-level runtime adapters | `server/infrastructure/driver/factory.ts`, `server/infrastructure/driver/db-connection.ts`, `server/infrastructure/driver/mysql.adapter.ts`, new Oracle/SQLite adapters                                                                              |
| Core query/browse runtime  | `server/api/managment-connection/health-check.ts`, `server/api/query/*.post.ts`, metadata/tables/query adapter factories                                                                                                                             |
| Persistence                | `core/storage/entities/ConnectionStorage.ts`, `electron/persist/entities/ConnectionSQLiteStorage.ts`, `electron/persist/schema/connections.ts`                                                                                                       |
| Tests                      | `test/nuxt/components/modules/connection/hooks/useConnectionForm.test.ts`, `test/e2e/connection.test.ts`, `test/playwright/connection.spec.ts`, `test/playwright/pages/ConnectionModalPage.ts`                                                       |

---

## Developer Walkthrough

### 1. Expand the Shared Connection Model

1. Add a first-class MariaDB database type.
2. Extend connection method support with `file` for desktop SQLite.
3. Extend the persisted connection shape with `serviceName` and `filePath`.
4. Keep existing Postgres records backward-compatible by making new fields optional.

### 2. Update the Connection Creation Flow

1. Add MySQL, MariaDB, Oracle, and SQLite entries to the database picker with proper availability rules.
2. Update the connection wizard to branch by type and method:
   - `string` for server DB URL-style entry
   - `form` for structured TCP entry
   - `file` for desktop SQLite
3. Update placeholders, default ports, and validation rules per database type.
4. Keep the saved connection list parser-aware so it can still display saved connection summaries.

### 3. Add Desktop SQLite File Selection

1. Add a new IPC handler in `electron/ipc/window.ts` to open a native file dialog.
2. Expose that handler through `electron/preload.ts` using a narrow contextBridge wrapper.
3. Call the picker only when running under Electron.
4. Persist the returned file path on the connection profile and reuse it when reopening the connection.

### 4. Replace Low-Level Driver Stubs

1. Add runtime dependencies for `mysql2` and `oracledb`.
2. Replace the MySQL placeholder adapter with a real Knex-backed adapter.
3. Add Oracle and SQLite low-level adapters.
4. Update the adapter factory and adapter-cache key generation to support:
   - MySQL and MariaDB via TCP/URL inputs
   - Oracle via connection string or `serviceName`
   - SQLite via absolute file path

### 5. Make Core Query and Browse Paths Type-Aware

1. Require `type` on health-check and query-related requests.
2. Ensure raw-query and streaming hooks always pass the connection type.
3. Implement minimum metadata/tables browsing adapters needed to satisfy the “view available structures” requirement for newly supported DBs.
4. Preserve explicit unsupported behavior for advanced areas like roles, metrics, and import/export when no adapter exists.

### 6. Verify with Focused Tests

1. Unit-test the parser and form validation for MariaDB, Oracle, and SQLite file flows.
2. Add route-level tests for health-check payload variants.
3. Update Playwright connection-flow coverage for new picker options and SQLite desktop gating.
4. Verify existing Postgres tests still pass unchanged.

---

## Local Verification Checklist

- [ ] MySQL connection can be created, validated, saved, reopened, and queried
- [ ] MariaDB appears as a distinct database choice and persists as `mariadb`
- [ ] Oracle connection can be validated and used for raw query plus minimum structure browsing
- [ ] SQLite option appears only in Electron runtime
- [ ] Electron SQLite picker returns a file path and preserves it on the saved connection
- [ ] Missing SQLite file returns a clear error without deleting the saved connection
- [ ] Existing saved Postgres connections still open and query normally
- [ ] Unsupported secondary features return explicit disabled/501 behavior rather than silent fallback

---

## Suggested Implementation Order

1. Shared model, enum, parser, and persistence updates
2. Connection picker and form branching
3. Electron SQLite picker contract
4. Low-level MySQL/MariaDB, Oracle, and SQLite adapters
5. Health-check and raw-query type propagation
6. Minimum metadata/tables browsing adapters
7. Test and documentation updates
