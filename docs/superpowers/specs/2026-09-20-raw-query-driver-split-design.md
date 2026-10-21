# Raw Query Driver Split — Design

Date: 2026-09-20
Status: Approved for planning
Scope: `components/modules/raw-query`, `components/modules/driver/*/raw-query`

## 1. Context

`components/modules/raw-query` is ~13k LOC across 100 files and serves every
database engine through a single `RawQuery.vue`. Engine differences are
expressed as inline conditionals scattered through the core:

| Concern                                                                                       | Current location                                                        |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `isRedisConnection` / `isSqliteConnection` / `isExplainSupported`                             | `RawQuery.vue:54-70`                                                    |
| Redis workspace + database index picker                                                       | `RawQuery.vue:79-88`, `components/RawQueryEditorHeader.vue:118-122`     |
| Redis execute branch (dedicated endpoint, no streaming)                                       | `hooks/useQueryExecution.ts:268-330`                                    |
| EXPLAIN branch (PostgreSQL only)                                                              | `hooks/useQueryExecution.ts:335-380`                                    |
| Streaming branch (all other SQL)                                                              | `hooks/useQueryExecution.ts:380+`                                       |
| Dialect / completion / Redis language extension                                               | `hooks/useSqlEditorExtensions.ts`                                       |
| PostgreSQL-only keyword completion, `Mod-e` EXPLAIN keybinding, Redis `statementMode: 'line'` | `hooks/useSqlEditorExtensions.ts:100-107`, `:206-216`, `:240-247`       |
| EXPLAIN option menu, serialize mode, `is-explain-supported`                                   | `components/RawQueryEditorFooter.vue` via `RawQuery.vue:356-361`        |
| EXPLAIN entry in the editor context menu                                                      | `hooks/useRawQueryEditorContextMenu.ts:15`, wired at `RawQuery.vue:156` |
| Command result handler map (11 engines)                                                       | `utils/commandType.ts:275-297`                                          |
| MSSQL `@param` variable syntax                                                                | `utils/extractVariables.ts:206`                                         |

Every new engine adds another conditional to the core. The core also imports
upward into a driver module (`RawQuery.vue:5` imports
`driver/redis/quick-query/hooks/useRedisWorkspace`), which inverts the intended
dependency direction.

The only consumer is
`pages/[workspaceId]/[connectionId]/explorer/[fileId].vue:16`, which renders
`<RawQuery />` with no props. Swapping the entry point is cheap.

Precedent: `quick-query` is already split per driver under
`components/modules/driver/<engine>/quick-query/`.

## 2. Goals

1. Core contains no engine knowledge. No `DatabaseClientType` import, no
   `if (type === ...)`.
2. Each engine owns a folder it can extend freely without touching the core.
3. Adding a new engine means adding a folder plus one registry entry — no core
   edit.
4. Unblock SQLite variables (server already supports it; only the UI blocks it).
5. Every migration stage leaves the app running and the test suites green.

## 3. Non-goals

- EXPLAIN for MySQL / MariaDB / SQLite / Oracle / MSSQL. EXPLAIN stays
  PostgreSQL-only and moves wholesale into the PostgreSQL driver folder. It is
  PostgreSQL-specific logic, not a shared abstraction.
- MongoDB raw query. `mongoQueryLanguage` exists in `components/base/code-editor`
  but raw-query never wires it. Out of scope.
- Server-side changes. All adapters already bind named parameters.
- Refactoring `chart-builder`, the result grid, or the data-grid wrapper.

## 4. Decisions

| #   | Decision                                                                     | Rationale                                                                                            |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| D1  | Shell + per-engine entry component                                           | Engines compose the core rather than declaring data into it, so an engine can add arbitrary UI later |
| D2  | Seven engine entries: postgres, mysql, mariadb, sqlite, oracle, mssql, redis | Each gets a customization seat from day one                                                          |
| D3  | Refactor plus gap fixes, limited to SQLite variables                         | Cheap, server-supported, UI-only unblock                                                             |
| D4  | EXPLAIN stays PostgreSQL-only and leaves the core                            | Pipeline is PostgreSQL-shaped end to end                                                             |
| D5  | Unsupported engines show an explicit unsupported state                       | No silent fallback into a SQL surface that may not work                                              |
| D6  | Staged migration, five stages, each stage green                              | Reviewable and revertable                                                                            |

### D4 detail — why EXPLAIN is not generalised

The whole pipeline assumes PostgreSQL:

| Layer                                                              | Current                                                               | Another engine would need                                                                                                                           |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefix builder (`hooks/useRawQueryExplainAnalyzeOptions.ts:66-72`) | `EXPLAIN (ANALYZE, FORMAT JSON, BUFFERS, WAL, ...)`                   | MySQL `EXPLAIN ANALYZE FORMAT=JSON`; SQLite `EXPLAIN QUERY PLAN` (no options); Oracle two statements (`EXPLAIN PLAN FOR` then `DBMS_XPLAN.DISPLAY`) |
| Parser (`utils/parseExplainPlan.ts`)                               | PostgreSQL JSON keys: `Plan Rows`, `Actual Rows`, `Shared Hit Blocks` | A different shape per engine                                                                                                                        |
| UI (`modules/explain-query/`)                                      | Node tree, cost/buffer insights, timeline chart                       | SQLite returns three flat columns with no cost data                                                                                                 |
| Option menu                                                        | `BUFFERS` / `WAL` / `MEMORY` / `SERIALIZE`                            | Not valid keywords elsewhere                                                                                                                        |

Generalising means three prefix builders, three parsers and three UI variants.
That is feature work. The split moves EXPLAIN into
`driver/postgres/raw-query/` so a future engine can add its own without the
core mediating.

### D5 detail — unsupported engines

`DatabaseClientType` also contains `MONGODB` and `SNOWFLAKE`. Today they fall
into the shared SQL branch and render a SQL editor. After the split they resolve
to `UnsupportedRawQuery.vue`, which renders
`components/base/base-empty/BaseEmpty.vue` with its default `icons:not-found`
icon and a "not supported" message.

This is a deliberate behavior change: a MongoDB connection loses the SQL editor
surface it renders today. Accepted — the surface was not functional for MongoDB.

## 5. Architecture

### 5.1 Core / engine boundary

Stays in `components/modules/raw-query/`:

- Shell and layout UI, editor header/footer, result tabs, result-tab views
- File and tab state: `useRawQueryFileContent`, `useResultTabs`,
  `useRawQueryEditedCells`
- Editor extensions: `useSqlEditorExtensions`, taking the dialect from
  capabilities
- Execution pipeline: `useQueryExecution` (executor injected),
  `useStreamingQuery`
- Grid and mutation: `useRawQueryMutation`, `buildRawQueryColumnDefs`,
  `buildRawQueryUpdates`, `isCellEditable`, `normalizeResultRows`
- Variables: `extractVariables`, `VariableEditor.vue`,
  `MissingVariablesDialog.vue`
- `modules/chart-builder/` — engine-agnostic, operates on arbitrary rows
- `contracts/` — new

Leaves the core:

| Destination                  | What moves                                                                                                                                                          | From |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `driver/postgres/raw-query/` | `modules/explain-query/`, `utils/parseExplainPlan.ts`, `hooks/useRawQueryExplainAnalyzeOptions.ts`, `interfaces/explainAnalyzeResult.ts`, `EXPLAIN_ANALYZE_OPTIONS` | core |
| `driver/redis/raw-query/`    | Redis execute branch, Redis result normalizer, Redis database-index picker                                                                                          | core |
| per engine                   | the matching handler from `utils/commandType.ts`                                                                                                                    | core |

The Redis CodeMirror language extension stays in the core. `useSqlEditorExtensions`
selects the extension set from `capabilities.language`, which is a contract-level
enum (`'sql' | 'redis'`), not a `DatabaseClientType`. The core still knows
nothing about engines.

`MssqlExtractor` does **not** move. If the core factory imported it from
`driver/mssql/`, the core would regain engine knowledge. Instead the factory is
re-keyed from `dbType` to `parameterStyle` (`'colon' | 'at'`). The core keeps
both extractors and knows nothing about engines.

### 5.2 Contracts

```ts
// raw-query/contracts/rawQueryCapabilities.ts
export type RawQueryLanguage = 'sql' | 'redis';
export type ParameterStyle = 'colon' | 'at';

export interface RawQueryCapabilities {
  language: RawQueryLanguage;
  /** Statement detection and block parsing. Present only when language === 'sql'. */
  parserDialect?: SQLDialect;
  /** Highlighting and suggestions. PostgreSQL uses a different dialect here than for parsing. */
  highlightDialect?: SQLDialect;
  /**
   * Engine-specific keyword completion, in the shape `sql({ keywordCompletion })`
   * takes; only PostgreSQL ships one today.
   */
  keywordCompletion?: (label: string, type: string) => Completion;
  supportsVariables: boolean;
  supportsFormat: boolean;
  parameterStyle: ParameterStyle;
}
```

PostgreSQL needs two different dialects — `PostgreSQLParserDialect` for
statement detection (dollar quoting) and `PostgreSQLHighlightDialect` for
highlighting — so a single `dialect` field is not enough. Engines fill both by
calling the existing `resolveParserDialect` / `resolveHighlightDialect` from
`components/base/code-editor/states/sqlParserConfig.ts`. That file keeps its
`DatabaseClientType` map; it belongs to the base layer, not to raw-query.

`statementMode` is derived, not stored: `language === 'redis'` means `'line'`,
otherwise `'sql'`.

Capabilities carry only the flags the current code branches on. Nothing
speculative.

| Engine   | language | parser / highlight dialect                           | keywordCompletion     | supportsVariables | supportsFormat | parameterStyle |
| -------- | -------- | ---------------------------------------------------- | --------------------- | ----------------- | -------------- | -------------- |
| postgres | sql      | PostgreSQLParserDialect / PostgreSQLHighlightDialect | `pgKeywordCompletion` | yes               | yes            | colon          |
| mysql    | sql      | MySQL / MySQL                                        | none                  | yes               | yes            | colon          |
| mariadb  | sql      | MariaSQL / MariaSQL                                  | none                  | yes               | yes            | colon          |
| sqlite   | sql      | SQLite / SQLite                                      | none                  | yes (unblocked)   | yes            | colon          |
| oracle   | sql      | PLSQL / PLSQL                                        | none                  | yes               | yes            | colon          |
| mssql    | sql      | PostgreSQL fallback                                  | none                  | yes               | yes            | at             |
| redis    | redis    | none                                                 | none                  | no                | no             | colon (unused) |

MSSQL has no dedicated entry in `SQL_DIALECT_BY_DB_TYPE`, so
`resolveParserDialect` already falls back to the PostgreSQL dialect for it
today. Capabilities record that fallback explicitly rather than changing it.

```ts
// raw-query/contracts/rawQueryExecutor.ts
export interface RawQueryExecuteRequest {
  connection: Connection;
  query: string;
  params: Record<string, unknown>;
}

export interface RawQueryExecuteHandlers {
  onMeta(fields: DatabaseField[], command?: string): void;
  onRows(rows: RowData[]): void;
  onComplete(summary: { queryTime: number; rowCount: number }): void;
  onError(error: DatabaseDriverError): void;
}

export interface RawQueryExecutor {
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): { abort: () => void };
}
```

```ts
// raw-query/contracts/rawQueryDriver.ts
export interface RawQueryDriverDescriptor {
  capabilities: RawQueryCapabilities;
  executor: RawQueryExecutor;
  commandResultHandler: CommandResultHandler;
}
```

Executors:

| Executor                  | Owner                                 | Transport                                |
| ------------------------- | ------------------------------------- | ---------------------------------------- |
| `SqlStreamingExecutor`    | core `services/`                      | `/api/query/raw-execute-stream` (NDJSON) |
| `RedisCommandExecutor`    | `driver/redis/raw-query/services/`    | `/api/redis/workbench/execute`           |
| `PostgresExplainExecutor` | `driver/postgres/raw-query/services/` | `/api/query/raw-execute` (non-streaming) |

`useQueryExecution` after the refactor:

```ts
executeCurrentStatement({
  currentStatements,
  queryPrefix, // supplied by the engine; the core never builds one
  executor, // optional override; defaults to the descriptor's executor
  resultView, // optional override; defaults to RESULT
});
```

Both conditional blocks in `hooks/useQueryExecution.ts` collapse into a single
`executor.execute(...)` call.

### 5.3 Shell slots and contributions

EXPLAIN surfaces in four places, not one: the executor, the footer option menu,
the editor context menu, and the `Mod-e` keybinding. The Redis database picker
surfaces in the header. So the shell exposes both template slots and
non-template contributions.

Template slots:

```vue
<RawQueryShell
  :descriptor="..."
  :extra-keymap="..."
  :extra-context-menu-items="..."
>
  <template #header-extra />          <!-- redis: database index picker -->
  <template #footer-extra />          <!-- postgres: EXPLAIN option menu -->
  <template #result-view="{ tab }" /> <!-- postgres: ExplainQueryContainer when tab.view === EXPLAIN -->
</RawQueryShell>
```

`#result-view` is a scoped slot whose fallback content is the core's default
view set. An engine that declares no slot behaves exactly as today.

Non-template contributions, passed as props:

| Prop                    | Type                | Used by                                    |
| ----------------------- | ------------------- | ------------------------------------------ |
| `extraKeymap`           | `KeyBinding[]`      | PostgreSQL contributes `Mod-e` for EXPLAIN |
| `extraContextMenuItems` | `ContextMenuItem[]` | PostgreSQL contributes the EXPLAIN entry   |

Consequences for existing core components:

- `RawQueryEditorHeader.vue` drops `isRedisConnection`, `redisDatabases`,
  `redisDatabaseIndex` and `update:redisDatabaseIndex`; it gains an `#extra`
  slot.
- `RawQueryEditorFooter.vue` drops `explainAnalyzeOptionItems`,
  `serializeMode`, `isExplainSupported`, `on-explain-analyze-current`,
  `toggle-explain-option` and `update:serialize-mode`; it gains an `#extra`
  slot.
- `useRawQueryEditorContextMenu` drops `isExplainSupported` and
  `onExplainAnalyzeCurrent`; it gains an `extraItems` parameter.
- `useSqlEditorExtensions` drops `isRedisConnection` / `isExplainSupported`;
  it reads `capabilities` and accepts `extraKeymap`.

One copy change follows from unblocking SQLite variables: the empty state at
`RawQuery.vue:382` reads "Variables are not available for Redis and SQLite
connections." It becomes Redis-only.

### 5.4 Resolver

The core must not know which engines exist, so the map lives in the driver
layer:

```ts
// driver/shared/raw-query/resolveRawQueryComponent.ts
const RAW_QUERY_COMPONENTS: Partial<Record<DatabaseClientType, Component>> = {
  [DatabaseClientType.POSTGRES]: defineAsyncComponent(/* PostgresRawQuery */),
  [DatabaseClientType.MYSQL]: defineAsyncComponent(/* MysqlRawQuery */),
  [DatabaseClientType.MYSQL2]: defineAsyncComponent(/* MysqlRawQuery */),
  [DatabaseClientType.MARIADB]: defineAsyncComponent(/* MariadbRawQuery */),
  [DatabaseClientType.SQLITE3]: defineAsyncComponent(/* SqliteRawQuery */),
  [DatabaseClientType.BETTER_SQLITE3]:
    defineAsyncComponent(/* SqliteRawQuery */),
  [DatabaseClientType.ORACLE]: defineAsyncComponent(/* OracleRawQuery */),
  [DatabaseClientType.MSSQL]: defineAsyncComponent(/* MssqlRawQuery */),
  [DatabaseClientType.REDIS]: defineAsyncComponent(/* RedisRawQuery */),
};
// unmapped type -> UnsupportedRawQuery
```

D1 and Turso keep `sqlite3` as their type and therefore resolve to
`SqliteRawQuery`, consistent with the SQL-family rule in `CLAUDE.md`.

`defineAsyncComponent` gives each engine its own chunk. PostgreSQL pulls the
ECharts-backed EXPLAIN timeline; MySQL and Redis no longer load it.

## 6. File layout

### 6.1 Core

```
components/modules/raw-query/
├── contracts/            # NEW: capabilities, executor, descriptor, handler
├── shell/
│   ├── RawQueryShell.vue          # from RawQuery.vue, engine branches removed
│   └── index.ts
├── components/                    # unchanged, minus the Redis picker;
│   └── result-tab/                # header/footer gain slots
├── hooks/
│   ├── useRawQueryCore.ts         # NEW, replaces useRawQueryEditor
│   ├── useQueryExecution.ts       # executor injected
│   ├── useStreamingQuery.ts
│   ├── useResultTabs.ts
│   ├── useSqlEditorExtensions.ts  # dialect from capabilities
│   ├── useRawQueryFileContent.ts
│   ├── useRawQueryEditedCells.ts
│   ├── useRawQueryMutation.ts
│   └── useRawQueryRelationPreview.ts
├── services/
│   └── sqlStreamingExecutor.ts    # NEW, default executor
├── modules/chart-builder/
├── utils/                         # minus parseExplainPlan, commandType
├── interfaces/                    # minus explainAnalyzeResult
└── index.ts
```

### 6.2 Driver

```
components/modules/driver/
├── shared/
│   ├── raw-query/                          # family-agnostic
│   │   ├── containers/UnsupportedRawQuery.vue
│   │   ├── resolveRawQueryComponent.ts
│   │   └── index.ts
│   └── sql/raw-query/                      # SQL family
│       ├── containers/BaseSqlRawQuery.vue
│       ├── services/genericCommandResultHandler.ts
│       └── index.ts
│
├── postgres/raw-query/
│   ├── explain/                            # moved modules/explain-query + parser
│   │   ├── components/ constants/ containers/ types/ utils/ index.ts
│   ├── components/ExplainOptionsMenu.vue
│   ├── containers/PostgresRawQuery.vue
│   ├── hooks/usePostgresExplain.ts         # option state, prefix, executor
│   ├── services/postgresExplainExecutor.ts
│   ├── services/postgresCommandResultHandler.ts
│   ├── capabilities/ types/ constants/ index.ts
│
├── redis/raw-query/
│   ├── components/RedisDatabasePicker.vue
│   ├── containers/RedisRawQuery.vue
│   ├── hooks/useRedisRawQuery.ts           # wraps useRedisWorkspace
│   ├── services/redisCommandExecutor.ts
│   ├── utils/normalizeRedisResult.ts
│   ├── capabilities/ index.ts
│
├── mysql/raw-query/      ┐
├── mariadb/raw-query/    │  capabilities/ + containers/<X>RawQuery.vue
├── sqlite/raw-query/     │  + services/<x>CommandResultHandler.ts
├── oracle/raw-query/     │  + index.ts
└── mssql/raw-query/      ┘
```

Every folder carries an `index.ts` per `.claude/rules/module-architecture.md`.
`containers/` never imports `services/` directly; it goes through `hooks/`.

Dependency direction: `containers → hooks → services → contracts`. No driver
imports another driver. Anything two drivers need lives in `driver/shared/`.

A thin engine entry:

```vue
<!-- driver/mariadb/raw-query/containers/MariadbRawQuery.vue -->
<script setup lang="ts">
import { BaseSqlRawQuery } from '~/components/modules/driver/shared/sql/raw-query';
import { MARIADB_RAW_QUERY_CAPABILITIES } from '../capabilities';
</script>

<template>
  <BaseSqlRawQuery :capabilities="MARIADB_RAW_QUERY_CAPABILITIES" />
</template>
```

MariaDB does not import from `driver/mysql/`; it declares its own capabilities.
A few duplicated lines are cheaper than a cross-driver dependency.

PostgreSQL and Redis do not wrap the empty `BaseSqlRawQuery` — they compose
`RawQueryShell` directly and fill their slots.

## 7. Migration

Five stages on one branch. Each stage ends with the app running and
`bun run typecheck && bun test:unit && bun test:nuxt` green.

| Stage | Work                                                                                                                                                                                                          | Approx. files     | Exit criterion                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| 1     | Add `contracts/` and capabilities for all seven engines. `RawQuery.vue` reads the descriptor instead of `isRedisConnection` / `isSqliteConnection` / `isExplainSupported`. No file moves.                     | ~12               | Behavior identical; suites green                                                      |
| 2     | Extract executors: `SqlStreamingExecutor`, `RedisCommandExecutor`, `PostgresExplainExecutor`. `useQueryExecution` takes an executor; delete both conditional blocks. Split `utils/commandType.ts` per engine. | ~15               | Each executor has its own test; the six existing `useQueryExecution` cases still pass |
| 3     | `RawQueryShell.vue` with the three slots, `BaseSqlRawQuery.vue`, `useRawQueryCore`.                                                                                                                           | ~10               | Every SQL engine renders through `BaseSqlRawQuery`; Redis still on the old path       |
| 4     | Seven entry containers, `UnsupportedRawQuery`, resolver. Move EXPLAIN into `driver/postgres/`, Redis into `driver/redis/`. Page switches to `<component :is="resolveRawQueryComponent(type)" />`.             | ~45, mostly moves | Every engine routes through its own entry                                             |
| 5     | Delete the old `RawQuery.vue`. Unblock SQLite variables. Update `components/modules/raw-query/docs/01-04`. Run `graphify update .`.                                                                           | ~10               | `grep -r DatabaseClientType components/modules/raw-query` returns zero matches        |

File moves are performed as create-plus-delete, not `git mv`. Staging is the
user's; the implementation never runs `git add` or `git mv`.

## 8. Testing

21 existing test files touch raw-query.

| Test                                                                        | Disposition                                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `test/nuxt/.../useQueryExecution.test.ts:259` (Redis)                       | Move to `driver/redis/raw-query/redisCommandExecutor.test.ts`       |
| `test/nuxt/.../useQueryExecution.test.ts:153` (EXPLAIN)                     | Move to `driver/postgres/raw-query/postgresExplainExecutor.test.ts` |
| Remaining four cases (streaming, error, empty, variables)                   | Stay; run against the default `SqlStreamingExecutor`                |
| `test/unit/.../dialects/{postgres,mysql,mariadb,sqlite}/completion.spec.ts` | Stay in core; dialect now sourced from `capabilities.dialect`       |
| `test/unit/.../extractVariables.spec.ts`                                    | Stay; signature changes to `parameterStyle`                         |
| `test/nuxt/.../commandType.test.ts`                                         | Split per driver                                                    |
| The other 14 util/component specs                                           | Untouched                                                           |

New tests:

- `resolveRawQueryComponent` returns the right component for all nine mapped
  `DatabaseClientType` values, and `UnsupportedRawQuery` for `MONGODB` and
  `SNOWFLAKE`
- One small snapshot per engine capabilities object
- `RawQueryShell` renders an engine slot, and falls back to the core view set
  when `#result-view` is absent

Per stage:

```bash
bun run typecheck && bun test:unit && bun test:nuxt
```

Manual smoke at the end of stages 4 and 5: open the file explorer against one
PostgreSQL, one Redis and one SQLite connection; run a query on each; use
EXPLAIN on PostgreSQL; change the Redis database index; run a `:param` query on
SQLite.

E2E: `test/playwright/oracle/workspace-flows-live.spec.ts` and
`test/playwright/helpers/sql-workspace.ts` touch raw-query. Run
`bun test:e2e:raw` at stage 5 if the Oracle fixture is already up.

## 9. Risks

| Risk                                                                          | Mitigation                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Stage 4 moves ~45 files; a missed import slips through                        | Every folder exports through `index.ts`; `typecheck` catches the rest                       |
| Shell slot design proves wrong and forces rework at stage 5                   | Build the shell at stage 3 and exercise it with PostgreSQL and Redis before moving anything |
| PostgreSQL EXPLAIN moves into a separate async chunk and the lazy load breaks | Manual EXPLAIN smoke at stage 4                                                             |
| Unblocking SQLite variables exposes a binding bug nobody has hit              | Manual `:param` test on SQLite before closing stage 5                                       |
| MongoDB and Snowflake users lose the SQL editor surface                       | Deliberate per D5; the unsupported state states it plainly                                  |

## 10. Implementation deviations

Where the built system differs from the text above. The code is the source of truth.

| Area                                             | Spec says                                                                                                    | Built                                                                                                                                                                                                                                                                           | Why                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keywordCompletion` type (§5.2)                  | `CompletionSource`                                                                                           | `(label, type) => Completion`, the `sql({ keywordCompletion })` shape                                                                                                                                                                                                           | That is the option `@codemirror/lang-sql` accepts; `pgKeywordCompletion` already has this shape                                                                                                                                                                       |
| Executor placement (§5.2)                        | `RawQueryDriverDescriptor` holds `executor`; the `executor` override "defaults to the descriptor's executor" | Descriptor is `{ capabilities, commandResultHandler }`; the shell takes `executor` as a separate prop                                                                                                                                                                           | Redis builds its executor from a reactive database index, so the entry supplies it                                                                                                                                                                                    |
| `RawQueryExecutor.streaming?` (§5.2)             | `execute` only                                                                                               | Optional `streaming` flag                                                                                                                                                                                                                                                       | The UI needs it for the streaming indicator and cancel button; only `sqlStreamingExecutor` streams                                                                                                                                                                    |
| Executor names (§5.2)                            | `SqlStreamingExecutor`, `RedisCommandExecutor`, `PostgresExplainExecutor`                                    | `sqlStreamingExecutor`, `createRedisCommandExecutor(databaseIndex)`, `postgresExplainExecutor`                                                                                                                                                                                  | Objects, except Redis which is a factory over the reactive database index                                                                                                                                                                                             |
| `#result-view` slot props (§5.3)                 | `#result-view="{ tab }"`, keyed on `tab.view`                                                                | Slot props are `{ tab, view }`                                                                                                                                                                                                                                                  | `view` is the user-toggleable current view of the tab; the entry keys off it                                                                                                                                                                                          |
| File content and result tabs (§5.1)              | `useRawQueryFileContent` and `useResultTabs` stay in the core                                                | Still in the core, but one instance of each is provided at page level (`useRawQueryFileContentContext`, `useRawQueryResultTabsContext`, from `pages/[workspaceId]/[connectionId]/explorer/[fileId].vue`)                                                                        | Switching to a connection of another engine swaps the entry component; per-component instances would be lost                                                                                                                                                          |
| Command result handler (§5.1)                    | The matching handler from `utils/commandType.ts` moves out of the core into its engine                       | Same, plus a `resolveCommandResultHandler` resolver prop on the shell, resolved per result tab                                                                                                                                                                                  | A tab must keep its own engine's summary after the connection changes                                                                                                                                                                                                 |
| Driver `descriptors/` (§6.2)                     | Folder layout has `capabilities/`, `containers/`, `services/`; no descriptor                                 | `descriptors/` per engine with `<ENGINE>_RAW_QUERY_DESCRIPTOR`; `usePostgresRawQueryDescriptor` for PostgreSQL                                                                                                                                                                  | Containers must not import their own driver's `services/`; the descriptor (or hook) pairs capabilities and handler                                                                                                                                                    |
| `BaseSqlRawQuery` prop (§6.2)                    | `<BaseSqlRawQuery :capabilities="MARIADB_RAW_QUERY_CAPABILITIES" />`                                         | `<BaseSqlRawQuery :descriptor="MARIADB_RAW_QUERY_DESCRIPTOR" />`                                                                                                                                                                                                                | Follows from the descriptor holding capabilities and handler                                                                                                                                                                                                          |
| Resolver location and barrels (§5.4, §6.2)       | `resolveRawQueryComponent.ts` at the `driver/shared/raw-query/` root                                         | In the `resolver/` sub-barrel; driver root barrels do not export `containers/`, containers are imported by full path                                                                                                                                                            | Containers import `driver/shared/raw-query`, which imports driver descriptors; exporting containers from root barrels closes an import cycle                                                                                                                          |
| `genericCommandResultHandler` location (§6.2)    | `driver/shared/sql/raw-query/services/`                                                                      | `driver/shared/raw-query/services/`                                                                                                                                                                                                                                             | Redis uses it too, so it is not SQL-family specific                                                                                                                                                                                                                   |
| MariaDB handler (§6.2)                           | `services/<x>CommandResultHandler.ts` under `mariadb/raw-query`                                              | `mariadbCommandResult` there, but it re-exports the MySQL-family handler now in `driver/shared/raw-query/services`                                                                                                                                                              | MariaDB shares MySQL semantics and must not import from `driver/mysql`                                                                                                                                                                                                |
| Page while `connection` is undefined (§5.4)      | Unmapped type -> `UnsupportedRawQuery`                                                                       | Page shows `LoadingOverlay` while the connection store is not hydrated, and a "Connection not found" `BaseEmpty` once it is hydrated but the connection is missing                                                                                                              | The unsupported message would flash before workspace connections hydrate; a deleted connection must not spin forever. The store has no hydration flag, so an empty workspace connection list stands for "not hydrated" (a workspace must own at least one connection) |
| `useSqlEditorExtensions` dialect fallback (§5.2) | Dialects per capabilities                                                                                    | `?? SQLDialectSupport.PostgreSQLHighlightDialect` fallbacks remain                                                                                                                                                                                                              | The dialect fields are optional on the contract (Redis omits them); the fallbacks are unreachable for non-SQL languages                                                                                                                                               |
| `queryPrefix` in diagnostics (§5.2)              | `queryPrefix` supplied by the engine, optional                                                               | `queryPrefix ?? ''` passed to `applySqlErrorDiagnostics`                                                                                                                                                                                                                        | The util concatenates it verbatim; `undefined` became the text "undefined" in the offset                                                                                                                                                                              |
| Residual EXPLAIN coupling in the core (§5.1)     | The core has no engine knowledge                                                                             | `RawQueryResultTabs.vue` hardcodes the "Explain" view-mode button and gates it with `activeTab.metadata.statementQuery.startsWith('EXPLAIN')`; `ViewMode.EXPLAIN` stays in the core. A preserved EXPLAIN tab on a non-PostgreSQL entry shows a "View not available" empty state | Redesigning to an engine-declared view set is out of scope; `coreHasNoEngineKnowledge.spec.ts` does not cover this                                                                                                                                                    |
| Executor contract shape (§5.2)                   | `onMeta(fields: DatabaseField[])`, `onRows(rows)`, `onError(DatabaseDriverError)`                            | `onMeta(fields: FieldDef[], command?)`, `onRows(rows, totalSoFar)`, `onError({ message, detail? })`; `RawQueryExecuteRequest.connection: Connection \| undefined`                                                                                                               | Matches what the existing streaming pipeline produces and the UI consumes (running total, command tag, message plus driver detail)                                                                                                                                    |
| Core root barrel (§6.1)                          | Lists a core `components/modules/raw-query/index.ts`                                                         | None exists; consumers import the sub-barrels (`hooks`, `contracts`, ...)                                                                                                                                                                                                       | The module has no root barrel; nothing needed one                                                                                                                                                                                                                     |
| Registry entries (§2 goal 3)                     | One registry entry per engine                                                                                | Two: `resolveRawQueryDescriptor.ts` and `resolver/resolveRawQueryComponent.ts`                                                                                                                                                                                                  | The descriptor is static and eager; the entry component is lazy and must be a separate chunk                                                                                                                                                                          |
| `better-sqlite3` dialect                         | Not listed                                                                                                   | `better-sqlite3` connections now get the SQLite dialect                                                                                                                                                                                                                         | In the old monolith `SQL_DIALECT_BY_DB_TYPE` had no entry for it, so it fell back to the PostgreSQL dialect; the shared SQLite capabilities fix that as a side effect                                                                                                 |
| Async entry states (§5.4)                        | Bare lazy entries                                                                                            | Every entry is built by `defineEngineEntry`: `RawQueryEntryLoading` (`LoadingOverlay`, 200 ms delay) and `RawQueryEntryError` (`BaseEmpty`), with `suspensible: false`                                                                                                          | Vue ignores `loadingComponent`/`errorComponent` for suspensible async components under `<Suspense>`; without them a failed chunk left a blank pane                                                                                                                    |

Note: SQLite variables are enabled (`supportsVariables: true` for `sqlite3` and `better-sqlite3`). That is D3 as specified, not a deviation.
