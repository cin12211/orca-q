# Knex Multi-Database Support — Phase 1: Redshift + CockroachDB — Design

Date: 2026-08-10
Branch: TBD (to be created off `main`)
Scope: `core/constants/database-client-type.ts`, `core/helpers/parser-connection-string.ts`, `server/infrastructure/driver/`, `server/infrastructure/database/adapters/{metadata,tables,views}/`, `components/modules/connection/`, `components/modules/raw-query/utils/commandType.ts`, `components/base/code-editor/states/sqlParserConfig.ts`, `test/fixtures/containers/`

## Context

OrcaQ supports Postgres, MySQL, MariaDB, OracleDB, SQLite via knex-backed adapters (`server/infrastructure/driver/`). The user wants to extend database support toward knex's full dialect list (https://knexjs.org/), starting with **MSSQL, OracleDB, Amazon Redshift, CockroachDB**.

Investigation findings that shaped scope:

- **OracleDB is already fully supported** (driver adapter, metadata adapter, factory wiring all exist) — no work needed.
- **MSSQL is partially started**: `DatabaseClientType.MSSQL` enum value and a dedicated ADO.NET connection-string parser (`parseSqlServer` in `core/helpers/parser-connection-string.ts`) already exist, but there is no driver adapter, no metadata adapter, no factory entry, and no `tedious` npm driver installed. This is a much larger, higher-risk piece of work (new driver, introspection written from scratch against `sys.*` catalog views) and is deferred to a separate future spec.
- **Redshift and CockroachDB** are not in the codebase yet, but both are wire-compatible with Postgres — knex ships `redshift` and `cockroachdb` dialects that both `require('../postgres')` internally and reuse the `pg` npm driver already installed. This makes them the cheapest, lowest-risk types to add first.

This spec covers **Phase 1 only: Redshift + CockroachDB**. MSSQL is Phase 2, specced separately later.

### In scope (Phase 1)

- Raw query execution (SQL editor) against Redshift and CockroachDB connections.
- Schema browser: tables, columns, views.
- ERD (entity relationship diagram): tables, columns, foreign-key relationships.

### Out of scope (Phase 1)

- MSSQL (Phase 2, separate spec).
- Quick-query module (table data browsing/editing UI) — the underlying adapter interface (`IDatabaseTableAdapter`) must still be fully implemented (TypeScript contract), but bulk update/delete/export methods are implemented by straight inheritance from the Postgres adapter with no dialect-specific tuning; they are not manually verified in this phase.
- Database roles/users, instance insights, metrics, database tools tabs for Redshift/CockroachDB — capability profile already hides nothing extra here since both are SQL-family, but no adapter-level work is done to make these correct/complete for the new dialects.
- Redshift integration testing against a real cluster (no official local emulator exists — see Testing section).

---

## Architecture — dedicated subclasses per dialect

Codebase precedent for closely-related dialects is `MysqlAdapter`, which takes an optional `dbType` constructor param to serve both `MYSQL` and `MARIADB` from one file (`server/infrastructure/driver/mysql.adapter.ts`, wired in `factory.ts`). That parameterized-single-class approach was considered but **rejected for this feature** in favor of one dedicated class per dialect, each in its own file — matching the module-architecture rule of one file/one purpose and making it trivial to add Redshift-only or CockroachDB-only overrides later without touching a shared file.

### Driver layer (raw query)

- `server/infrastructure/driver/postgres.adapter.ts` — minimal refactor: the constructor currently hardcodes `client: DatabaseClientType.POSTGRES` in the knex config (line 63) and `super(DatabaseClientType.POSTGRES, ...)` (line 87). Both become overridable (e.g. a `protected static readonly knexClient` / constructor param with a `DatabaseClientType.POSTGRES` default) so subclasses can override just the client identifier. No behavior change for existing Postgres connections.
- `server/infrastructure/driver/redshift.adapter.ts` (new) — `class RedshiftAdapter extends PostgresAdapter`, overrides the knex client to `'redshift'`.
- `server/infrastructure/driver/cockroachdb.adapter.ts` (new) — `class CockroachAdapter extends PostgresAdapter`, overrides the knex client to `'cockroachdb'`.
- `server/infrastructure/driver/factory.ts` — add `REDSHIFT`/`COCKROACHDB` entries to `ADAPTER_FACTORIES`, pointing at the two new classes.

`_rawQuery`/`_rawOut`/`_streamQuery`/`_getNativeSql` are inherited unchanged — both dialects return the same pg-shaped result objects.

### Metadata / tables / views layer (schema browser + ERD)

Same subclassing pattern, one new directory per dialect (mirroring the existing `mysql/oracle/postgres/sqlite` layout):

- `server/infrastructure/database/adapters/metadata/redshift/redshift-metadata.adapter.ts` extends `PostgresMetadataAdapter`.
- `server/infrastructure/database/adapters/metadata/cockroachdb/cockroachdb-metadata.adapter.ts` extends `PostgresMetadataAdapter`.
- Same for `adapters/tables/{redshift,cockroachdb}/` and `adapters/views/{redshift,cockroachdb}/`.
- `metadata.factory.ts`, `tables.factory.ts`, `views.factory.ts` — add the two new dbType entries.

Methods that map to Postgres features neither dialect supports (RLS, RULE, TRIGGER — see gaps table below) are overridden in the subclass to return an empty result rather than inheriting a query that would throw against a catalog view that doesn't exist or behaves differently.

---

## Enum, connection string, family gating

- `core/constants/database-client-type.ts`: add `REDSHIFT = 'redshift'` and `COCKROACHDB = 'cockroachdb'` to `DatabaseClientType`, and to `SQL_DATABASE_CLIENT_TYPES`. `resolveConnectionFamily` (`core/constants/connection-capabilities.ts`) already resolves anything in `SQL_DATABASE_CLIENT_TYPES` to `EConnectionFamily.SQL`, so no change needed there — both new types automatically get the full SQL capability profile (Schemas, ERDiagram, UsersRoles, DatabaseTools, Agent visible; the "out of scope" items above are visible in the UI but not dialect-tuned yet).
- `core/helpers/parser-connection-string.ts`:
  - Add `redshift` → `{ type: DatabaseClientType.REDSHIFT, providerKind: EConnectionProviderKind.DIRECT_SQL }` and `cockroachdb` → `{ type: DatabaseClientType.COCKROACHDB, providerKind: EConnectionProviderKind.DIRECT_SQL }` to `SCHEME_MAP`. Both go through the existing generic `parseUri` — no dedicated parser function needed (unlike MSSQL's ADO.NET format).
  - Add to `DEFAULT_PORTS`: Redshift `5439`, CockroachDB `26257`.
- Connection string formats (added to the documented list): `redshift://user:password@host:5439/database`, `cockroachdb://user:password@host:26257/database`. Distinct schemes chosen over reusing `postgres://` + a variant selector, consistent with how `mariadb://` is already kept distinct from `mysql://` despite wire compatibility — avoids ambiguity about which dialect-specific code path a connection uses.

---

## UI touch points

- `components/modules/connection/constants/index.ts` — add Redshift and CockroachDB to the selectable connection type list (icon, label, default port).
- `components/modules/connection/hooks/useConnectionForm.ts` — add validation/build-connection-string cases for the two new schemes.
- `components/modules/raw-query/utils/commandType.ts` and `components/base/code-editor/states/sqlParserConfig.ts` — map both new types to a SQL dialect for the editor (autocomplete/formatting/highlighting). CockroachDB maps to the existing `postgresql` dialect as-is. Redshift maps to `postgresql` as a fallback unless the SQL parser library in use ships a dedicated `redshift` dialect — if it doesn't, Redshift-only keywords (`DISTKEY`, `SORTKEY`, etc.) simply won't autocomplete; this is acceptable for Phase 1.
- `components/modules/app-shell/activity-bar/constants/activityBarVisibility.ts` — no change; gating is family-based and both new types resolve to `EConnectionFamily.SQL` automatically.

---

## Known dialect gaps

Where Redshift/CockroachDB diverge from Postgres, the adapter must return an explicit empty/"not supported" result rather than letting an inherited Postgres-specific query fail against a missing or differently-shaped catalog view.

| Feature                  | Redshift                                                                      | CockroachDB                 | Phase 1 behavior                                                                                |
| ------------------------ | ----------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| Row-Level Security (RLS) | not supported                                                                 | supported (24.2+)           | both return "not supported" for simplicity                                                      |
| `CREATE RULE`            | not supported                                                                 | not supported               | both return empty                                                                               |
| Triggers                 | not supported                                                                 | not supported               | both return empty                                                                               |
| `pg_indexes` / indexes   | present but semantically different (DISTKEY/SORTKEY are not ordinary indexes) | compatible with Postgres    | Redshift: return what the catalog reports as-is, no special DISTKEY/SORTKEY handling in Phase 1 |
| Extensions/schemas       | limited support                                                               | good Postgres compatibility | no special-casing beyond what's covered above                                                   |

Methods overridden to return empty/not-supported must still satisfy the `IDatabaseTableAdapter`/`IDatabaseMetadataAdapter` interface contracts and must not throw — consistent with the existing business rule that failed operations should surface actionable messages rather than crash the UI.

---

## Testing

- **CockroachDB**: add the official `cockroachdb/cockroach` docker image as a new service in `test/fixtures/containers/sql-services.compose.yml`, add a `cockroachdb` profile to `scripts/test-services/start-fixtures.sh` / `stop-fixtures.sh` (same pattern as the existing `postgres`/`mysql`/`mariadb` profiles). Write integration tests under the API/integration suite covering raw query, metadata, tables, and views — same shape as the existing Postgres integration tests.
- **Redshift**: no official local emulator exists (AWS provides none), so integration testing is not possible in CI. Phase 1 covers Redshift with **unit tests only** — mocking the knex client and asserting the SQL generated by each adapter method is valid Redshift syntax. This is a known, accepted gap: real verification requires a live AWS Redshift cluster, which the user will need to do manually; it is not something that can be automated or verified by Claude in this environment.
- Both new types must pass `bun run typecheck` and the existing unit suite (`bun test:unit`) per the repo's verification rules — no source change ships without this regardless of which DB type it touches.
