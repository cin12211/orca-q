# Raw Query Result Renderer Registry Design

## Summary

Refactor the raw-query result UI so every `DatabaseClientType` has an explicit
render profile. The registry becomes the single source of truth for the
vertical view navigation and the component rendered for each view.

This first phase is intentionally limited to rendering. Schema loading, column
mapping, row normalization, result caching, and query execution remain in their
current owners.

## Goals

- Register a result-view profile for every `DatabaseClientType`.
- Configure the visible views and their order per database type.
- Resolve both vertical navigation and content renderers from the same profile.
- Allow a database type to reuse a default renderer or override it.
- Configure enabled and disabled states per view instead of hard-coding them by
  `ViewMode` in `RawQueryResultTabs.vue`.
- Give all registered renderers one stable context contract.
- Fail clearly when a configured view has no renderer.

## Non-Goals

- Moving schema or reserved-schema loading into the registry.
- Moving `fieldDefs` mapping or result normalization into database adapters.
- Refactoring query execution into a database execution registry.
- Supporting runtime installation or registration of database plugins.
- Redesigning the horizontal executed-query tabs, their context menu, or the
  fullscreen behavior.
- Changing the visual design of existing result views beyond removing
  Mongo-specific content from the shared Info renderer.

## Current Problems

`RawQueryResultTabs.vue` currently combines several responsibilities:

- It declares a default list of vertical result views.
- It contains MongoDB-specific rules that replace Chart with Console.
- It hard-codes enabled and disabled rules for Result, Raw, Chart, Explain, and
  Errors.
- It selects content components through a growing `v-else-if` chain.
- It prepares SQL-oriented schema, column, and normalized row data.

The component also imports MongoDB-specific renderers directly. This makes a
new database-specific result experience require edits to the shared
orchestrator.

`ResultTabInfoView.vue` currently renders `MongoRawQueryConsole` unconditionally.
Consequently, SQL result metadata can display an empty component labelled
"MongoDB Raw Query". MongoDB already has a dedicated Console view, so the
shared Info renderer must not own that component.

Finally, SQL and Redis executions initially add an `ExecutedResultItem` whose
`metadata.connection` is undefined. A registry keyed by `DatabaseClientType`
would therefore be unable to select the correct profile during the first
loading frame.

## Architecture

### File Layout

```text
components/modules/raw-query/
├── components/
│   ├── RawQueryResultTabs.vue
│   └── result-tab/
│       ├── ResultTabResultView.vue
│       ├── ResultTabRawView.vue
│       ├── ResultTabInfoView.vue
│       ├── ResultTabErrorView.vue
│       └── adapters/
│           ├── ResultTabChartRenderer.vue
│           ├── ResultTabExplainRenderer.vue
│           ├── MongoResultTabRenderer.vue
│           └── MongoConsoleTabRenderer.vue
└── registry/
    ├── rawQueryResult.types.ts
    ├── rawQueryResultDefaults.ts
    └── rawQueryResultRegistry.ts
```

Adapters are only used for existing components whose public props should not be
changed solely for this registry, such as Chart Builder, Explain Query, and the
Mongo console. An adapter accepts the shared renderer context and translates it
to the existing child component's props. It contains no business logic.

### Shared Renderer Context

Every top-level registry renderer accepts one `context` prop:

```ts
export interface RawQueryResultViewContext {
  activeTab: ExecutedResultItem;
  databaseType: DatabaseClientType;
  activeTabColumns: MappedRawColumn[];
  formattedData: Record<string, unknown>[];
  executeLoading: boolean;
  isStreaming: boolean;
  changeView(view: ViewMode): void;
}
```

The context contains data already prepared by `RawQueryResultTabs.vue`.
Renderers may ignore fields they do not need. This contract avoids
renderer-specific prop construction inside the registry and keeps component
selection independent from data preparation.

The raw-query-specific `ResultTabResultView`, `ResultTabRawView`,
`ResultTabInfoView`, and `ResultTabErrorView` will adopt this contract directly.
Adapters will preserve the existing public APIs of components shared with
other modules.

### View Definition

```ts
export type RawQueryResultExecutionPolicy =
  | 'always'
  | 'success-only'
  | 'error-only';

export interface RawQueryResultViewAvailability {
  enabled: boolean;
  reason?: string;
}

export interface RawQueryResultViewAvailabilityConfig {
  execution?: RawQueryResultExecutionPolicy;
  when?: (context: RawQueryResultViewContext) => RawQueryResultViewAvailability;
  disabledReason?: string;
}

export interface RawQueryResultViewDefinition {
  mode: ViewMode;
  label: string;
  renderer: Component;
  availability?: RawQueryResultViewAvailabilityConfig;
}

export interface RawQueryResultProfile {
  views: readonly RawQueryResultViewDefinition[];
}
```

The order of `profile.views` is the displayed navigation order. A view omitted
from the array is unsupported by that database and is hidden. A view included
in the array remains visible and its `availability` config decides whether it
is enabled for the active execution.

The registry does not infer error behavior from `ViewMode`. For example,
PostgreSQL may configure Result as `success-only`, while MongoDB may configure
Result as `always` to keep partial streamed documents accessible after a later
error.

### Availability Resolution

Availability is evaluated in this order:

1. Apply the configured execution policy, defaulting to `always`.
2. If the execution policy disables the view, return the configured
   `disabledReason`.
3. If the execution policy passes, invoke the optional `when` predicate.
4. If no predicate exists, enable the view.

`when` returns both the enabled state and its reason so a predicate cannot
disable a view without explaining why. The vertical navigation exposes the
reason through its disabled tooltip.

Typical definitions are:

```ts
defineResultView(ViewMode.RESULT, {
  availability: {
    execution: 'success-only',
    disabledReason: 'The query execution contains an error',
  },
});

defineResultView(ViewMode.ERROR, {
  availability: {
    execution: 'error-only',
    disabledReason: 'This execution has no errors',
  },
});
```

PostgreSQL Explain also supplies a `when` predicate that accepts only an
`EXPLAIN` statement after leading whitespace is removed and the statement is
normalized to uppercase.

### Default Renderers

`rawQueryResultDefaults.ts` owns default labels and reusable renderers by
`ViewMode`. The `defineResultView` factory resolves an explicit override first,
then the default renderer:

```ts
const renderer = options.renderer ?? DEFAULT_RESULT_RENDERERS[mode];
```

If neither exists, the factory throws during module initialization in
development and tests. Runtime rendering must never produce a configured tab
with an undefined component.

The default renderer is only a reuse mechanism. Its existence never makes a
view visible. Visibility comes exclusively from the view array of each
database profile.

Basic Result, Raw, Info, and Error renderers remain eagerly imported. Chart,
Explain, Mongo Result, and Mongo Console adapters use `defineAsyncComponent` so
unrelated database clients do not eagerly load them.

## Exhaustive Database Registry

The registry maps every enum member directly and uses `satisfies Record` to
make additions to `DatabaseClientType` fail type checking until a profile is
added:

```ts
export const RAW_QUERY_RESULT_REGISTRY = {
  [DatabaseClientType.POSTGRES]: postgresProfile,
  [DatabaseClientType.MYSQL]: mysqlProfile,
  [DatabaseClientType.MARIADB]: mariaDbProfile,
  [DatabaseClientType.MYSQL2]: mysql2Profile,
  [DatabaseClientType.REDIS]: redisProfile,
  [DatabaseClientType.MONGODB]: mongoProfile,
  [DatabaseClientType.SQLITE3]: sqliteProfile,
  [DatabaseClientType.BETTER_SQLITE3]: betterSqliteProfile,
  [DatabaseClientType.SNOWFLAKE]: snowflakeProfile,
  [DatabaseClientType.MSSQL]: mssqlProfile,
  [DatabaseClientType.ORACLE]: oracleProfile,
} satisfies Record<DatabaseClientType, RawQueryResultProfile>;
```

Profiles with the same behavior may reuse shared view-definition factories,
but every database type remains an explicit registry key.

### Initial Profiles

| Database client | Views in display order                    |
| --------------- | ----------------------------------------- |
| PostgreSQL      | Result, Explain, Raw, Info, Chart, Errors |
| MySQL           | Result, Raw, Info, Chart, Errors          |
| MySQL2          | Result, Raw, Info, Chart, Errors          |
| MariaDB         | Result, Raw, Info, Chart, Errors          |
| SQLite3         | Result, Raw, Info, Chart, Errors          |
| Better SQLite3  | Result, Raw, Info, Chart, Errors          |
| MSSQL           | Result, Raw, Info, Chart, Errors          |
| Oracle          | Result, Raw, Info, Chart, Errors          |
| Snowflake       | Result, Raw, Info, Chart, Errors          |
| Redis           | Result, Raw, Info, Errors                 |
| MongoDB         | Result, Raw, Info, Console, Errors        |

Explain is initially exposed only for PostgreSQL because the current Explain
UI parses PostgreSQL plan fields. Chart is initially exposed only for SQL
clients because it depends on tabular rows and column metadata. Redis results
do not guarantee that shape. MongoDB keeps its document Result renderer and
dedicated Console renderer.

The initial execution policies are profile configuration rather than global
mode rules:

- SQL Result, Raw, and Chart views use `success-only`.
- MongoDB Result uses `always` so partial stream data remains inspectable.
- Error uses `error-only` wherever the view is configured.
- Info and Console use `always`.
- PostgreSQL Explain uses `success-only` plus its statement predicate.

## RawQueryResultTabs Responsibilities

`RawQueryResultTabs.vue` retains:

- The horizontal executed-query history tabs.
- Close, close-others, and close-to-right interactions.
- Fullscreen state and keyboard handling.
- Active result selection.
- Schema and reserved-schema loading.
- Column mapping, row normalization, and formatted-row caching.
- Construction of `RawQueryResultViewContext`.

It no longer owns:

- A hard-coded `defaultViewModes` array.
- MongoDB detection for navigation or component selection.
- Hard-coded view availability rules.
- Direct imports of all database-specific renderers.
- The content `v-else-if` chain.

The component resolves the active profile, evaluates the configured views, and
uses the same resolved definitions for navigation and content:

```vue
<button
  v-for="view in resolvedViews"
  :key="view.mode"
  :disabled="!view.availability.enabled"
  @click="selectView(view)"
>
  {{ view.label }}
</button>

<component
  :is="activeView.renderer"
  :key="`${activeTab.id}:${activeView.mode}`"
  :context="resultViewContext"
/>
```

The dynamic component key includes the result tab ID and view mode so internal
state from Chart, Explain, or document renderers cannot leak between tabs or
view modes.

## Active View Reconciliation

A tab's stored `view` may become invalid when profiles change or when execution
state makes the view unavailable. The active definition is resolved in this
order:

1. Error, when the execution has an error and the profile contains an enabled
   Error view.
2. The stored view, when it exists in the profile and is enabled.
3. An enabled Result view.
4. The first enabled view.
5. The first configured view as a defensive last resort.

When the resolver selects a different view, `RawQueryResultTabs.vue` emits
`update:view` so `ExecutedResultItem.view` is synchronized with the rendered
state. It does not maintain a separate temporary UI-only view.

An empty profile is an invalid configuration and must be rejected by the
profile factory or registry tests.

## Database Type Availability During Loading

The registry must know the database type before the first server response.
SQL and Redis execution therefore set the active connection when constructing
the initial result item:

```ts
const executedResultItem: ExecutedResultItem = {
  metadata: {
    connection: connection.value,
    // existing metadata
  },
  // existing result state
};
```

MongoDB already sets its connection at result creation time.

If an abnormal or externally constructed result item still lacks a database
type, the renderer does not guess PostgreSQL. It shows a clear unsupported
result state and logs a development warning. This prevents a Redis or MongoDB
result from temporarily displaying SQL navigation.

## Component Migration

- `ResultTabResultView.vue`, `ResultTabRawView.vue`,
  `ResultTabInfoView.vue`, and `ResultTabErrorView.vue` switch to the shared
  `context` prop.
- `ResultTabInfoView.vue` removes its unconditional Mongo console. It remains
  the reusable metadata renderer, including optional metadata fields already
  present on `ExecutedResultItem`.
- `MongoRawQueryResultView.vue` retains its focused `documents` API. A thin
  `MongoResultTabRenderer.vue` adapter reads documents from the shared context.
- `MongoRawQueryConsole.vue` retains its focused `logs` API. A thin registry
  adapter reads logs from the shared context.
- Chart and Explain retain their existing APIs behind thin adapters.
- A future database-specific Error, Info, Raw, or Result view is registered by
  replacing the renderer in that database profile; no edit to
  `RawQueryResultTabs.vue` is required.

## Error Handling

- A configured view without a renderer fails during profile construction.
- An empty database profile fails registry validation.
- A missing database type renders an explicit unsupported state rather than a
  default SQL profile.
- An unavailable active view is reconciled through the deterministic fallback
  order and synchronized through `update:view`.
- Exceptions thrown by an availability predicate are treated as configuration
  errors in development and tests. Production rendering disables that view and
  reports a generic unavailable reason instead of breaking the entire result
  panel.

## Testing Strategy

### Registry Tests

Add a focused Nuxt test for the registry that verifies:

- Every `DatabaseClientType` has a profile.
- Every profile contains at least one view.
- Each profile has the expected view order.
- Default renderers are reused when a profile does not override them.
- MongoDB overrides Result and Console as expected.
- `always`, `success-only`, and `error-only` policies resolve correctly.
- PostgreSQL Explain applies its custom statement predicate.
- A configured view without a default or override renderer is rejected.
- Active-view fallback follows the documented order.

### Component Tests

Update `RawQueryResultTabs.test.ts` to verify:

- PostgreSQL displays Explain and Chart.
- Redis hides Explain and Chart.
- MongoDB displays Console and hides Chart.
- Disabled state is produced by profile configuration.
- Clicking an enabled view emits `update:view`.
- Clicking a disabled view does not emit an update.
- The selected dynamic renderer receives the complete shared context.
- Invalid active state is reconciled and emitted back to the owner.

Update affected renderer tests for the shared `context` prop. Keep the existing
Result grid behavior and Mongo document renderer assertions.

### Verification Commands

Run the narrow Nuxt tests first:

```bash
bun run test:nuxt -- test/nuxt/components/modules/raw-query/rawQueryResultRegistry.test.ts
bun run test:nuxt -- test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts
```

Then run the repository-required verification:

```bash
bun run typecheck
bun test:unit
```

No database fixtures, API integration suite, or Playwright suite is required
for this render-only refactor unless implementation reveals a cross-layer
behavior change.

The repository references `.github/skills/testing-orcaq/SKILL.md`, but that
file is absent at design time. The verification plan therefore follows the
commands and decision rules stated directly in `AGENTS.md`.

## Future Extension

A later phase may add a database-specific data adapter for schema loading,
column construction, and result normalization. The renderer context boundary
is designed so that such an adapter can replace how context fields are
prepared without changing registry renderers. That work is explicitly outside
this phase.
