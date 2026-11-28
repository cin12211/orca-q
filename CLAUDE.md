# CLAUDE.md

OrcaQ (repo name HeraQ) is a next-gen database client: Nuxt 3 + Vue 3 +
TypeScript, with Electron desktop support.

## Repo Layout

- `components/base` holds reusable primitives; `components/ui` holds
  shadcn-style components.
- `components/base/data-grid/` is the shared AG Grid wrapper (copy context menu,
  generic renderers/headers). Read `components/base/data-grid/docs/USAGE_GUIDE.md`
  before changing shared grid behavior or adding a generic grid feature.
- `components/modules/` holds feature modules, e.g. `quick-query`, `raw-query`,
  `connection`, `management` (sidebar panels: `explorer`, `schemas`,
  `erd-diagram`, `agent`, broker/redis browsers, database tools), `erd-diagram`,
  `workspace`, `settings`, and the per-engine `*-workspace` modules.
- `components/modules/quick-query/` is table browsing/editing. Keep extracted
  composables in its `hooks/` and pure helpers in its `utils/`.
- `core/` holds shared frontend logic: `composables`, `stores`, `contexts`,
  `helpers`, `constants`, `types`, `persist`/`storage`, `sql-dialect`.
- `server/` holds Nuxt API routes and backend infrastructure (DB adapters,
  drivers, metadata, query execution, Redis, AI, MCP).
- `electron/` holds the desktop wrapper, persistence schema and desktop-only code.
- `pages/` holds Nuxt file-based routes.
- `plugins/` holds Nuxt plugins. Be careful with app initialization and storage
  hydration: many Nuxt tests depend on them.
- `test/unit`, `test/nuxt`, `test/api` and `test/playwright` hold the test suites.
- `docs/` holds architecture, structure, module flow, business rules, storage and
  testing docs. Read the matching doc before changing broad behavior.
- Issues are tracked as local markdown files under `.scratch/<feature-slug>/`
  (git-ignored).

## Code Patterns

### Vue Components

All components use `<script setup lang="ts">` with this order:

1. Imports
2. Props & Emits (`defineProps`, `defineEmits`)
3. Stores & Composables
4. Refs & Reactive State
5. Computed Properties
6. Functions
7. Lifecycle Hooks
8. Watchers

File order: `<script setup>`, then `<template>`, then `<style scoped>` (if needed).
Prefer Tailwind utilities; use `<style scoped>` only when Tailwind cannot do it.

### TypeScript

- `interface` for object shapes, `type` for unions/intersections, `enum` for
  fixed sets with semantic meaning (e.g. `enum TabViewType { AllERD = 'AllERD' }`).
- Avoid `any`; prefer explicit types or `unknown` with type guards.

### Imports

- Use the `~/` alias: `import { useSchemaStore } from '~/core/stores'`.
- Avoid relative paths across modules (`../../../`).
- Each module has an `index.ts` barrel export.

### State Management

| State Type             | Use For                         | Location                                     |
| ---------------------- | ------------------------------- | -------------------------------------------- |
| Local `ref`/`reactive` | UI state (modals, forms, temp)  | Component                                    |
| Pinia Store            | Shared state across components  | `core/stores/`                               |
| Composable             | Reusable logic with local state | `core/composables/` (or a module's `hooks/`) |
| Provide/Inject         | Deep component tree data        | `core/contexts/`                             |

Use `storeToRefs()` for reactive store state: `const { workspaceId } = storeToRefs(wsStateStore)`.

### Components And Icons

- Before creating a UI component, check `components/base` and `components/ui`
  and reuse one that fits. Create a new one only when none fits or the behavior
  is clearly feature-specific.
- Prefer Hugeicons (`hugeicons:`). Before adding or changing a `hugeicons:*`
  name, verify it exists in `node_modules/@iconify-json/hugeicons/icons.json`.
  Use another collection (e.g. `lucide:chart-pie`) only when no verified
  Hugeicons equivalent exists, with its prefix written explicitly.

## Business Rules

### Database Connections

- Supported types: `postgres`, `mysql`, `mariadb`, `oracledb`, `sqlite3`, `duckdb`, `redis`, `mssql`, `cockroachdb`, `mongodb`, `rabbitmq`, `kafka`
- Connection string formats:
  - PostgreSQL: `postgresql://user:password@host:port/database`
  - MySQL: `mysql://user:password@host:port/database`
  - MariaDB: `mariadb://user:password@host:port/database`
  - Oracle: `oracledb://user:password@host:port/serviceName`
  - SQLite: `sqlite3:///absolute/path/to/database.sqlite`
  - DuckDB: `duckdb:///absolute/path/to/database.duckdb`
  - SQL Server: `Server=host,1433;Database=db;User Id=user;Password=…` (ADO.NET) or `sqlserver://user:password@host:1433/database`
  - CockroachDB: `postgresql://user:password@host:26257/database?sslmode=verify-full` (with the CockroachDB type selected)
- Oracle structured-form connections use `serviceName` instead of `database`
- Managed SQLite (Cloudflare D1, Turso) uses `managed` method and stays on SQL family path
- Local SQLite uses `file` method (desktop runtime only)
- DuckDB (beta) uses `file` method only (desktop runtime only); a typed path must already exist, and "New database file" (SQLite and DuckDB) creates an empty file in a chosen folder without overwriting anything, with Advanced options written to the file at creation (SQLite journal mode, page size, encoding, auto vacuum; DuckDB storage compatibility, block size). The server refuses it unless `ORCAQ_DESKTOP_RUNTIME=1`, because DuckDB SQL can read any file the server can reach
- DuckDB hides Users & Roles and AI Agent, and disables Backup & Restore
- DuckDB is not available on Intel Mac: the release only ships the Apple Silicon binding, so the card and saved connections are locked there and the server refuses it
- DuckDB shows a read-only Macros section in place of Functions: macros can be opened but not edited, renamed or dropped
- The built-in MCP server keeps DuckDB read-only whatever the session's access level: each query opens a throwaway read-only instance with `enable_external_access=false`, so it cannot read files outside the database.
- SQL Server and CockroachDB enforce a minimum server version (SQL Server 2017+ or Azure SQL, CockroachDB v23.2+); older servers fail the health check and every data request
- SQL Server, CockroachDB and Oracle hide Users & Roles, AI Agent and Backup & Restore; they keep Schema Diff, and their Instance Insights is read-only
- RabbitMQ and Kafka use the `form` method only, with broker settings in `connection.broker`:
  - RabbitMQ goes through the Management HTTP API (port 15672); `broker.rabbitmq.vhost` is the default vhost. Requires RabbitMQ 3.12+
  - Kafka uses `broker.kafka.brokers` (`host:port` list) and optional SASL PLAIN/SCRAM; no SSH tunnel. Requires Kafka 3.5+
- Failed health checks return actionable driver messages but connections are still saved
- A failed re-test must not delete or mutate an already saved connection record

### Database Family Gating

- Connection family drives visible tabs, sidebar panels, empty states, and unsupported-feature fallbacks
- D1 and Turso stay on `sqlite3` type but resolve to the `sql` family
- Redis hides SQL-only surfaces: `Schemas`, `ERD`, `UsersRoles`, schema diff, SQL backup/restore
- RabbitMQ and Kafka have their own families: the Schemas activity shows the broker browser, Database Tools shows broker tools; no SQL surfaces
- Broker features stay non-destructive: browse, peek (RabbitMQ requeues, Kafka reads without committing), and test publish/produce guarded by Strict Mode. No delete, purge or offset reset
- Exception: RabbitMQ Instance Insights can add/edit/delete virtual hosts and policies (user and operator), set/clear vhost and user limits, enable feature flags, force-close connections and rename the cluster, all guarded by Strict Mode; deleting a vhost needs its name typed
- Exception: RabbitMQ Users & Permissions supports full user management (create, edit tags/password, set/clear permissions, topic permissions and user limits, delete user) for `administrator` users, guarded by Strict Mode; deleting needs the user name typed, and the connected user can neither delete itself nor drop its own `administrator` tag
- The built-in MCP server (desktop only) serves SQL connections (PostgreSQL, CockroachDB, MySQL, MariaDB, SQL Server, SQLite, DuckDB, Oracle) through `list_schemas` / `list_tables` / `describe_table` / `run_query` / `explain_query`. Read-only sessions run inside a database read-only scope (SQL Server: a transaction that is always rolled back) after the SQL guard; `explain_query` is not available for SQL Server or Oracle
- The built-in MCP server (desktop only) serves RabbitMQ and Kafka through read-only `rabbitmq_*` / `kafka_*` tools (overview, queues, exchanges, peek, users, policies; topics, read messages, consumer groups). `list_connections` reports each connection's `family` (`sql`, `rabbitmq`, `kafka`). Broker tools never write, whatever the session's access level
- Provider-limited SQL tools for D1/Turso must show clear unavailable state instead of redirecting away from SQL family

### Workspaces

- Workspace must have at least one connection to be functional
- Deleting workspace cascades to all associated connections and state
- Connections belong to exactly one workspace; `workspaceId` is immutable after creation
- Deleting connection removes all associated tabs and state

## Commands

Defined in `package.json` (Bun or npm scripts).

- Install: `bun install`
- Web dev server: `bun run dev` (or `bun run nuxt:dev`)
- Nuxt build / static output: `bun run nuxt:build`, `bun run nuxt:generate`
- Electron: `bun run electron:dev`, `bun run electron:compile`, and packaging via
  `bun run electron:build`, `bun run electron:pack`, `bun run electron:build:mac-m`
- Storybook: `bun run storybook`
- Format / check: `bun run format`, `bun run format:check`
- Typecheck: `bun run typecheck`

## Tests And Verification

For any test task, load `.claude/skills/testing-orcaq/SKILL.md` first (exact
commands, fixture profiles, decision rules). Full reference: `docs/TESTING_GUIDE.md`.

- Unit: `bun test:unit` · Nuxt/component: `bun test:nuxt` · all Vitest: `bun test:all`
- API/integration: `bun test:api` (starts fixtures) or `bun test:api:raw` (fixtures already up)
- Playwright E2E: `bun test:e2e` or `bun test:e2e:raw`
- Fixtures: `bun test:fixtures:up`, `bun test:fixtures:down`

Rules:

- Any source change must pass `bun run typecheck` + `bun test:unit`; never call a
  task done while typecheck fails.
- Run the smallest relevant suite first; never start all fixtures to test one DB.
  Broaden only when the change scope requires it.
- Report the commands run, which failed, and whether failures relate to the change.
