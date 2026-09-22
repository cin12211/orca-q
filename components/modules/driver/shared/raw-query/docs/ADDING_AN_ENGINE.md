# Adding a Raw Query Engine

Raw query is split into an engine-agnostic core (`components/modules/raw-query/`) and one owned folder per engine (`components/modules/driver/<engine>/raw-query/`).
Adding an engine never touches the core: you add a folder, then register it in two resolver files.
Read `components/modules/raw-query/docs/01-architecture.md` first for the boundary and the contracts.

The worked example is MariaDB (`components/modules/driver/mariadb/raw-query/`), the smallest engine.

## 1. Folder layout

```text
driver/<engine>/raw-query/
├── capabilities/
│   ├── <engine>.capabilities.ts
│   └── index.ts
├── descriptors/
│   ├── <engine>.descriptor.ts
│   └── index.ts
├── services/
│   ├── <engine>CommandResultHandler.ts
│   └── index.ts
├── containers/
│   ├── <Engine>RawQuery.vue
│   └── index.ts
└── index.ts            # root barrel: capabilities, descriptor, handler. NOT containers/
```

Every folder needs an `index.ts` (module-architecture rule). Add `hooks/`, `components/`, `utils/` only when the engine needs them (PostgreSQL and Redis do).

## 2. Capabilities

`capabilities/mariadb.capabilities.ts`:

```ts
import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const MARIADB_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.MARIADB),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.MARIADB),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
```

`resolveParserDialect` / `resolveHighlightDialect` are the existing base-layer helpers; if the engine is new, extend them in `components/base/code-editor/states/sqlParserConfig.ts` first. Set `keywordCompletion` only when the engine ships its own completion (only PostgreSQL does). Use `parameterStyle: 'at'` for `@name` parameters (MSSQL).

## 3. Command-result handler (`services/`)

The handler turns a command keyword and a row count into the summary line shown in a result tab (`CommandResultHandlerFactory`).
Reuse a shared handler when the semantics match. MariaDB shares MySQL's, which lives in `driver/shared/raw-query/services` so that MariaDB does not import from the MySQL driver (engines must not import each other):

```ts
// services/mariadbCommandResultHandler.ts
import { mysqlCommandResult } from '~/components/modules/driver/shared/raw-query/services';

/** MariaDB shares MySQL's result semantics; the shared handler avoids a mysql import. */
export const mariadbCommandResult = mysqlCommandResult;
```

For different semantics, extend `BaseCommandResultHandler` from the same shared folder (see `driver/postgres/raw-query/services/postgresCommandResultHandler.ts`), or use `genericCommandResult` (Redis does).
`services/index.ts` exports it: `export { mariadbCommandResult } from './mariadbCommandResultHandler';`

## 4. Descriptor

A driver's containers must not import that driver's own `services/`, so a `descriptors/` constant pairs the two:

```ts
// descriptors/mariadb.descriptor.ts
import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { MARIADB_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { mariadbCommandResult } from '../services';

/** Static MariaDB configuration for the raw query shell. */
export const MARIADB_RAW_QUERY_DESCRIPTOR: RawQueryDriverDescriptor = {
  capabilities: MARIADB_RAW_QUERY_CAPABILITIES,
  commandResultHandler: mariadbCommandResult,
};
```

## 5. Entry container

`containers/MariadbRawQuery.vue` is the component the resolver mounts:

```vue
<script setup lang="ts">
import { BaseSqlRawQuery } from '~/components/modules/driver/shared/sql/raw-query';
import { MARIADB_RAW_QUERY_DESCRIPTOR } from '../descriptors';
</script>

<template>
  <BaseSqlRawQuery :descriptor="MARIADB_RAW_QUERY_DESCRIPTOR" />
</template>
```

`containers/index.ts`: `export { default as MariadbRawQuery } from './MariadbRawQuery.vue';`

Root `index.ts` (note: no `containers/`):

```ts
export { MARIADB_RAW_QUERY_CAPABILITIES } from './capabilities';
export { MARIADB_RAW_QUERY_DESCRIPTOR } from './descriptors';
export { mariadbCommandResult } from './services';
```

The root barrel must not re-export `containers/`: containers import `driver/shared/raw-query`, which imports each driver's descriptors, so it would close an import cycle. The resolver imports containers by their full path.

## 6. Register the engine

1. `driver/shared/raw-query/resolveRawQueryDescriptor.ts`: import the descriptor from `driver/<engine>/raw-query/descriptors` and add it to `RAW_QUERY_DESCRIPTORS` under its `DatabaseClientType`. This feeds capabilities and per-tab command-result handlers.

   ```ts
   [DatabaseClientType.MARIADB]: MARIADB_RAW_QUERY_DESCRIPTOR,
   ```

2. `driver/shared/raw-query/resolver/resolveRawQueryComponent.ts`: add a lazy entry (one chunk per engine; `defineEngineEntry` adds the loading and error states) and map it in `RAW_QUERY_COMPONENTS`.

   ```ts
   const mariadbEntry = defineEngineEntry(
     () =>
       import(
         '~/components/modules/driver/mariadb/raw-query/containers/MariadbRawQuery.vue'
       )
   );
   // ...
   [DatabaseClientType.MARIADB]: mariadbEntry,
   ```

A type that is in neither map renders `UnsupportedRawQuery`.

## 7. Tests

- Capabilities/descriptor: extend `test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts` (dialects, `supportsVariables`, `parameterStyle`) and `test/nuxt/components/modules/driver/shared/raw-query/commandResultHandlers.test.ts` (summary line for your handler).
- Entry: add the container to `test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts` so the resolver maps the type to your entry; if the entry has slots or hooks, add a mount test like `test/nuxt/components/modules/driver/redis/raw-query/RedisRawQuery.test.ts`.
- Dialect behaviour (statement splitting, completion): follow `test/unit/components/modules/raw-query/dialects/<engine>/`.
- Guard: `test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts` must stay green. Do not reference the new engine from core.

Run `bun run typecheck`, `bun test:unit`, and the nuxt tests you touched.

## 8. `BaseSqlRawQuery` or `RawQueryShell` directly?

| Use                                                                              | When                                                                                                         | Examples                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `BaseSqlRawQuery` (`driver/shared/sql/raw-query/containers/BaseSqlRawQuery.vue`) | A plain SQL engine: streaming SQL executor, default result views, no extra UI. It takes only a `descriptor`. | MySQL, MariaDB, SQLite, Oracle, MSSQL |
| `RawQueryShell` (`components/modules/raw-query/shell`)                           | The engine needs slots, its own executor, extra keybindings or context-menu items.                           | PostgreSQL, Redis                     |

The shell takes `descriptor`, `executor`, `resolveCommandResultHandler`, and optionally `isSupportVariable`, `extraKeymap`, `extraContextMenuItems`; slots `header-extra`, `footer-extra` and scoped `result-view` (`{ tab, view }`); it exposes `executeCurrentStatement` and `getEditorView`.

**PostgreSQL** (`driver/postgres/raw-query/containers/PostgresRawQuery.vue`) uses the shell with the default `sqlStreamingExecutor`, and contributes:

- `extraKeymap` / `extraContextMenuItems` (`Mod-e`, "Analyze Query") from `usePostgresExplain`;
- `#footer-extra`: the `ExplainOptionsMenu`;
- `#result-view`: renders `ExplainQueryContainer` when `view === ViewMode.EXPLAIN`, otherwise falls back to the built-in views;
- an EXPLAIN run through the shell's exposed `executeCurrentStatement({ currentStatements, queryPrefix, executor: postgresExplainExecutor, resultView: ViewMode.EXPLAIN })`;
- its descriptor built by `usePostgresRawQueryDescriptor()`, because a container must not import its driver's own `services/`.

**Redis** (`driver/redis/raw-query/containers/RedisRawQuery.vue`) uses the shell with its own executor and a header slot:

- `executor` from `useRedisRawQuery()`, which builds `createRedisCommandExecutor(selectedDatabaseIndex)` from the reactive database index;
- `#header-extra`: `RedisDatabasePicker`;
- `REDIS_RAW_QUERY_DESCRIPTOR` with `language: 'redis'` (line-per-command statements, no SQL diagnostics, no variables, no formatting).

Rules that apply either way: the entry may not import another engine; state that must survive an engine swap (file content, result tabs) comes from the page-level contexts via the core, never from the entry.
