# Raw Query Driver Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `components/modules/raw-query` into an engine-agnostic core plus one owned folder per database engine, so a new engine is a new folder instead of another conditional in the core.

**Architecture:** The core keeps the shell UI, editor, result tabs and execution pipeline, and learns about an engine only through a `RawQueryDriverDescriptor` (capabilities + executor + command result handler) plus template slots and two contribution props. Each engine gets a folder under `components/modules/driver/<engine>/raw-query/` holding its capabilities, its entry container and whatever engine-specific logic it needs. A resolver in the driver layer maps `DatabaseClientType` to an entry component; unmapped types render an explicit unsupported state.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup lang="ts">`, Pinia, CodeMirror 6 (`@codemirror/lang-sql`, `@codemirror/view`, `@codemirror/state`), AG Grid, Vitest (`test/unit` node env, `test/nuxt` nuxt env), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-raw-query-driver-split-design.md`

## Global Constraints

- **Never run `git add`, `git mv`, `git commit`, `git stash`, `git reset` or `git checkout` on files.** The user owns staging and commits, and works on branch `refactor/driver-modules`. File moves are performed as create-then-delete. At the end of each task, list every file created, modified and deleted so the user can stage and commit that task.
- Every task ends green on `bun run typecheck` and `bun test:unit` — both must be fully clean. A task is not done if either fails.
- `bun test:nuxt` is **already red AND non-deterministic at the base commit**: mount-based raw-query tests (`ResultTabResultView`, `RawQueryResultTabs`, `normalizeResultRows`) intermittently time out or fail app init ("Failed to hydrate stores: No available storage method found") even on pristine HEAD. A nuxt failure is only a regression if it reproduces with your change and passes on pristine HEAD in a back-to-back control run; run the file alone first — these pass alone. It is **already red at the base commit** (`e649964c`): 23 tests across 13 files fail identically in both worktrees, so they are pre-existing, not caused by this work. The gate is therefore _no new failures_: after a task, the failing set must still be a subset of this baseline.

```
test/nuxt/components/base/CodeHighlightPreview.test.ts
test/nuxt/components/modules/agent/hooks/useDbAgentRenderer.test.ts
test/nuxt/components/modules/connection/ConnectionStatusSection.test.ts
test/nuxt/components/modules/driver/redis/primary-panel/schemas/RedisKeyTree.test.ts
test/nuxt/components/modules/driver/redis/primary-panel/schemas/RedisSchemasPanel.test.ts
test/nuxt/components/modules/raw-query/ResultTabResultView.test.ts
test/nuxt/components/modules/workspace/hooks/useWorkspaceCard.test.ts
test/nuxt/components/modules/workspace/hooks/useWorkspaceForm.test.ts
test/nuxt/components/modules/workspace/hooks/useWorkspaces.test.ts
test/nuxt/core/composables/useAiChat.test.ts
test/nuxt/core/composables/useCopyToClipboard.test.ts
test/nuxt/core/composables/useTableSize.test.ts
test/nuxt/table-appearance/useTableTheme.test.ts
```

`ResultTabResultView.test.ts` is in this plan's blast radius: Task 7 changes that component. Do not try to fix its pre-existing failure as part of Task 7 — record whether it still fails the same way, and leave it to the final review to triage.

- When a task's own new tests are the point, run them individually first (`bun test:unit <path>` / `bun test:nuxt <path>`) before running the full suites.
- No `any`. Use explicit types or `unknown` with a type guard.
- Vue SFC section order: `<script setup lang="ts">`, `<template>`, `<style scoped>`. Inside `<script setup>`: imports, props/emits, stores/composables, refs, computed, functions, lifecycle, watchers.
- Use the `~/` alias for cross-module imports. No `../../../`.
- Every new folder gets an `index.ts` barrel. Import through the barrel, never into an internal file from outside (`.claude/rules/module-architecture.md`).
- Dependency direction inside a driver module: `containers → hooks → services → contracts`. `containers/` must not import `services/` directly. No driver imports another driver; shared code goes to `driver/shared/`.
- UI copy is English.
- Icons: prefer `hugeicons:`. Before using any `hugeicons:*` name, verify it exists in `node_modules/@iconify-json/hugeicons/icons.json`. This plan uses only icon names already present in the codebase.
- Behavior is unchanged until Task 16. Tasks 1-15 are a pure refactor: if a manual check shows a difference, it is a bug in the refactor.
- The SQLite `supportsVariables` capability ships as `false` in Task 1 to preserve current behavior, and flips to `true` in Task 16. The spec's capability table shows the end state.

---

## File Structure

### Created in the core (`components/modules/raw-query/`)

| File                                | Responsibility                                                          |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `contracts/rawQueryCapabilities.ts` | `RawQueryLanguage`, `ParameterStyle`, `RawQueryCapabilities`            |
| `contracts/rawQueryExecutor.ts`     | `RawQueryExecuteRequest`, `RawQueryExecuteHandlers`, `RawQueryExecutor` |
| `contracts/rawQueryDriver.ts`       | `RawQueryDriverDescriptor`, `CommandResultHandlerFactory`               |
| `contracts/index.ts`                | Barrel                                                                  |
| `services/sqlStreamingExecutor.ts`  | Default executor over the NDJSON endpoint                               |
| `services/index.ts`                 | Barrel                                                                  |
| `hooks/useRawQueryCore.ts`          | Composition root; replaces `useRawQueryEditor`                          |
| `shell/RawQueryShell.vue`           | Engine-agnostic shell; replaces `RawQuery.vue`                          |
| `shell/index.ts`                    | Barrel                                                                  |

### Modified in the core

| File                                                          | Change                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `hooks/useQueryExecution.ts`                                  | Takes an executor; both engine branches deleted                  |
| `hooks/useSqlEditorExtensions.ts`                             | Reads capabilities; takes `extraKeymap`; no `DatabaseClientType` |
| `hooks/useRawQueryEditorContextMenu.ts`                       | Takes `extraItems`; drops EXPLAIN                                |
| `components/RawQueryEditorHeader.vue`                         | Drops Redis props; gains `#extra` slot                           |
| `components/RawQueryEditorFooter.vue`                         | Drops EXPLAIN props; gains `#extra` slot                         |
| `components/result-tab/ResultTabResultView.vue`               | Uses the descriptor's command result handler                     |
| `utils/extractVariables.ts`                                   | Factory keyed by `ParameterStyle`, not `dbType`                  |
| `utils/index.ts`, `interfaces/index.ts`, `constants/index.ts` | Drop the EXPLAIN exports that move out                           |

### Deleted from the core

`RawQuery.vue`, `hooks/useRawQueryEditor.ts`, `hooks/useRawQueryExplainAnalyzeOptions.ts`, `utils/parseExplainPlan.ts`, `utils/commandType.ts`, `interfaces/explainAnalyzeResult.ts`, `modules/explain-query/`.

### Created in the driver layer

| Folder                         | Contents                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `driver/shared/raw-query/`     | `resolveRawQueryCapabilities.ts`, `resolveRawQueryComponent.ts`, `containers/UnsupportedRawQuery.vue`, `services/baseCommandResultHandler.ts`, `services/genericCommandResultHandler.ts`, `constants/commandCategories.ts`                                                                  |
| `driver/shared/sql/raw-query/` | `containers/BaseSqlRawQuery.vue`                                                                                                                                                                                                                                                            |
| `driver/postgres/raw-query/`   | `capabilities/`, `containers/PostgresRawQuery.vue`, `hooks/usePostgresExplain.ts`, `services/postgresExplainExecutor.ts`, `services/postgresCommandResultHandler.ts`, `components/ExplainOptionsMenu.vue`, `explain/` (the moved `explain-query` module plus the plan parser and its types) |
| `driver/redis/raw-query/`      | `capabilities/`, `containers/RedisRawQuery.vue`, `hooks/useRedisRawQuery.ts`, `services/redisCommandExecutor.ts`, `utils/normalizeRedisResult.ts`, `components/RedisDatabasePicker.vue`                                                                                                     |
| `driver/mysql/raw-query/`      | `capabilities/`, `containers/MysqlRawQuery.vue`, `services/mysqlCommandResultHandler.ts`                                                                                                                                                                                                    |
| `driver/mariadb/raw-query/`    | `capabilities/`, `containers/MariadbRawQuery.vue`                                                                                                                                                                                                                                           |
| `driver/sqlite/raw-query/`     | `capabilities/`, `containers/SqliteRawQuery.vue`, `services/sqliteCommandResultHandler.ts`                                                                                                                                                                                                  |
| `driver/oracle/raw-query/`     | `capabilities/`, `containers/OracleRawQuery.vue`, `services/oracleCommandResultHandler.ts`                                                                                                                                                                                                  |
| `driver/mssql/raw-query/`      | `capabilities/`, `containers/MssqlRawQuery.vue`, `services/mssqlCommandResultHandler.ts`                                                                                                                                                                                                    |

---

## Phase 1 — Contracts and capabilities

### Task 1: Contracts and the seven capability objects

**Files:**

- Create: `components/modules/raw-query/contracts/rawQueryCapabilities.ts`
- Create: `components/modules/raw-query/contracts/index.ts`
- Create: `components/modules/driver/postgres/raw-query/capabilities/postgres.capabilities.ts`
- Create: `components/modules/driver/postgres/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/mysql/raw-query/capabilities/mysql.capabilities.ts`
- Create: `components/modules/driver/mysql/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/mariadb/raw-query/capabilities/mariadb.capabilities.ts`
- Create: `components/modules/driver/mariadb/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/sqlite/raw-query/capabilities/sqlite.capabilities.ts`
- Create: `components/modules/driver/sqlite/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/oracle/raw-query/capabilities/oracle.capabilities.ts`
- Create: `components/modules/driver/oracle/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/mssql/raw-query/capabilities/mssql.capabilities.ts`
- Create: `components/modules/driver/mssql/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/redis/raw-query/capabilities/redis.capabilities.ts`
- Create: `components/modules/driver/redis/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.ts`
- Create: `components/modules/driver/shared/raw-query/index.ts`
- Test: `test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`

**Interfaces:**

- Consumes: `resolveParserDialect`, `resolveHighlightDialect` from `~/components/base/code-editor/states/sqlParserConfig`; `pgKeywordCompletion` from `~/components/base/code-editor/utils`; `DatabaseClientType` from `~/core/constants/database-client-type`.
- Produces: `RawQueryCapabilities`, `RawQueryLanguage`, `ParameterStyle`; the seven `*_RAW_QUERY_CAPABILITIES` constants; `resolveRawQueryCapabilities(type?: DatabaseClientType): RawQueryCapabilities | undefined`.

- [ ] **Step 1: Write the failing test**

Create `test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveRawQueryCapabilities } from '~/components/modules/driver/shared/raw-query';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('resolveRawQueryCapabilities', () => {
  it('gives PostgreSQL separate parser and highlight dialects', () => {
    const capabilities = resolveRawQueryCapabilities(
      DatabaseClientType.POSTGRES
    );

    expect(capabilities?.language).toBe('sql');
    expect(capabilities?.parserDialect).toBeDefined();
    expect(capabilities?.highlightDialect).toBeDefined();
    expect(capabilities?.parserDialect).not.toBe(
      capabilities?.highlightDialect
    );
    expect(capabilities?.keywordCompletion).toBeDefined();
  });

  it('marks Redis as a non-SQL language with no variables and no formatting', () => {
    const capabilities = resolveRawQueryCapabilities(DatabaseClientType.REDIS);

    expect(capabilities?.language).toBe('redis');
    expect(capabilities?.supportsVariables).toBe(false);
    expect(capabilities?.supportsFormat).toBe(false);
    expect(capabilities?.parserDialect).toBeUndefined();
  });

  it('uses the "at" parameter style only for MSSQL', () => {
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.MSSQL)?.parameterStyle
    ).toBe('at');
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.POSTGRES)?.parameterStyle
    ).toBe('colon');
  });

  it('keeps SQLite variables disabled to match current behavior', () => {
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.SQLITE3)?.supportsVariables
    ).toBe(false);
  });

  it('maps driver aliases onto the same capabilities', () => {
    expect(resolveRawQueryCapabilities(DatabaseClientType.MYSQL2)).toBe(
      resolveRawQueryCapabilities(DatabaseClientType.MYSQL)
    );
    expect(resolveRawQueryCapabilities(DatabaseClientType.BETTER_SQLITE3)).toBe(
      resolveRawQueryCapabilities(DatabaseClientType.SQLITE3)
    );
  });

  it('returns undefined for engines raw query does not support', () => {
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.MONGODB)
    ).toBeUndefined();
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.SNOWFLAKE)
    ).toBeUndefined();
    expect(resolveRawQueryCapabilities(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`
Expected: FAIL — cannot resolve `~/components/modules/driver/shared/raw-query`.

- [ ] **Step 3: Write the capabilities contract**

Create `components/modules/raw-query/contracts/rawQueryCapabilities.ts`:

```ts
import type { CompletionSource } from '@codemirror/autocomplete';
import type { SQLDialect } from '@codemirror/lang-sql';

/** Statement language the editor and the statement splitter operate in. */
export type RawQueryLanguage = 'sql' | 'redis';

/** Named-parameter syntax the engine accepts. */
export type ParameterStyle = 'colon' | 'at';

export interface RawQueryCapabilities {
  language: RawQueryLanguage;
  /**
   * Dialect used for statement detection and block parsing.
   * PostgreSQL needs a different dialect here than for highlighting because of
   * dollar quoting. Absent when `language` is not 'sql'.
   */
  parserDialect?: SQLDialect;
  /** Dialect used for highlighting and suggestions. Absent when not 'sql'. */
  highlightDialect?: SQLDialect;
  /** Engine-specific keyword completion. Only PostgreSQL ships one today. */
  keywordCompletion?: CompletionSource;
  supportsVariables: boolean;
  supportsFormat: boolean;
  parameterStyle: ParameterStyle;
}
```

Create `components/modules/raw-query/contracts/index.ts`:

```ts
export type {
  ParameterStyle,
  RawQueryCapabilities,
  RawQueryLanguage,
} from './rawQueryCapabilities';
```

- [ ] **Step 4: Write the seven capability objects**

Create `components/modules/driver/postgres/raw-query/capabilities/postgres.capabilities.ts`:

```ts
import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import { pgKeywordCompletion } from '~/components/base/code-editor/utils';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const POSTGRES_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.POSTGRES),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.POSTGRES),
  keywordCompletion: pgKeywordCompletion,
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
```

Create `components/modules/driver/postgres/raw-query/capabilities/index.ts`:

```ts
export { POSTGRES_RAW_QUERY_CAPABILITIES } from './postgres.capabilities';
```

Create `components/modules/driver/mysql/raw-query/capabilities/mysql.capabilities.ts`:

```ts
import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const MYSQL_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.MYSQL),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.MYSQL),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
```

Create `components/modules/driver/mysql/raw-query/capabilities/index.ts`:

```ts
export { MYSQL_RAW_QUERY_CAPABILITIES } from './mysql.capabilities';
```

Create `components/modules/driver/mariadb/raw-query/capabilities/mariadb.capabilities.ts`:

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

Create `components/modules/driver/mariadb/raw-query/capabilities/index.ts`:

```ts
export { MARIADB_RAW_QUERY_CAPABILITIES } from './mariadb.capabilities';
```

Create `components/modules/driver/sqlite/raw-query/capabilities/sqlite.capabilities.ts`:

```ts
import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const SQLITE_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.SQLITE3),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.SQLITE3),
  // Matches today's behavior. Flipped to true in Task 16.
  supportsVariables: false,
  supportsFormat: true,
  parameterStyle: 'colon',
};
```

Create `components/modules/driver/sqlite/raw-query/capabilities/index.ts`:

```ts
export { SQLITE_RAW_QUERY_CAPABILITIES } from './sqlite.capabilities';
```

Create `components/modules/driver/oracle/raw-query/capabilities/oracle.capabilities.ts`:

```ts
import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const ORACLE_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.ORACLE),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.ORACLE),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
```

Create `components/modules/driver/oracle/raw-query/capabilities/index.ts`:

```ts
export { ORACLE_RAW_QUERY_CAPABILITIES } from './oracle.capabilities';
```

Create `components/modules/driver/mssql/raw-query/capabilities/mssql.capabilities.ts`:

```ts
import {
  resolveHighlightDialect,
  resolveParserDialect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

// MSSQL has no entry in SQL_DIALECT_BY_DB_TYPE, so both resolvers fall back to
// the PostgreSQL dialect. Recorded explicitly rather than changed.
export const MSSQL_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'sql',
  parserDialect: resolveParserDialect(DatabaseClientType.MSSQL),
  highlightDialect: resolveHighlightDialect(DatabaseClientType.MSSQL),
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'at',
};
```

Create `components/modules/driver/mssql/raw-query/capabilities/index.ts`:

```ts
export { MSSQL_RAW_QUERY_CAPABILITIES } from './mssql.capabilities';
```

Create `components/modules/driver/redis/raw-query/capabilities/redis.capabilities.ts`:

```ts
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';

export const REDIS_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'redis',
  supportsVariables: false,
  supportsFormat: false,
  // Unused while supportsVariables is false; present to satisfy the contract.
  parameterStyle: 'colon',
};
```

Create `components/modules/driver/redis/raw-query/capabilities/index.ts`:

```ts
export { REDIS_RAW_QUERY_CAPABILITIES } from './redis.capabilities';
```

- [ ] **Step 5: Write the capability resolver**

Create `components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.ts`:

```ts
import { MARIADB_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mariadb/raw-query/capabilities';
import { MSSQL_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mssql/raw-query/capabilities';
import { MYSQL_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mysql/raw-query/capabilities';
import { ORACLE_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/oracle/raw-query/capabilities';
import { POSTGRES_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/postgres/raw-query/capabilities';
import { REDIS_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/redis/raw-query/capabilities';
import { SQLITE_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/sqlite/raw-query/capabilities';
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

/**
 * Engines raw query supports. A type missing from this map has no raw query
 * surface — the caller renders the unsupported state instead of guessing.
 */
const RAW_QUERY_CAPABILITIES: Partial<
  Record<DatabaseClientType, RawQueryCapabilities>
> = {
  [DatabaseClientType.POSTGRES]: POSTGRES_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.MYSQL]: MYSQL_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.MYSQL2]: MYSQL_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.MARIADB]: MARIADB_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.SQLITE3]: SQLITE_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.BETTER_SQLITE3]: SQLITE_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.ORACLE]: ORACLE_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.MSSQL]: MSSQL_RAW_QUERY_CAPABILITIES,
  [DatabaseClientType.REDIS]: REDIS_RAW_QUERY_CAPABILITIES,
};

export function resolveRawQueryCapabilities(
  type: DatabaseClientType | undefined
): RawQueryCapabilities | undefined {
  if (!type) return undefined;
  return RAW_QUERY_CAPABILITIES[type];
}
```

Create `components/modules/driver/shared/raw-query/index.ts`:

```ts
export { resolveRawQueryCapabilities } from './resolveRawQueryCapabilities';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 7: Verify nothing else broke**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: all green. Nothing consumes the new files yet.

- [ ] **Step 8: Report files for staging**

List every created file. Do not run `git add`.

---

### Task 2: Core reads capabilities instead of checking the database type

**Files:**

- Modify: `components/modules/raw-query/utils/extractVariables.ts:200-216`
- Modify: `components/modules/raw-query/hooks/useSqlEditorExtensions.ts`
- Modify: `components/modules/raw-query/hooks/useRawQueryEditor.ts`
- Modify: `components/modules/raw-query/hooks/useQueryExecution.ts:183-190`
- Modify: `components/modules/raw-query/RawQuery.vue:54-70`
- Test: `test/unit/components/modules/raw-query/utils/extractVariables.spec.ts`
- Test: `test/unit/components/modules/raw-query/capabilitiesDrivenEditor.spec.ts`

**Interfaces:**

- Consumes: `RawQueryCapabilities` (Task 1), `resolveRawQueryCapabilities` (Task 1).
- Produces: `extractParamsFromSql(sql: string, parameterStyle?: ParameterStyle): string[]`; `ParameterExtractorFactory.getExtractor(parameterStyle?: ParameterStyle): ParameterExtractor`; `useSqlEditorExtensions` now takes `capabilities: Ref<RawQueryCapabilities | undefined>` in place of `connection`.

- [ ] **Step 1: Write the failing test for the parameter extractor**

Replace the factory cases in `test/unit/components/modules/raw-query/utils/extractVariables.spec.ts` by appending this block (keep every existing case, only the factory-facing ones change):

```ts
describe('extractParamsFromSql — keyed by parameter style', () => {
  it('reads @name parameters when the style is "at"', () => {
    expect(
      extractParamsFromSql('SELECT * FROM users WHERE id = @userId', 'at')
    ).toEqual(['userId']);
  });

  it('reads :name parameters when the style is "colon"', () => {
    expect(
      extractParamsFromSql('SELECT * FROM users WHERE id = :userId', 'colon')
    ).toEqual(['userId']);
  });

  it('defaults to the colon style when none is given', () => {
    expect(
      extractParamsFromSql('SELECT * FROM users WHERE id = :userId')
    ).toEqual(['userId']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/raw-query/utils/extractVariables.spec.ts`
Expected: FAIL — the `'at'` case returns `[]` because the factory still keys off `DatabaseClientType.MSSQL`.

- [ ] **Step 3: Re-key the extractor factory**

In `components/modules/raw-query/utils/extractVariables.ts`, delete the `DatabaseClientType` import and replace the factory and the exported function:

```ts
import type { ParameterStyle } from '../contracts';

export class ParameterExtractorFactory {
  static getExtractor(parameterStyle?: ParameterStyle): ParameterExtractor {
    if (parameterStyle === 'at') {
      return new MssqlExtractor();
    }
    return new StandardColonExtractor();
  }
}

export function extractParamsFromSql(
  sql: string,
  parameterStyle?: ParameterStyle
): string[] {
  const extractor = ParameterExtractorFactory.getExtractor(parameterStyle);
  return extractor.extract(sql);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/raw-query/utils/extractVariables.spec.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for capability-driven editor extensions**

Create `test/unit/components/modules/raw-query/capabilitiesDrivenEditor.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveRawQueryCapabilities } from '~/components/modules/driver/shared/raw-query';
import { resolveStatementMode } from '~/components/modules/raw-query/hooks/useSqlEditorExtensions';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('resolveStatementMode', () => {
  it('splits Redis input line by line', () => {
    const capabilities = resolveRawQueryCapabilities(DatabaseClientType.REDIS);
    expect(resolveStatementMode(capabilities)).toBe('line');
  });

  it('splits SQL input by statement', () => {
    const capabilities = resolveRawQueryCapabilities(
      DatabaseClientType.POSTGRES
    );
    expect(resolveStatementMode(capabilities)).toBe('sql');
  });

  it('falls back to statement splitting when capabilities are missing', () => {
    expect(resolveStatementMode(undefined)).toBe('sql');
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/raw-query/capabilitiesDrivenEditor.spec.ts`
Expected: FAIL — `resolveStatementMode` is not exported.

- [ ] **Step 7: Rewrite `useSqlEditorExtensions` against capabilities**

In `components/modules/raw-query/hooks/useSqlEditorExtensions.ts`: delete the `DatabaseClientType` import, the `Connection` import, the `resolveParserDialect` / `resolveHighlightDialect` imports, and the `isRedisConnection` / `isFormatSupported` / `isExplainSupported` computed values. Add at module scope:

```ts
import type { RawQueryCapabilities } from '../contracts';

/** Redis commands are one per line; SQL is split into statements. */
export function resolveStatementMode(
  capabilities: RawQueryCapabilities | undefined
): 'sql' | 'line' {
  return capabilities?.language === 'redis' ? 'line' : 'sql';
}
```

Change the params interface and the derived flags:

```ts
interface UseSqlEditorExtensionsParams {
  codeEditorRef: Ref<InstanceType<typeof BaseCodeEditor> | null>;
  fileVariables: Ref<string>;
  /** Drives dialect, language and formatting support. */
  capabilities: Ref<RawQueryCapabilities | undefined>;
  /** Extra keybindings contributed by the engine, e.g. PostgreSQL's Mod-e. */
  extraKeymap?: KeyBinding[];
  onExecuteStatement: (params: {
    currentStatements: SyntaxTreeNodeData[];
    treeNodes: SyntaxTreeNodeData[];
    queryPrefix?: string;
  }) => void;
}
```

Import `KeyBinding` as a type from `@codemirror/view`. Inside the function replace the flags and builders:

```ts
const isSqlLanguage = computed(() => capabilities.value?.language === 'sql');
const isFormatSupported = computed(
  () => capabilities.value?.supportsFormat ?? false
);

const buildSqlLanguageExtension = () =>
  sql({
    dialect:
      capabilities.value?.highlightDialect ??
      SQLDialectSupport.PostgreSQLHighlightDialect,
    upperCaseKeywords: true,
    keywordCompletion: capabilities.value?.keywordCompletion,
    schema: schemaConfig.value.schema,
    defaultSchema: schemaConfig.value.defaultSchema,
  });

const buildLanguageExtension = () =>
  isSqlLanguage.value ? buildSqlLanguageExtension() : redis();

const buildCompletionExtension = () => {
  if (!isSqlLanguage.value) return [];

  const dialect =
    capabilities.value?.highlightDialect ??
    SQLDialectSupport.PostgreSQLHighlightDialect;

  return dialect.language.data.of({
    autocomplete: buildCteAwareCompletionSource(),
  });
};

const buildHoverExtension = () => {
  if (!isSqlLanguage.value) return [];
  // body unchanged
};
```

Delete the `Mod-e` entry from the keymap array and spread the engine's bindings instead:

```ts
keymap.of([
  {
    key: 'Mod-s',
    run: () => {
      onHandleFormatCurrentStatement();
      return true;
    },
    preventDefault: true,
  },
  {
    key: 'Shift-Alt-f',
    run: () => {
      onHandleFormatCode();
      return true;
    },
    preventDefault: true,
  },
  ...(extraKeymap ?? []),
  { key: 'Mod-i', run: startCompletion },
  { key: 'Tab', run: acceptCompletion },
]),
```

In `reloadSqlCompartment`, replace the dialect and mode resolution:

```ts
const parserDialect =
  capabilities.value?.parserDialect ??
  SQLDialectSupport.PostgreSQLParserDialect;

editorView.dispatch({
  effects: [
    updateSqlParserConfigEffect.of({
      dialect: parserDialect,
      isEnable: isSqlLanguage.value,
      statementMode: resolveStatementMode(capabilities.value),
    }),
    sqlCompartment.reconfigure(buildLanguageExtension()),
    sqlCompletionCompartment.reconfigure(buildCompletionExtension()),
    sqlHoverCompartment.reconfigure(buildHoverExtension()),
  ],
});
```

Replace the connection watcher with a capabilities watcher:

```ts
watch(
  () => capabilities.value,
  () => {
    reloadSqlCompartment();
  }
);
```

Remove `onExplainAnalyzeCurrent` from the params and from the function body.

- [ ] **Step 8: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/raw-query/capabilitiesDrivenEditor.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Feed capabilities through the facade and the entry component**

In `components/modules/raw-query/hooks/useRawQueryEditor.ts`, add `capabilities` to the params and pass it down, keeping `buildExplainAnalyzePrefix` wired as today:

```ts
export function useRawQueryEditor({
  fileVariables,
  connection,
  capabilities,
  redisDatabaseIndex,
  fieldDefs,
  beforeExecute,
  promptMissingVariables,
  onUpdateVariables,
}: {
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  capabilities: Ref<RawQueryCapabilities | undefined>;
  redisDatabaseIndex?: Ref<number>;
  fieldDefs: Ref<FieldDef[]>;
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
}) {
```

Pass `capabilities` into `useQueryExecution` and into `useSqlEditorExtensions`, and give `useSqlEditorExtensions` the PostgreSQL keybinding while EXPLAIN still lives in the core:

```ts
const sqlEditor = useSqlEditorExtensions({
  codeEditorRef,
  fileVariables,
  capabilities,
  extraKeymap: [
    {
      key: 'Mod-e',
      run: () => {
        if (connection.value?.type === DatabaseClientType.POSTGRES) {
          queryExecution.onExplainAnalyzeCurrent();
        }
        return true;
      },
      preventDefault: true,
    },
  ],
  onExecuteStatement: queryExecution.executeCurrentStatement,
});
```

In `components/modules/raw-query/hooks/useQueryExecution.ts`, add `capabilities` to the params and replace lines 183-190:

```ts
const isVariableSupported = capabilities.value?.supportsVariables ?? false;

if (isVariableSupported && promptMissingVariables) {
  const extracted = extractParamsFromSql(
    executeQuery,
    capabilities.value?.parameterStyle
  );
  // rest unchanged
}
```

Keep `const isRedisConnection = connection.value?.type === DatabaseClientType.REDIS;` for now — Task 5 deletes it with the branch.

In `components/modules/raw-query/RawQuery.vue`, replace lines 54-70:

```ts
const capabilities = computed(() =>
  resolveRawQueryCapabilities(connection.value?.type as DatabaseClientType)
);
const isRedisConnection = computed(
  () => capabilities.value?.language === 'redis'
);
const isFormatSupported = computed(
  () => capabilities.value?.supportsFormat ?? false
);
const isVariableSupported = computed(
  () =>
    props.isSupportVariable && (capabilities.value?.supportsVariables ?? false)
);
const isExplainSupported = computed(
  () => connection.value?.type === DatabaseClientType.POSTGRES
);
```

Delete the now-unused `isSqliteConnection`. Pass `capabilities` into `useRawQueryEditor`.

- [ ] **Step 10: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green. The four `dialects/*/completion.spec.ts` suites still pass because the dialect values are the same objects, just sourced from capabilities.

- [ ] **Step 11: Manual behavior check**

Run `bun run dev`. Open a PostgreSQL connection file, a Redis one and a SQLite one. Confirm: SQL highlighting per engine, Redis splits per line, `Mod-e` runs EXPLAIN on PostgreSQL only, the Variables pane is still disabled for Redis and SQLite, and Format is disabled for Redis.

- [ ] **Step 12: Report files for staging**

---

## Phase 2 — Executors

### Task 3: Executor contract and the default SQL streaming executor

**Files:**

- Create: `components/modules/raw-query/contracts/rawQueryExecutor.ts`
- Create: `components/modules/raw-query/services/sqlStreamingExecutor.ts`
- Create: `components/modules/raw-query/services/index.ts`
- Modify: `components/modules/raw-query/contracts/index.ts`
- Test: `test/nuxt/components/modules/raw-query/sqlStreamingExecutor.test.ts`

**Interfaces:**

- Consumes: `executeStreamingQuery` from `../hooks/useStreamingQuery`; `getConnectionParams` from `~/core/helpers/connection-helper`.
- Produces: `RawQueryExecuteRequest`, `RawQueryExecuteHandlers`, `RawQueryExecutor`, `RawQueryExecuteHandle`, `sqlStreamingExecutor`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/raw-query/sqlStreamingExecutor.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as streamingQuery from '~/components/modules/raw-query/hooks/useStreamingQuery';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';

vi.mock('~/components/modules/raw-query/hooks/useStreamingQuery', () => ({
  executeStreamingQuery: vi.fn(),
}));

describe('sqlStreamingExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards streaming callbacks onto the executor handlers', () => {
    const abort = vi.fn();
    vi.mocked(streamingQuery.executeStreamingQuery).mockImplementation(
      (options: any) => {
        options.onMeta([{ name: 'id' }], 'SELECT');
        options.onRows([{ id: 1 }], 1);
        options.onDone(1, 42);
        return { abort };
      }
    );

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    const handle = sqlStreamingExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'SELECT 1',
        params: {},
      },
      handlers
    );

    expect(handlers.onMeta).toHaveBeenCalledWith([{ name: 'id' }], 'SELECT');
    expect(handlers.onRows).toHaveBeenCalledWith([{ id: 1 }], 1);
    expect(handlers.onComplete).toHaveBeenCalledWith({
      rowCount: 1,
      queryTime: 42,
    });
    expect(handlers.onError).not.toHaveBeenCalled();

    handle.abort();
    expect(abort).toHaveBeenCalled();
  });

  it('forwards stream errors onto onError', () => {
    vi.mocked(streamingQuery.executeStreamingQuery).mockImplementation(
      (options: any) => {
        options.onError('boom', { message: 'boom' });
        return { abort: vi.fn() };
      }
    );

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    sqlStreamingExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'SELECT bad',
        params: {},
      },
      handlers
    );

    expect(handlers.onError).toHaveBeenCalledWith({
      message: 'boom',
      detail: { message: 'boom' },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/sqlStreamingExecutor.test.ts`
Expected: FAIL — `~/components/modules/raw-query/services` does not exist.

- [ ] **Step 3: Write the executor contract**

Create `components/modules/raw-query/contracts/rawQueryExecutor.ts`:

```ts
import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/data-grid/utils';
import type { Connection } from '~/core/stores';
import type { DatabaseDriverError } from '~/core/types';

export interface RawQueryExecuteRequest {
  connection: Connection | undefined;
  /** Final statement text, prefix already applied by the caller. */
  query: string;
  params: Record<string, unknown>;
}

export interface RawQueryExecuteError {
  message: string;
  detail?: DatabaseDriverError;
}

export interface RawQueryExecuteHandlers {
  /** Column metadata; call once, before any rows. */
  onMeta(fields: FieldDef[], command?: string): void;
  /** A batch of rows plus the running total. Streaming engines call repeatedly. */
  onRows(rows: RowData[], totalSoFar: number): void;
  onComplete(summary: { rowCount: number; queryTime: number }): void;
  onError(error: RawQueryExecuteError): void;
}

export interface RawQueryExecuteHandle {
  abort(): void;
}

export interface RawQueryExecutor {
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle;
}
```

Append to `components/modules/raw-query/contracts/index.ts`:

```ts
export type {
  RawQueryExecuteError,
  RawQueryExecuteHandle,
  RawQueryExecuteHandlers,
  RawQueryExecuteRequest,
  RawQueryExecutor,
} from './rawQueryExecutor';
```

- [ ] **Step 4: Write the streaming executor**

Create `components/modules/raw-query/services/sqlStreamingExecutor.ts`:

```ts
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type {
  RawQueryExecuteHandle,
  RawQueryExecuteHandlers,
  RawQueryExecuteRequest,
  RawQueryExecutor,
} from '../contracts';
import { executeStreamingQuery } from '../hooks/useStreamingQuery';

/**
 * Default executor for every SQL engine: NDJSON streaming so rows render
 * progressively.
 */
export const sqlStreamingExecutor: RawQueryExecutor = {
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle {
    const connectionParams = getConnectionParams(request.connection);

    const { abort } = executeStreamingQuery({
      query: request.query,
      ...connectionParams,
      params: request.params,
      onMeta: (fields, command) => handlers.onMeta(fields, command),
      onRows: (rows, totalSoFar) => handlers.onRows(rows, totalSoFar),
      onDone: (rowCount, queryTime) =>
        handlers.onComplete({ rowCount, queryTime }),
      onError: (message, detail) => handlers.onError({ message, detail }),
    });

    return { abort };
  },
};
```

Create `components/modules/raw-query/services/index.ts`:

```ts
export { sqlStreamingExecutor } from './sqlStreamingExecutor';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/sqlStreamingExecutor.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green. Nothing consumes the executor yet.

- [ ] **Step 7: Report files for staging**

---

### Task 4: Redis command executor

**Files:**

- Create: `components/modules/driver/redis/raw-query/utils/normalizeRedisResult.ts`
- Create: `components/modules/driver/redis/raw-query/utils/index.ts`
- Create: `components/modules/driver/redis/raw-query/services/redisCommandExecutor.ts`
- Create: `components/modules/driver/redis/raw-query/services/index.ts`
- Create: `components/modules/driver/redis/raw-query/index.ts`
- Test: `test/nuxt/components/modules/driver/redis/raw-query/redisCommandExecutor.test.ts`

**Interfaces:**

- Consumes: `RawQueryExecutor` and friends from `~/components/modules/raw-query/contracts`.
- Produces: `normalizeRedisResult(value: unknown): { rows: RowData[]; fields: FieldDef[] }`; `createRedisCommandExecutor(databaseIndex: Ref<number> | undefined): RawQueryExecutor`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/driver/redis/raw-query/redisCommandExecutor.test.ts`:

```ts
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRedisCommandExecutor } from '~/components/modules/driver/redis/raw-query/services';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

const mockFetch = vi.fn();
(global as any).$fetch = mockFetch;

describe('createRedisCommandExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the command to the workbench endpoint with the selected database index', async () => {
    mockFetch.mockResolvedValue({ command: ['GET'], result: 'value' });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    const executor = createRedisCommandExecutor(ref(5));
    executor.execute(
      {
        connection: {
          method: EConnectionMethod.CONNECTION_STRING,
          connectionString: 'redis://127.0.0.1:6379/0',
        } as any,
        query: 'GET foo',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onComplete).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/redis/workbench/execute',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          stringConnection: 'redis://127.0.0.1:6379/0',
          databaseIndex: 5,
          command: 'GET foo',
        }),
      })
    );
    expect(handlers.onMeta).toHaveBeenCalledWith([{ name: 'value' }], 'GET');
    expect(handlers.onRows).toHaveBeenCalledWith([{ value: 'value' }], 1);
  });

  it('reports failures through onError', async () => {
    mockFetch.mockRejectedValue({ data: { message: 'WRONGTYPE' } });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    const executor = createRedisCommandExecutor(ref(0));
    executor.execute(
      {
        connection: { connectionString: 'redis://127.0.0.1:6379/0' } as any,
        query: 'LPUSH foo bar',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'WRONGTYPE' })
    );
    expect(handlers.onComplete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/redis/raw-query/redisCommandExecutor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Move the Redis normalizer out of the core**

Create `components/modules/driver/redis/raw-query/utils/normalizeRedisResult.ts` with the body currently at `components/modules/raw-query/hooks/useQueryExecution.ts:39-92`, exported:

```ts
import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/data-grid/utils';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const toFieldDefs = (fieldNames: string[]) =>
  fieldNames.map(name => ({ name }) as FieldDef);

/**
 * Redis replies are untyped. Flatten them into grid rows plus column metadata.
 */
export const normalizeRedisResult = (
  value: unknown
): {
  rows: RowData[];
  fields: FieldDef[];
} => {
  if (Array.isArray(value)) {
    if (value.every(item => isPlainObject(item))) {
      const rows = value as RowData[];
      const fieldNames = Array.from(
        new Set(
          rows.flatMap(row => Object.keys(row as Record<string, unknown>))
        )
      );

      return { rows, fields: toFieldDefs(fieldNames) };
    }

    return {
      rows: value.map((item, index) => ({ index, value: item })),
      fields: toFieldDefs(['index', 'value']),
    };
  }

  if (isPlainObject(value)) {
    const rows = [value as RowData];
    return { rows, fields: toFieldDefs(Object.keys(value)) };
  }

  return { rows: [{ value }], fields: toFieldDefs(['value']) };
};
```

Create `components/modules/driver/redis/raw-query/utils/index.ts`:

```ts
export { normalizeRedisResult } from './normalizeRedisResult';
```

- [ ] **Step 4: Write the Redis executor**

Create `components/modules/driver/redis/raw-query/services/redisCommandExecutor.ts`:

```ts
import type {
  RawQueryExecuteHandle,
  RawQueryExecuteHandlers,
  RawQueryExecuteRequest,
  RawQueryExecutor,
} from '~/components/modules/raw-query/contracts';
import { normalizeRedisResult } from '../utils';

interface RedisCommandResponse {
  command?: string[];
  result: unknown;
}

/**
 * Redis runs through a dedicated workbench endpoint and returns the whole
 * reply at once, so there is nothing to stream and nothing to abort.
 */
export const createRedisCommandExecutor = (
  databaseIndex: Ref<number> | undefined
): RawQueryExecutor => ({
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle {
    const connection = request.connection;
    const startedAt = Date.now();

    void (async () => {
      try {
        const response = await $fetch<RedisCommandResponse>(
          '/api/redis/workbench/execute',
          {
            method: 'POST',
            body: {
              method: connection?.method,
              stringConnection: connection?.connectionString,
              host: connection?.host,
              port: connection?.port,
              username: connection?.username,
              password: connection?.password,
              database: connection?.database,
              databaseIndex: databaseIndex?.value,
              ssl: connection?.ssl,
              ssh: connection?.ssh,
              command: request.query,
            },
          }
        );

        const normalized = normalizeRedisResult(response.result);
        const command =
          response.command?.[0] ||
          request.query.trim().split(/\s+/)[0]?.toUpperCase() ||
          'REDIS';

        handlers.onMeta(normalized.fields, command);
        handlers.onRows(normalized.rows, normalized.rows.length);
        handlers.onComplete({
          rowCount: normalized.rows.length,
          queryTime: Date.now() - startedAt,
        });
      } catch (error: unknown) {
        const failure = error as {
          data?: { message?: string };
          message?: string;
        };
        const message =
          failure?.data?.message ||
          failure?.message ||
          'Failed to execute Redis command.';

        handlers.onError({
          message,
          detail: (failure?.data ?? { message }) as never,
        });
      }
    })();

    return { abort: () => undefined };
  },
});
```

Create `components/modules/driver/redis/raw-query/services/index.ts`:

```ts
export { createRedisCommandExecutor } from './redisCommandExecutor';
```

Create `components/modules/driver/redis/raw-query/index.ts`:

```ts
export { REDIS_RAW_QUERY_CAPABILITIES } from './capabilities';
export { createRedisCommandExecutor } from './services';
export { normalizeRedisResult } from './utils';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/redis/raw-query/redisCommandExecutor.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green. The core still has its own copy of the normalizer; Task 6 deletes it.

- [ ] **Step 7: Report files for staging**

---

### Task 5: PostgreSQL EXPLAIN executor

**Files:**

- Create: `components/modules/driver/postgres/raw-query/services/postgresExplainExecutor.ts`
- Create: `components/modules/driver/postgres/raw-query/services/index.ts`
- Create: `components/modules/driver/postgres/raw-query/index.ts`
- Test: `test/nuxt/components/modules/driver/postgres/raw-query/postgresExplainExecutor.test.ts`

**Interfaces:**

- Consumes: `RawQueryExecutor` and friends; `getConnectionParams`.
- Produces: `postgresExplainExecutor: RawQueryExecutor`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/driver/postgres/raw-query/postgresExplainExecutor.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postgresExplainExecutor } from '~/components/modules/driver/postgres/raw-query/services';

const mockFetch = vi.fn();
(global as any).$fetch = mockFetch;

describe('postgresExplainExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the prefixed statement through the non-streaming endpoint', async () => {
    mockFetch.mockResolvedValue({
      rows: [{ 'QUERY PLAN': [{ Plan: {} }] }],
      fields: [{ name: 'QUERY PLAN' }],
      queryTime: 12,
    });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    postgresExplainExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'EXPLAIN (ANALYZE, FORMAT JSON) SELECT 1',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onComplete).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/query/raw-execute',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          query: 'EXPLAIN (ANALYZE, FORMAT JSON) SELECT 1',
        }),
      })
    );
    expect(handlers.onMeta).toHaveBeenCalledWith(
      [{ name: 'QUERY PLAN' }],
      undefined
    );
    expect(handlers.onComplete).toHaveBeenCalledWith({
      rowCount: 1,
      queryTime: 12,
    });
  });

  it('reports failures through onError', async () => {
    mockFetch.mockRejectedValue({
      data: { message: 'syntax error at or near "SELCT"' },
    });

    const handlers = {
      onMeta: vi.fn(),
      onRows: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    };

    postgresExplainExecutor.execute(
      {
        connection: { connectionString: 'postgres://x' } as any,
        query: 'EXPLAIN (ANALYZE) SELCT 1',
        params: {},
      },
      handlers
    );

    await vi.waitFor(() => expect(handlers.onError).toHaveBeenCalled());
    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'syntax error at or near "SELCT"',
      })
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/postgres/raw-query/postgresExplainExecutor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the EXPLAIN executor**

Create `components/modules/driver/postgres/raw-query/services/postgresExplainExecutor.ts`:

```ts
import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/data-grid/utils';
import type {
  RawQueryExecuteHandle,
  RawQueryExecuteHandlers,
  RawQueryExecuteRequest,
  RawQueryExecutor,
} from '~/components/modules/raw-query/contracts';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { DatabaseDriverError } from '~/core/types';

interface RawExecuteResponse {
  rows: RowData[];
  fields: FieldDef[];
  queryTime?: number;
}

/**
 * EXPLAIN returns one plan row, so it uses the non-streaming endpoint.
 * Streaming would add a round trip for no benefit.
 */
export const postgresExplainExecutor: RawQueryExecutor = {
  execute(
    request: RawQueryExecuteRequest,
    handlers: RawQueryExecuteHandlers
  ): RawQueryExecuteHandle {
    const connectionParams = getConnectionParams(request.connection);

    void (async () => {
      try {
        const result = await $fetch<RawExecuteResponse>(
          '/api/query/raw-execute',
          {
            method: 'POST',
            body: {
              ...connectionParams,
              query: request.query,
              params: request.params,
            },
          }
        );

        handlers.onMeta(result.fields, undefined);
        handlers.onRows(result.rows, result.rows.length);
        handlers.onComplete({
          rowCount: result.rows.length,
          queryTime: result.queryTime ?? 0,
        });
      } catch (error: unknown) {
        const failure = error as {
          data?: DatabaseDriverError & { message?: string };
          message?: string;
        };
        const message =
          failure?.data?.message ||
          failure?.message ||
          'Failed to run EXPLAIN.';

        handlers.onError({ message, detail: failure?.data });
      }
    })();

    return { abort: () => undefined };
  },
};
```

Create `components/modules/driver/postgres/raw-query/services/index.ts`:

```ts
export { postgresExplainExecutor } from './postgresExplainExecutor';
```

Create `components/modules/driver/postgres/raw-query/index.ts`:

```ts
export { POSTGRES_RAW_QUERY_CAPABILITIES } from './capabilities';
export { postgresExplainExecutor } from './services';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/postgres/raw-query/postgresExplainExecutor.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 6: Report files for staging**

---

### Task 6: `useQueryExecution` runs an injected executor

**Files:**

- Modify: `components/modules/raw-query/hooks/useQueryExecution.ts`
- Modify: `components/modules/raw-query/hooks/useRawQueryEditor.ts`
- Modify: `test/nuxt/components/modules/raw-query/useQueryExecution.test.ts`

**Interfaces:**

- Consumes: `RawQueryExecutor` (Task 3), `sqlStreamingExecutor` (Task 3), `createRedisCommandExecutor` (Task 4), `postgresExplainExecutor` (Task 5).
- Produces: `executeCurrentStatement({ currentStatements, queryPrefix?, executor?, resultView? })`. The hook's params gain `executor: Ref<RawQueryExecutor>` and lose `redisDatabaseIndex` and `buildExplainAnalyzePrefix`; `onExplainAnalyzeCurrent` moves out of the hook.

- [ ] **Step 1: Rewrite the existing test file against the new shape**

In `test/nuxt/components/modules/raw-query/useQueryExecution.test.ts`, delete the Redis case (currently line 259 onward, moved in Task 4) and the EXPLAIN-via-`$fetch` case (currently line 153 onward, moved in Task 5). Replace every `buildExplainAnalyzePrefix: () => 'EXPLAIN ANALYZE',` line with `executor: ref(streamingExecutorStub),` and add at the top of the `describe`:

```ts
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';

const streamingExecutorStub = sqlStreamingExecutor;
```

Then add one new case proving the override path:

```ts
it('uses the executor passed to executeCurrentStatement over the default', async () => {
  const overrideExecute = vi.fn(() => ({ abort: vi.fn() }));
  const connection = ref({ connectionString: 'test-conn' });

  const { executeCurrentStatement } = useQueryExecution({
    getEditorView: getEditorViewMock,
    connection,
    capabilities: ref({
      language: 'sql',
      supportsVariables: true,
      supportsFormat: true,
      parameterStyle: 'colon',
    }),
    fileVariables: ref('{}'),
    fieldDefs: ref([]),
    resultTabs: resultTabsMock,
    executor: ref(sqlStreamingExecutor),
  });

  await executeCurrentStatement({
    currentStatements: [{ text: 'SELECT 1', from: 0, to: 8 } as any],
    queryPrefix: 'EXPLAIN (ANALYZE)',
    executor: { execute: overrideExecute },
    resultView: ViewMode.EXPLAIN,
  });

  expect(overrideExecute).toHaveBeenCalledWith(
    expect.objectContaining({ query: 'EXPLAIN (ANALYZE) SELECT 1' }),
    expect.anything()
  );
  expect(streamingQuery.executeStreamingQuery).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/useQueryExecution.test.ts`
Expected: FAIL — `useQueryExecution` does not accept `executor`.

- [ ] **Step 3: Rewrite `useQueryExecution`**

In `components/modules/raw-query/hooks/useQueryExecution.ts`: delete the `normalizeRedisResult` helper, `isPlainObject`, `toFieldDefs`, the `RedisCommandResponse` type, the `executeStreamingQuery` import, the `getConnectionParams` import and the `DatabaseClientType` import. New params:

```ts
interface UseQueryExecutionParams {
  getEditorView: () => EditorView | null;
  connection: Ref<Connection | undefined>;
  capabilities: Ref<RawQueryCapabilities | undefined>;
  executor: Ref<RawQueryExecutor>;
  fileVariables: Ref<string>;
  fieldDefs: Ref<FieldDef[]>;
  resultTabs: ResultTabsReturn;
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
}
```

Replace everything from the Redis branch to the end of the streaming branch with a single executor call. The prepare section (variables, prefix, tab registration) stays as-is up to `const rowBuffer: RowData[] = [];`, then:

```ts
const activeExecutor = executor ?? defaultExecutor;
queryProcessState.isStreaming = true;
queryProcessState.executeLoading = false;

const { abort } = activeExecutor.execute(
  {
    connection: connection.value,
    query: executeQuery,
    params: fileParameters,
  },
  {
    onMeta: (fields, command) => {
      fieldDefs.value = fields;
      executedResultItem.metadata.fieldDefs = fields;
      executedResultItem.metadata.connection = connection.value;
      executedResultItem.metadata.command = command;
      resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
    },
    onRows: (batch, totalSoFar) => {
      rowBuffer.push(...batch);
      queryProcessState.streamingRowCount = totalSoFar;
      executedResultItem.result = rowBuffer;
      executedResultItem.metadata.rowCount = totalSoFar;
      currentRawQueryResult.value = rowBuffer;
      resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
    },
    onComplete: ({ rowCount, queryTime }) => {
      queryProcessState.executeLoading = false;
      queryProcessState.isStreaming = false;
      queryProcessState.queryTime = queryTime;
      queryProcessState.executeErrors = undefined;
      queryProcessState.streamingRowCount = rowCount;

      executedResultItem.metadata.queryTime = queryTime;
      executedResultItem.metadata.rowCount = rowCount;

      rawResponse.value = {
        rows: executedResultItem.result,
        fields: fieldDefs.value,
        queryTime,
      };

      resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      activeStreamAbort = null;
    },
    onError: ({ message, detail }) => {
      const resolvedError = { message, data: detail || { message } };

      queryProcessState.executeLoading = false;
      queryProcessState.isStreaming = false;
      queryProcessState.executeErrors = resolvedError;
      executedResultItem.metadata.executeErrors = resolvedError;
      executedResultItem.view = ViewMode.ERROR;

      const editorView = getEditorView();
      if (editorView && detail) {
        applySqlErrorDiagnostics({
          editorView: editorView as EditorView,
          originalSql: currentStatement.text,
          statementFrom: Number(currentStatement.from),
          fileParameters,
          errorDetail: detail,
          clientType: connection.value?.type as DatabaseClientType,
          queryPrefix,
        });
      }

      resultTabs.refreshResultTab(executedResultItem.id, executedResultItem);
      activeStreamAbort = null;
    },
  }
);

activeStreamAbort = abort;
```

`applySqlErrorDiagnostics` needs the client type. Import the type only:

```ts
import type { DatabaseClientType } from '~/core/constants/database-client-type';
```

A type-only import carries no engine knowledge and no runtime dependency; the value flows in from the connection record.

Update the signature of `executeCurrentStatement`:

```ts
const executeCurrentStatement = async ({
  currentStatements,
  queryPrefix,
  executor: overrideExecutor,
  resultView,
}: {
  currentStatements: SyntaxTreeNodeData[];
  queryPrefix?: string;
  executor?: RawQueryExecutor;
  resultView?: ViewMode;
}) => {
```

Replace the prefix block so the core no longer inspects the prefix string:

```ts
const executedResultView: ExecutedResultItem['view'] =
  resultView ?? ViewMode.RESULT;

if (queryPrefix) {
  executeQuery = `${queryPrefix} ${executeQuery}`;
}
```

Use `const activeExecutor = overrideExecutor ?? executor.value;`.

Delete `onExplainAnalyzeCurrent` from this hook and from its return value.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/useQueryExecution.test.ts`
Expected: PASS — five cases (streaming, error, empty, variables, executor override).

- [ ] **Step 5: Rewire the facade**

In `components/modules/raw-query/hooks/useRawQueryEditor.ts`, build the executor from the capabilities and keep EXPLAIN working through the override until Task 11 moves it:

```ts
const executor = computed<RawQueryExecutor>(() =>
  capabilities.value?.language === 'redis'
    ? createRedisCommandExecutor(redisDatabaseIndex)
    : sqlStreamingExecutor
);

const queryExecution = useQueryExecution({
  getEditorView,
  connection,
  capabilities,
  executor,
  fileVariables,
  fieldDefs,
  resultTabs,
  beforeExecute,
  promptMissingVariables,
  onUpdateVariables,
});

const onExplainAnalyzeCurrent = () => {
  const editorView = getEditorView();
  if (!editorView) return;

  const { currentStatements } = getCurrentStatement(editorView);

  queryExecution.executeCurrentStatement({
    currentStatements,
    queryPrefix: buildExplainAnalyzePrefix(),
    executor: postgresExplainExecutor,
    resultView: ViewMode.EXPLAIN,
  });
};
```

Return `onExplainAnalyzeCurrent` from the facade so `RawQuery.vue` keeps compiling.

- [ ] **Step 6: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 7: Manual behavior check**

Run `bun run dev`. On PostgreSQL: run a `SELECT`, confirm rows stream in and the row counter climbs; run EXPLAIN and confirm the plan tab renders; run a broken statement and confirm the inline error squiggle appears. On Redis: run `GET`, `KEYS *` and a wrong-type command, confirming results and the error view. Cancel a long-running PostgreSQL query and confirm it aborts.

- [ ] **Step 8: Report files for staging**

---

### Task 7: Command result handlers move to their drivers

**Files:**

- Create: `components/modules/driver/shared/raw-query/constants/commandCategories.ts`
- Create: `components/modules/driver/shared/raw-query/constants/index.ts`
- Create: `components/modules/driver/shared/raw-query/services/baseCommandResultHandler.ts`
- Create: `components/modules/driver/shared/raw-query/services/genericCommandResultHandler.ts`
- Create: `components/modules/driver/shared/raw-query/services/index.ts`
- Create: `components/modules/driver/postgres/raw-query/services/postgresCommandResultHandler.ts`
- Create: `components/modules/driver/mysql/raw-query/services/mysqlCommandResultHandler.ts`
- Create: `components/modules/driver/mysql/raw-query/services/index.ts`
- Create: `components/modules/driver/sqlite/raw-query/services/sqliteCommandResultHandler.ts`
- Create: `components/modules/driver/sqlite/raw-query/services/index.ts`
- Create: `components/modules/driver/mssql/raw-query/services/mssqlCommandResultHandler.ts`
- Create: `components/modules/driver/mssql/raw-query/services/index.ts`
- Create: `components/modules/driver/oracle/raw-query/services/oracleCommandResultHandler.ts`
- Create: `components/modules/driver/oracle/raw-query/services/index.ts`
- Create: `components/modules/raw-query/contracts/rawQueryDriver.ts`
- Modify: `components/modules/raw-query/components/result-tab/ResultTabResultView.vue:23,70`
- Modify: `components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.ts` → becomes `resolveRawQueryDescriptor.ts`
- Delete: `components/modules/raw-query/utils/commandType.ts`
- Test: `test/nuxt/components/modules/driver/shared/raw-query/commandResultHandlers.test.ts`
- Delete: `test/nuxt/components/modules/raw-query/utils/commandType.test.ts` after porting its cases

**Interfaces:**

- Consumes: the existing handler classes in `components/modules/raw-query/utils/commandType.ts`.
- Produces: `CommandResult`, `CommandCategory`, `CommandResultHandlerFactory = (command: string, rowCount: number) => CommandResult`; one exported factory per engine (`postgresCommandResult`, `mysqlCommandResult`, `mysql2CommandResult`, `sqlite3CommandResult`, `betterSqlite3CommandResult`, `mssqlCommandResult`, `oracleCommandResult`, `genericCommandResult`); `RawQueryDriverDescriptor`; `resolveRawQueryDescriptor(type)`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/driver/shared/raw-query/commandResultHandlers.test.ts`. Port every case from `test/nuxt/components/modules/raw-query/utils/commandType.test.ts`, rewritten against the per-engine factories. Read that file first and keep each assertion's expected string verbatim; the skeleton is:

```ts
import { describe, expect, it } from 'vitest';
import { resolveRawQueryDescriptor } from '~/components/modules/driver/shared/raw-query';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('command result handlers via the descriptor', () => {
  it('reports a PostgreSQL SELECT as a non-mutation', () => {
    const result = resolveRawQueryDescriptor(
      DatabaseClientType.POSTGRES
    )!.commandResultHandler('SELECT', 3);

    expect(result.isMutation).toBe(false);
    expect(result.category).toBe('DML');
  });

  it('reports a PostgreSQL UPDATE as a mutation with the row count', () => {
    const result = resolveRawQueryDescriptor(
      DatabaseClientType.POSTGRES
    )!.commandResultHandler('UPDATE', 7);

    expect(result.isMutation).toBe(true);
    expect(result.message).toContain('7');
  });

  it('keeps the MySQL2 handler distinct from the MySQL one', () => {
    const mysql2 = resolveRawQueryDescriptor(DatabaseClientType.MYSQL2)!;
    const mysql = resolveRawQueryDescriptor(DatabaseClientType.MYSQL)!;

    expect(mysql2.commandResultHandler).not.toBe(mysql.commandResultHandler);
  });

  it('gives Redis the generic handler', () => {
    const result = resolveRawQueryDescriptor(
      DatabaseClientType.REDIS
    )!.commandResultHandler('GET', 1);

    expect(result.category).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/commandResultHandlers.test.ts`
Expected: FAIL — `resolveRawQueryDescriptor` is not exported.

- [ ] **Step 3: Split `commandType.ts`**

Read `components/modules/raw-query/utils/commandType.ts` in full. Move it in three pieces, copying each body verbatim:

1. `COMMAND_CATEGORIES` and the `CommandCategory` type → `driver/shared/raw-query/constants/commandCategories.ts`, re-exported from `constants/index.ts`.
2. `BaseCommandResultHandler` and the `CommandResult` interface → `driver/shared/raw-query/services/baseCommandResultHandler.ts`. `GenericCommandResultHandler` → `driver/shared/raw-query/services/genericCommandResultHandler.ts`, exported as a factory:

```ts
import type { CommandResult } from './baseCommandResultHandler';
import { BaseCommandResultHandler } from './baseCommandResultHandler';

class GenericCommandResultHandler extends BaseCommandResultHandler {}

export const genericCommandResult = (
  command: string,
  rowCount: number
): CommandResult => new GenericCommandResultHandler(command, rowCount).build();
```

3. Each engine subclass → its driver's `services/` folder, exported the same way. For example `driver/postgres/raw-query/services/postgresCommandResultHandler.ts`:

```ts
import {
  BaseCommandResultHandler,
  type CommandResult,
} from '~/components/modules/driver/shared/raw-query/services';

class PostgresCommandResultHandler extends BaseCommandResultHandler {
  // body copied verbatim from utils/commandType.ts
}

export const postgresCommandResult = (
  command: string,
  rowCount: number
): CommandResult => new PostgresCommandResultHandler(command, rowCount).build();
```

`driver/mysql/raw-query/services/mysqlCommandResultHandler.ts` exports both `mysqlCommandResult` (used by MySQL and MariaDB) and `mysql2CommandResult`. `driver/sqlite/raw-query/services/sqliteCommandResultHandler.ts` exports `sqlite3CommandResult` and `betterSqlite3CommandResult`.

- [ ] **Step 4: Write the descriptor contract**

Create `components/modules/raw-query/contracts/rawQueryDriver.ts`:

```ts
import type { RawQueryCapabilities } from './rawQueryCapabilities';
import type { RawQueryExecutor } from './rawQueryExecutor';

export interface CommandResult {
  isMutation: boolean;
  message: string;
  category: string;
}

/** Turns a command keyword and a row count into the result-tab summary line. */
export type CommandResultHandlerFactory = (
  command: string,
  rowCount: number
) => CommandResult;

export interface RawQueryDriverDescriptor {
  capabilities: RawQueryCapabilities;
  commandResultHandler: CommandResultHandlerFactory;
}
```

`executor` is not part of the descriptor: Redis builds its executor from a
reactive database index, so the entry container supplies it. The descriptor
carries only what is static per engine.

Append the exports to `contracts/index.ts`.

- [ ] **Step 5: Turn the capability resolver into a descriptor resolver**

Rename `resolveRawQueryCapabilities.ts` to `resolveRawQueryDescriptor.ts` (create the new file, delete the old one) and pair each capability object with its handler:

```ts
const RAW_QUERY_DESCRIPTORS: Partial<
  Record<DatabaseClientType, RawQueryDriverDescriptor>
> = {
  [DatabaseClientType.POSTGRES]: {
    capabilities: POSTGRES_RAW_QUERY_CAPABILITIES,
    commandResultHandler: postgresCommandResult,
  },
  [DatabaseClientType.MYSQL]: {
    capabilities: MYSQL_RAW_QUERY_CAPABILITIES,
    commandResultHandler: mysqlCommandResult,
  },
  [DatabaseClientType.MYSQL2]: {
    capabilities: MYSQL_RAW_QUERY_CAPABILITIES,
    commandResultHandler: mysql2CommandResult,
  },
  [DatabaseClientType.MARIADB]: {
    capabilities: MARIADB_RAW_QUERY_CAPABILITIES,
    commandResultHandler: mysqlCommandResult,
  },
  [DatabaseClientType.SQLITE3]: {
    capabilities: SQLITE_RAW_QUERY_CAPABILITIES,
    commandResultHandler: sqlite3CommandResult,
  },
  [DatabaseClientType.BETTER_SQLITE3]: {
    capabilities: SQLITE_RAW_QUERY_CAPABILITIES,
    commandResultHandler: betterSqlite3CommandResult,
  },
  [DatabaseClientType.ORACLE]: {
    capabilities: ORACLE_RAW_QUERY_CAPABILITIES,
    commandResultHandler: oracleCommandResult,
  },
  [DatabaseClientType.MSSQL]: {
    capabilities: MSSQL_RAW_QUERY_CAPABILITIES,
    commandResultHandler: mssqlCommandResult,
  },
  [DatabaseClientType.REDIS]: {
    capabilities: REDIS_RAW_QUERY_CAPABILITIES,
    commandResultHandler: genericCommandResult,
  },
};

export function resolveRawQueryDescriptor(
  type: DatabaseClientType | undefined
): RawQueryDriverDescriptor | undefined {
  if (!type) return undefined;
  return RAW_QUERY_DESCRIPTORS[type];
}
```

Export it from `driver/shared/raw-query/index.ts` alongside a thin
`resolveRawQueryCapabilities` that reads `?.capabilities`, so Task 2's callers
keep working.

- [ ] **Step 6: Point the result view at the descriptor**

In `components/modules/raw-query/components/result-tab/ResultTabResultView.vue`, replace the `createCommandResultFactory` import and its call at line 70 with a `commandResultHandler` prop supplied by the shell:

```ts
const props = defineProps<{
  // existing props unchanged
  commandResultHandler: CommandResultHandlerFactory;
}>();
```

and at the call site use `props.commandResultHandler(command, rowCount)` with the same arguments it passes today. Thread the prop down from `RawQuery.vue` through `RawQueryResultTabs.vue`, taking the value from `resolveRawQueryDescriptor(connection.type)?.commandResultHandler ?? genericCommandResult`.

- [ ] **Step 7: Delete the old module and its test**

Delete `components/modules/raw-query/utils/commandType.ts`, remove its export from `utils/index.ts`, and delete `test/nuxt/components/modules/raw-query/utils/commandType.test.ts` once every case is ported.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/commandResultHandlers.test.ts`
Expected: PASS.

- [ ] **Step 9: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 10: Report files for staging**

---

## Phase 3 — Shell and slots

### Task 8: Header and footer drop engine props and gain slots

**Files:**

- Modify: `components/modules/raw-query/components/RawQueryEditorHeader.vue`
- Modify: `components/modules/raw-query/components/RawQueryEditorFooter.vue`
- Modify: `components/modules/raw-query/RawQuery.vue`
- Create: `components/modules/driver/redis/raw-query/components/RedisDatabasePicker.vue`
- Create: `components/modules/driver/redis/raw-query/components/index.ts`
- Create: `components/modules/driver/postgres/raw-query/components/ExplainOptionsMenu.vue`
- Create: `components/modules/driver/postgres/raw-query/components/index.ts`
- Test: `test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts`

**Interfaces:**

- Consumes: `ExplainAnalyzeOptionItem`, `ExplainAnalyzeSerializeMode` from `../interfaces`.
- Produces: `RawQueryEditorHeader` and `RawQueryEditorFooter` each expose an `#extra` slot; both drop their engine-specific props and emits.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts`:

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';

describe('RawQueryEditorFooter', () => {
  it('renders engine-contributed controls in the extra slot', async () => {
    const wrapper = await mountSuspended(RawQueryEditorFooter, {
      props: {
        cursorInfo: { line: 1, column: 1 },
        executeLoading: false,
        isStreaming: false,
        isSupportFormat: true,
        isSupportVariable: true,
      },
      slots: {
        extra: () => h('button', { 'data-testid': 'engine-action' }, 'Explain'),
      },
    });

    expect(wrapper.find('[data-testid="engine-action"]').exists()).toBe(true);
  });

  it('does not render EXPLAIN controls of its own', async () => {
    const wrapper = await mountSuspended(RawQueryEditorFooter, {
      props: {
        cursorInfo: { line: 1, column: 1 },
        executeLoading: false,
        isStreaming: false,
        isSupportFormat: true,
        isSupportVariable: true,
      },
    });

    expect(wrapper.text()).not.toContain('Explain');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts`
Expected: FAIL — the footer requires `explainAnalyzeOptionItems` and still renders its own EXPLAIN control.

- [ ] **Step 3: Move the EXPLAIN controls into a PostgreSQL component**

Read `components/modules/raw-query/components/RawQueryEditorFooter.vue`. Cut the EXPLAIN button, the option dropdown and the serialize-mode selector into `components/modules/driver/postgres/raw-query/components/ExplainOptionsMenu.vue`, keeping the markup and classes identical:

```vue
<script setup lang="ts">
import type {
  ExplainAnalyzeOptionItem,
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
} from '~/components/modules/raw-query/interfaces';

defineProps<{
  optionItems: ExplainAnalyzeOptionItem[];
  serializeMode: ExplainAnalyzeSerializeMode;
}>();

defineEmits<{
  (e: 'run'): void;
  (e: 'toggleOption', option: ExplainAnalyzeToggleOptionKey): void;
  (e: 'update:serializeMode', mode: ExplainAnalyzeSerializeMode): void;
}>();
</script>

<template>
  <!-- markup moved verbatim from RawQueryEditorFooter.vue -->
</template>
```

Create `components/modules/driver/postgres/raw-query/components/index.ts` exporting it.

- [ ] **Step 4: Give the footer an `#extra` slot**

In `RawQueryEditorFooter.vue`, delete the props `explainAnalyzeOptionItems`, `serializeMode`, `isExplainSupported` and the emits `on-explain-analyze-current`, `toggle-explain-option`, `update:serialize-mode`. Put `<slot name="extra" />` where the EXPLAIN controls were.

- [ ] **Step 5: Move the Redis picker and give the header an `#extra` slot**

Read `components/modules/raw-query/components/RawQueryEditorHeader.vue:110-125`. Move that block into `components/modules/driver/redis/raw-query/components/RedisDatabasePicker.vue`:

```vue
<script setup lang="ts">
import type { RedisDatabaseOption } from '~/core/types/redis-workspace.types';

defineProps<{
  databases: RedisDatabaseOption[];
  databaseIndex: number;
}>();

defineEmits<{
  (e: 'update:databaseIndex', databaseIndex: number): void;
}>();
</script>

<template>
  <!-- markup moved verbatim, keeping trigger-id="raw-query-redis-db-index" -->
</template>
```

In the header, delete the props `isRedisConnection`, `redisDatabases`, `redisDatabaseIndex` and the emit `update:redisDatabaseIndex`, and put `<slot name="extra" />` in their place.

- [ ] **Step 6: Update `RawQuery.vue` to fill the slots**

In the template, wrap the two components:

```vue
<RawQueryEditorHeader ...remaining props...>
  <template #extra>
    <RedisDatabasePicker
      v-if="isRedisConnection"
      :databases="redisWorkspace.databases.value"
      :database-index="redisWorkspace.selectedDatabaseIndex.value"
      @update:database-index="updateRedisDatabaseIndex"
    />
  </template>
</RawQueryEditorHeader>
```

```vue
<RawQueryEditorFooter ...remaining props...>
  <template #extra>
    <ExplainOptionsMenu
      v-if="isExplainSupported"
      :option-items="explainAnalyzeOptionItems"
      :serialize-mode="serializeMode"
      @run="onExplainAnalyzeCurrent"
      @toggle-option="rawQueryEditor.toggleExplainOption"
      @update:serialize-mode="rawQueryEditor.setSerializeMode"
    />
  </template>
</RawQueryEditorFooter>
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 8: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 9: Manual behavior check**

Run `bun run dev`. Confirm the EXPLAIN button, its option checkboxes and the serialize dropdown look and behave exactly as before on PostgreSQL, are absent elsewhere, and that the Redis database picker still switches databases.

- [ ] **Step 10: Report files for staging**

---

### Task 9: Context menu takes contributed items

**Files:**

- Modify: `components/modules/raw-query/hooks/useRawQueryEditorContextMenu.ts`
- Modify: `components/modules/raw-query/RawQuery.vue`
- Test: `test/unit/components/modules/raw-query/useRawQueryEditorContextMenu.spec.ts`

**Interfaces:**

- Consumes: `ContextMenuItem`, `ContextMenuItemType` from `~/components/base/context-menu/menuContext.type`.
- Produces: `useRawQueryEditorContextMenu` accepts `extraItems?: Ref<ContextMenuItem[]>` and no longer accepts `isExplainSupported` or `onExplainAnalyzeCurrent`.

- [ ] **Step 1: Write the failing test**

Create `test/unit/components/modules/raw-query/useRawQueryEditorContextMenu.spec.ts`:

```ts
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useRawQueryEditorContextMenu } from '~/components/modules/raw-query/hooks/useRawQueryEditorContextMenu';

describe('useRawQueryEditorContextMenu', () => {
  const baseActions = {
    onExecuteCurrent: vi.fn(),
    onHandleFormatCurrentStatement: vi.fn(),
    onHandleFormatCode: vi.fn(),
    getEditorView: () => null,
  };

  it('includes engine-contributed items', () => {
    const { contextMenuItems } = useRawQueryEditorContextMenu({
      ...baseActions,
      isSupportFormat: ref(true),
      extraItems: ref([
        { id: 'explain', label: 'Explain Analyze', onClick: vi.fn() } as never,
      ]),
    });

    expect(
      contextMenuItems.value.some(item => (item as any).id === 'explain')
    ).toBe(true);
  });

  it('omits them when the engine contributes none', () => {
    const { contextMenuItems } = useRawQueryEditorContextMenu({
      ...baseActions,
      isSupportFormat: ref(true),
    });

    expect(
      contextMenuItems.value.some(item => (item as any).id === 'explain')
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/raw-query/useRawQueryEditorContextMenu.spec.ts`
Expected: FAIL — `extraItems` is not a parameter.

- [ ] **Step 3: Implement the contribution point**

In `components/modules/raw-query/hooks/useRawQueryEditorContextMenu.ts`, change the actions interface:

```ts
interface EditorContextMenuActions {
  onExecuteCurrent: () => void;
  onHandleFormatCurrentStatement: () => void;
  onHandleFormatCode: () => void;
  isSupportFormat?: Ref<boolean>;
  /** Items contributed by the engine, e.g. PostgreSQL's EXPLAIN entry. */
  extraItems?: Ref<ContextMenuItem[]>;
  getEditorView: () => EditorView | null | undefined;
}
```

Read the rest of the file, delete the EXPLAIN entry from the `contextMenuItems` computed, and splice the contributed items in at that position:

```ts
...(actions.extraItems?.value ?? []),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/raw-query/useRawQueryEditorContextMenu.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Supply the item from `RawQuery.vue`**

```ts
const explainContextMenuItems = computed<ContextMenuItem[]>(() =>
  isExplainSupported.value
    ? [
        {
          id: 'explain-analyze',
          type: ContextMenuItemType.ITEM,
          label: 'Explain Analyze',
          onClick: () => rawQueryEditor.onExplainAnalyzeCurrent(),
        },
      ]
    : []
);
```

Read the deleted entry in the hook first and copy its exact `label`, `type`, icon and shortcut fields so the menu is unchanged.

Pass `extraItems: explainContextMenuItems` and drop `isExplainSupported` / `onExplainAnalyzeCurrent` from the call.

- [ ] **Step 6: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 7: Manual behavior check**

Right-click in the editor on PostgreSQL: the EXPLAIN entry is present and runs. On MySQL and Redis: it is absent, and the other entries are unchanged.

- [ ] **Step 8: Report files for staging**

---

### Task 10: `RawQueryShell` and `useRawQueryCore`

**Files:**

- Create: `components/modules/raw-query/hooks/useRawQueryCore.ts`
- Create: `components/modules/raw-query/shell/RawQueryShell.vue`
- Create: `components/modules/raw-query/shell/index.ts`
- Create: `components/modules/driver/shared/sql/raw-query/containers/BaseSqlRawQuery.vue`
- Create: `components/modules/driver/shared/sql/raw-query/containers/index.ts`
- Create: `components/modules/driver/shared/sql/raw-query/index.ts`
- Modify: `components/modules/raw-query/index.ts`
- Test: `test/nuxt/components/modules/raw-query/RawQueryShell.test.ts`

**Interfaces:**

- Consumes: everything built in Tasks 1-9.
- Produces: `useRawQueryCore({ descriptor, executor, isSupportVariable })` returning the full editor surface; `RawQueryShell` props `{ descriptor: RawQueryDriverDescriptor; executor: RawQueryExecutor; isSupportVariable?: boolean; extraKeymap?: KeyBinding[]; extraContextMenuItems?: ContextMenuItem[] }` and slots `header-extra`, `footer-extra`, `result-view`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/raw-query/RawQueryShell.test.ts`:

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { REDIS_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/redis/raw-query';
import { genericCommandResult } from '~/components/modules/driver/shared/raw-query/services';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';
import RawQueryShell from '~/components/modules/raw-query/shell/RawQueryShell.vue';

describe('RawQueryShell', () => {
  const descriptor = {
    capabilities: REDIS_RAW_QUERY_CAPABILITIES,
    commandResultHandler: genericCommandResult,
  };

  it('renders engine contributions in the header and footer slots', async () => {
    const wrapper = await mountSuspended(RawQueryShell, {
      props: { descriptor, executor: sqlStreamingExecutor },
      slots: {
        'header-extra': () => h('div', { 'data-testid': 'header-extra' }),
        'footer-extra': () => h('div', { 'data-testid': 'footer-extra' }),
      },
    });

    expect(wrapper.find('[data-testid="header-extra"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="footer-extra"]').exists()).toBe(true);
  });

  it('disables the variables pane when the engine does not support them', async () => {
    const wrapper = await mountSuspended(RawQueryShell, {
      props: { descriptor, executor: sqlStreamingExecutor },
    });

    expect(wrapper.text()).toContain('Variables not supported');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/RawQueryShell.test.ts`
Expected: FAIL — the shell does not exist.

- [ ] **Step 3: Write `useRawQueryCore`**

Create `components/modules/raw-query/hooks/useRawQueryCore.ts` from `useRawQueryEditor.ts`, with the EXPLAIN wiring removed and the executor taken as a parameter:

```ts
export function useRawQueryCore({
  descriptor,
  executor,
  fileVariables,
  connection,
  fieldDefs,
  extraKeymap,
  beforeExecute,
  promptMissingVariables,
  onUpdateVariables,
}: {
  descriptor: Ref<RawQueryDriverDescriptor>;
  executor: Ref<RawQueryExecutor>;
  fileVariables: Ref<string>;
  connection: Ref<Connection | undefined>;
  fieldDefs: Ref<FieldDef[]>;
  extraKeymap?: KeyBinding[];
  beforeExecute?: () => Promise<boolean>;
  promptMissingVariables?: (
    missing: string[]
  ) => Promise<{ values: Record<string, any>; insertBack: boolean } | null>;
  onUpdateVariables?: (value: string) => void;
}) {
  const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
  const capabilities = computed(() => descriptor.value.capabilities);
  const resultTabs = useResultTabs();

  const getEditorView = () =>
    (codeEditorRef.value?.editorView as EditorView | undefined) ?? null;

  const queryExecution = useQueryExecution({
    getEditorView,
    connection,
    capabilities,
    executor,
    fileVariables,
    fieldDefs,
    resultTabs,
    beforeExecute,
    promptMissingVariables,
    onUpdateVariables,
  });

  const sqlEditor = useSqlEditorExtensions({
    codeEditorRef,
    fileVariables,
    capabilities,
    extraKeymap,
    onExecuteStatement: queryExecution.executeCurrentStatement,
  });

  return {
    codeEditorRef,
    capabilities,
    executeCurrentStatement: queryExecution.executeCurrentStatement,
    currentRawQueryResult: queryExecution.currentRawQueryResult,
    rawResponse: queryExecution.rawResponse,
    queryProcessState: queryExecution.queryProcessState,
    onExecuteCurrent: queryExecution.onExecuteCurrent,
    cancelStreamingQuery: queryExecution.cancelStreamingQuery,
    extensions: sqlEditor.extensions,
    sqlCompartment: sqlEditor.sqlCompartment,
    cursorInfo: sqlEditor.cursorInfo,
    onHandleFormatCode: sqlEditor.onHandleFormatCode,
    onHandleFormatCurrentStatement: sqlEditor.onHandleFormatCurrentStatement,
    reloadSqlCompartment: sqlEditor.reloadSqlCompartment,
    executedResults: resultTabs.executedResults,
    activeResultTabId: resultTabs.activeResultTabId,
    setActiveResultTab: resultTabs.setActiveResultTab,
    closeResultTab: resultTabs.closeResultTab,
    closeOtherResultTabs: resultTabs.closeOtherResultTabs,
    closeResultTabsToRight: resultTabs.closeResultTabsToRight,
    updateResultTabView: resultTabs.updateResultTabView,
  };
}
```

- [ ] **Step 4: Write `RawQueryShell.vue`**

Copy `RawQuery.vue` to `shell/RawQueryShell.vue` and change four things:

1. Props become `{ descriptor, executor, isSupportVariable?, extraKeymap?, extraContextMenuItems? }`. Delete `resolveRawQueryDescriptor`, `useRedisWorkspace`, `DatabaseClientType`, `isRedisConnection`, `isExplainSupported`, `redisWorkspace` and `updateRedisDatabaseIndex`.
2. `isFormatSupported` and `isVariableSupported` read from `props.descriptor.capabilities`.
3. Call `useRawQueryCore` instead of `useRawQueryEditor`, passing `props.extraKeymap`; pass `props.extraContextMenuItems` to `useRawQueryEditorContextMenu`.
4. The header and footer `#extra` slots forward to `<slot name="header-extra" />` and `<slot name="footer-extra" />`; the result region passes `#result-view` through to `RawQueryResultTabs`, whose own result slot falls back to today's view set.

The Variables empty-state copy stays exactly as it is for now; Task 16 changes it.

Create `shell/index.ts`:

```ts
export { default as RawQueryShell } from './RawQueryShell.vue';
```

- [ ] **Step 5: Write `BaseSqlRawQuery.vue`**

Create `components/modules/driver/shared/sql/raw-query/containers/BaseSqlRawQuery.vue`:

```vue
<script setup lang="ts">
import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';
import { RawQueryShell } from '~/components/modules/raw-query/shell';

defineProps<{
  descriptor: RawQueryDriverDescriptor;
}>();
</script>

<template>
  <RawQueryShell :descriptor="descriptor" :executor="sqlStreamingExecutor" />
</template>
```

Add the two barrels.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/raw-query/RawQueryShell.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 7: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green. `RawQuery.vue` still exists and is still what the page renders.

- [ ] **Step 8: Report files for staging**

---

## Phase 4 — Engine entries and the resolver

### Task 11: PostgreSQL entry and the EXPLAIN move

**Files:**

- Create: `components/modules/driver/postgres/raw-query/explain/` — the whole of `components/modules/raw-query/modules/explain-query/`, plus `utils/parseExplainPlan.ts` and `interfaces/explainAnalyzeResult.ts` from the core
- Create: `components/modules/driver/postgres/raw-query/hooks/usePostgresExplain.ts`
- Create: `components/modules/driver/postgres/raw-query/hooks/index.ts`
- Create: `components/modules/driver/postgres/raw-query/constants/explainAnalyzeOptions.ts`
- Create: `components/modules/driver/postgres/raw-query/constants/index.ts`
- Create: `components/modules/driver/postgres/raw-query/types/explainAnalyze.types.ts`
- Create: `components/modules/driver/postgres/raw-query/types/index.ts`
- Create: `components/modules/driver/postgres/raw-query/containers/PostgresRawQuery.vue`
- Create: `components/modules/driver/postgres/raw-query/containers/index.ts`
- Delete: `components/modules/raw-query/modules/explain-query/`, `components/modules/raw-query/utils/parseExplainPlan.ts`, `components/modules/raw-query/hooks/useRawQueryExplainAnalyzeOptions.ts`, `components/modules/raw-query/interfaces/explainAnalyzeResult.ts`
- Modify: `components/modules/raw-query/interfaces/index.ts`, `utils/index.ts`, `constants/index.ts` — drop the EXPLAIN exports
- Test: `test/nuxt/components/modules/driver/postgres/raw-query/usePostgresExplain.test.ts`

**Interfaces:**

- Consumes: `useRawQueryCore`, `RawQueryShell`, `postgresExplainExecutor`, `ExplainOptionsMenu`.
- Produces: `usePostgresExplain({ executeCurrentStatement, getEditorView })` returning `{ optionItems, serializeMode, toggleOption, setSerializeMode, runExplain, explainKeymap, explainContextMenuItems }`; `PostgresRawQuery.vue`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/driver/postgres/raw-query/usePostgresExplain.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { usePostgresExplain } from '~/components/modules/driver/postgres/raw-query/hooks';
import { postgresExplainExecutor } from '~/components/modules/driver/postgres/raw-query/services';
import { ViewMode } from '~/components/modules/raw-query/interfaces';

vi.mock('~/components/base/code-editor/utils', () => ({
  getCurrentStatement: () => ({
    currentStatements: [{ text: 'SELECT 1', from: 0, to: 8 }],
  }),
}));

describe('usePostgresExplain', () => {
  it('runs the statement with the EXPLAIN prefix, executor and view', () => {
    const executeCurrentStatement = vi.fn();

    const explain = usePostgresExplain({
      executeCurrentStatement,
      getEditorView: () => ({}) as never,
    });

    explain.runExplain();

    expect(executeCurrentStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        queryPrefix: expect.stringContaining('EXPLAIN ('),
        executor: postgresExplainExecutor,
        resultView: ViewMode.EXPLAIN,
      })
    );
  });

  it('drops an option from the prefix when it is toggled off', () => {
    const executeCurrentStatement = vi.fn();

    const explain = usePostgresExplain({
      executeCurrentStatement,
      getEditorView: () => ({}) as never,
    });

    explain.toggleOption('BUFFERS');
    explain.runExplain();

    const prefix = executeCurrentStatement.mock.calls[0][0].queryPrefix;
    expect(prefix).not.toContain('BUFFERS');
    expect(prefix).toContain('ANALYZE');
  });

  it('contributes the Mod-e keybinding', () => {
    const explain = usePostgresExplain({
      executeCurrentStatement: vi.fn(),
      getEditorView: () => ({}) as never,
    });

    expect(explain.explainKeymap.some(binding => binding.key === 'Mod-e')).toBe(
      true
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/postgres/raw-query/usePostgresExplain.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Move the EXPLAIN module**

Recreate `components/modules/raw-query/modules/explain-query/` under `components/modules/driver/postgres/raw-query/explain/`, file for file, content unchanged except imports: anything that pointed at `../../interfaces` or `../../utils` for EXPLAIN types now points at `../types`, and anything that still needs core types (`ViewMode`, `ExecutedResultItem`) uses `~/components/modules/raw-query/interfaces`. Move `utils/parseExplainPlan.ts` to `explain/utils/parseExplainPlan.ts` and `interfaces/explainAnalyzeResult.ts` to `types/explainAnalyze.types.ts`. Move the EXPLAIN option types (`ExplainAnalyzeOptionKey`, `ExplainAnalyzeToggleOptionKey`, `ExplainAnalyzeSerializeMode`, `ExplainAnalyzeOptionItem`) out of the core `interfaces/index.ts` into `types/explainAnalyze.types.ts`, and `EXPLAIN_ANALYZE_OPTIONS` out of the core `constants/index.ts` into `constants/explainAnalyzeOptions.ts`. Delete the originals and their exports.

Update `ExplainOptionsMenu.vue` (Task 8) to import its types from `../types`.

- [ ] **Step 4: Write `usePostgresExplain`**

Create `components/modules/driver/postgres/raw-query/hooks/usePostgresExplain.ts` with the body of the deleted `useRawQueryExplainAnalyzeOptions.ts` plus the run/keymap/menu wiring:

```ts
import type { KeyBinding } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { getCurrentStatement } from '~/components/base/code-editor/utils';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { EXPLAIN_ANALYZE_OPTIONS } from '../constants';
import { postgresExplainExecutor } from '../services';
import type {
  ExplainAnalyzeSerializeMode,
  ExplainAnalyzeToggleOptionKey,
} from '../types';

export function usePostgresExplain({
  executeCurrentStatement,
  getEditorView,
}: {
  executeCurrentStatement: (params: {
    currentStatements: unknown[];
    queryPrefix?: string;
    executor?: typeof postgresExplainExecutor;
    resultView?: ViewMode;
  }) => void;
  getEditorView: () => EditorView | null;
}) {
  // explainAnalyzeOptions, serializeMode, toggleOption, setSerializeMode,
  // optionItems and buildPrefix copied verbatim from the deleted
  // useRawQueryExplainAnalyzeOptions.ts

  const runExplain = () => {
    const editorView = getEditorView();
    if (!editorView) return;

    const { currentStatements } = getCurrentStatement(editorView);

    executeCurrentStatement({
      currentStatements,
      queryPrefix: buildPrefix(),
      executor: postgresExplainExecutor,
      resultView: ViewMode.EXPLAIN,
    });
  };

  const explainKeymap: KeyBinding[] = [
    {
      key: 'Mod-e',
      run: () => {
        runExplain();
        return true;
      },
      preventDefault: true,
    },
  ];

  const explainContextMenuItems: ContextMenuItem[] = [
    {
      id: 'explain-analyze',
      type: ContextMenuItemType.ITEM,
      label: 'Explain Analyze',
      onClick: () => runExplain(),
    },
  ];

  return {
    optionItems,
    serializeMode,
    toggleOption,
    setSerializeMode,
    runExplain,
    explainKeymap,
    explainContextMenuItems,
  };
}
```

Copy the context-menu item fields from the version written in Task 9 so the menu stays identical.

- [ ] **Step 5: Write the PostgreSQL entry**

Create `components/modules/driver/postgres/raw-query/containers/PostgresRawQuery.vue`:

```vue
<script setup lang="ts">
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';
import { RawQueryShell } from '~/components/modules/raw-query/shell';
import { POSTGRES_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { ExplainOptionsMenu } from '../components';
import { ExplainQueryContainer } from '../explain';
import { usePostgresExplain } from '../hooks';
import { postgresCommandResult } from '../services';

const shellRef = ref<InstanceType<typeof RawQueryShell> | null>(null);

const descriptor = {
  capabilities: POSTGRES_RAW_QUERY_CAPABILITIES,
  commandResultHandler: postgresCommandResult,
};

const explain = usePostgresExplain({
  executeCurrentStatement: params =>
    shellRef.value?.executeCurrentStatement(params),
  getEditorView: () => shellRef.value?.getEditorView() ?? null,
});
</script>

<template>
  <RawQueryShell
    ref="shellRef"
    :descriptor="descriptor"
    :executor="sqlStreamingExecutor"
    :extra-keymap="explain.explainKeymap"
    :extra-context-menu-items="explain.explainContextMenuItems"
  >
    <template #footer-extra>
      <ExplainOptionsMenu
        :option-items="explain.optionItems.value"
        :serialize-mode="explain.serializeMode.value"
        @run="explain.runExplain"
        @toggle-option="explain.toggleOption"
        @update:serialize-mode="explain.setSerializeMode"
      />
    </template>

    <template #result-view="{ tab }">
      <ExplainQueryContainer v-if="tab.view === ViewMode.EXPLAIN" :tab="tab" />
    </template>
  </RawQueryShell>
</template>
```

`RawQueryShell` must `defineExpose({ executeCurrentStatement, getEditorView })` for this to work — add it in Task 10's component if it is not already there.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/postgres/raw-query/usePostgresExplain.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green. `RawQuery.vue` no longer compiles against the moved EXPLAIN module, so strip its EXPLAIN wiring in the same step — it is deleted in Task 15 and only needs to keep building until then.

- [ ] **Step 8: Report files for staging**

---

### Task 12: Redis entry

**Files:**

- Create: `components/modules/driver/redis/raw-query/hooks/useRedisRawQuery.ts`
- Create: `components/modules/driver/redis/raw-query/hooks/index.ts`
- Create: `components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue`
- Create: `components/modules/driver/redis/raw-query/containers/index.ts`
- Modify: `components/modules/driver/redis/raw-query/index.ts`
- Test: `test/nuxt/components/modules/driver/redis/raw-query/RedisRawQuery.test.ts`

**Interfaces:**

- Consumes: `useRedisWorkspace` from `~/components/modules/driver/redis/quick-query/hooks/useRedisWorkspace`; `createRedisCommandExecutor` (Task 4).
- Produces: `useRedisRawQuery(connection)` returning `{ databases, selectedDatabaseIndex, setDatabaseIndex, executor }`; `RedisRawQuery.vue`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/driver/redis/raw-query/RedisRawQuery.test.ts`:

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import RedisRawQuery from '~/components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue';

vi.mock(
  '~/components/modules/driver/redis/quick-query/hooks/useRedisWorkspace',
  () => ({
    useRedisWorkspace: () => ({
      databases: ref([
        { index: 0, label: 'db0' },
        { index: 1, label: 'db1' },
      ]),
      selectedDatabaseIndex: ref(0),
    }),
  })
);

describe('RedisRawQuery', () => {
  it('renders the database picker in the header slot', async () => {
    const wrapper = await mountSuspended(RedisRawQuery);

    expect(
      wrapper.find('[trigger-id="raw-query-redis-db-index"]').exists()
    ).toBe(true);
  });

  it('does not render the EXPLAIN control', async () => {
    const wrapper = await mountSuspended(RedisRawQuery);

    expect(wrapper.text()).not.toContain('Explain');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/redis/raw-query/RedisRawQuery.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

Create `components/modules/driver/redis/raw-query/hooks/useRedisRawQuery.ts`:

```ts
import { useRedisWorkspace } from '~/components/modules/driver/redis/quick-query/hooks/useRedisWorkspace';
import type { RawQueryExecutor } from '~/components/modules/raw-query/contracts';
import type { Connection } from '~/core/stores';
import { createRedisCommandExecutor } from '../services';

export function useRedisRawQuery(connection: Ref<Connection | undefined>) {
  const workspace = useRedisWorkspace({ connection, mode: 'meta' });

  const setDatabaseIndex = (databaseIndex: number) => {
    workspace.selectedDatabaseIndex.value = databaseIndex;
  };

  const executor: RawQueryExecutor = createRedisCommandExecutor(
    workspace.selectedDatabaseIndex
  );

  return {
    databases: workspace.databases,
    selectedDatabaseIndex: workspace.selectedDatabaseIndex,
    setDatabaseIndex,
    executor,
  };
}
```

- [ ] **Step 4: Write the entry**

Create `components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue`:

```vue
<script setup lang="ts">
import { genericCommandResult } from '~/components/modules/driver/shared/raw-query/services';
import { useRawQueryFileContent } from '~/components/modules/raw-query/hooks';
import { RawQueryShell } from '~/components/modules/raw-query/shell';
import { REDIS_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { RedisDatabasePicker } from '../components';
import { useRedisRawQuery } from '../hooks';

const { connection } = useRawQueryFileContent();
const redis = useRedisRawQuery(connection);

const descriptor = {
  capabilities: REDIS_RAW_QUERY_CAPABILITIES,
  commandResultHandler: genericCommandResult,
};
</script>

<template>
  <RawQueryShell :descriptor="descriptor" :executor="redis.executor">
    <template #header-extra>
      <RedisDatabasePicker
        :databases="redis.databases.value"
        :database-index="redis.selectedDatabaseIndex.value"
        @update:database-index="redis.setDatabaseIndex"
      />
    </template>
  </RawQueryShell>
</template>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/redis/raw-query/RedisRawQuery.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 7: Report files for staging**

---

### Task 13: The five thin SQL entries

**Files:**

- Create: `components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue` and `containers/index.ts` and `index.ts`
- Create: `components/modules/driver/mariadb/raw-query/containers/MariadbRawQuery.vue` and `containers/index.ts` and `index.ts`
- Create: `components/modules/driver/sqlite/raw-query/containers/SqliteRawQuery.vue` and `containers/index.ts` and `index.ts`
- Create: `components/modules/driver/oracle/raw-query/containers/OracleRawQuery.vue` and `containers/index.ts` and `index.ts`
- Create: `components/modules/driver/mssql/raw-query/containers/MssqlRawQuery.vue` and `containers/index.ts` and `index.ts`
- Test: `test/nuxt/components/modules/driver/sqlRawQueryEntries.test.ts`

**Interfaces:**

- Consumes: `BaseSqlRawQuery` (Task 10), the capability constants (Task 1), the command result factories (Task 7).
- Produces: five entry components, each exported from its driver's `index.ts`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/driver/sqlRawQueryEntries.test.ts`:

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import MariadbRawQuery from '~/components/modules/driver/mariadb/raw-query/containers/MariadbRawQuery.vue';
import MssqlRawQuery from '~/components/modules/driver/mssql/raw-query/containers/MssqlRawQuery.vue';
import MysqlRawQuery from '~/components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue';
import OracleRawQuery from '~/components/modules/driver/oracle/raw-query/containers/OracleRawQuery.vue';
import SqliteRawQuery from '~/components/modules/driver/sqlite/raw-query/containers/SqliteRawQuery.vue';

describe('thin SQL raw query entries', () => {
  it.each([
    ['mysql', MysqlRawQuery],
    ['mariadb', MariadbRawQuery],
    ['sqlite', SqliteRawQuery],
    ['oracle', OracleRawQuery],
    ['mssql', MssqlRawQuery],
  ])('mounts the %s entry', async (_name, component) => {
    const wrapper = await mountSuspended(component);
    expect(wrapper.html()).toBeTruthy();
  });

  it('does not render EXPLAIN controls on any of them', async () => {
    const wrapper = await mountSuspended(MysqlRawQuery);
    expect(wrapper.text()).not.toContain('Explain');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/sqlRawQueryEntries.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the five entries**

`components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue`:

```vue
<script setup lang="ts">
import { BaseSqlRawQuery } from '~/components/modules/driver/shared/sql/raw-query';
import { MYSQL_RAW_QUERY_CAPABILITIES } from '../capabilities';
import { mysqlCommandResult } from '../services';

const descriptor = {
  capabilities: MYSQL_RAW_QUERY_CAPABILITIES,
  commandResultHandler: mysqlCommandResult,
};
</script>

<template>
  <BaseSqlRawQuery :descriptor="descriptor" />
</template>
```

`MariadbRawQuery.vue` — identical shape, `MARIADB_RAW_QUERY_CAPABILITIES`, and `mysqlCommandResult` imported from `~/components/modules/driver/shared/raw-query/services` re-export rather than from `driver/mysql`, because a driver must not import another driver. Add a `mariadbCommandResult` alias in `driver/shared/raw-query/services/index.ts` pointing at the MySQL handler if the handler itself needs to stay in `driver/mysql`; otherwise move the shared handler class into `driver/shared/raw-query/services/` and have both drivers wrap it.

`SqliteRawQuery.vue` — `SQLITE_RAW_QUERY_CAPABILITIES`, `sqlite3CommandResult`.

`OracleRawQuery.vue` — `ORACLE_RAW_QUERY_CAPABILITIES`, `oracleCommandResult`.

`MssqlRawQuery.vue` — `MSSQL_RAW_QUERY_CAPABILITIES`, `mssqlCommandResult`.

Each driver's `index.ts`:

```ts
export { default as MysqlRawQuery } from './containers/MysqlRawQuery.vue';
export { MYSQL_RAW_QUERY_CAPABILITIES } from './capabilities';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/sqlRawQueryEntries.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 6: Report files for staging**

---

### Task 14: Unsupported state, resolver, and the page switch

**Files:**

- Create: `components/modules/driver/shared/raw-query/containers/UnsupportedRawQuery.vue`
- Create: `components/modules/driver/shared/raw-query/containers/index.ts`
- Create: `components/modules/driver/shared/raw-query/resolveRawQueryComponent.ts`
- Modify: `components/modules/driver/shared/raw-query/index.ts`
- Modify: `pages/[workspaceId]/[connectionId]/explorer/[fileId].vue`
- Test: `test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts`

**Interfaces:**

- Consumes: the nine entry components.
- Produces: `resolveRawQueryComponent(type: DatabaseClientType | undefined): Component`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts`:

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { resolveRawQueryComponent } from '~/components/modules/driver/shared/raw-query';
import UnsupportedRawQuery from '~/components/modules/driver/shared/raw-query/containers/UnsupportedRawQuery.vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('resolveRawQueryComponent', () => {
  it.each([
    DatabaseClientType.POSTGRES,
    DatabaseClientType.MYSQL,
    DatabaseClientType.MYSQL2,
    DatabaseClientType.MARIADB,
    DatabaseClientType.SQLITE3,
    DatabaseClientType.BETTER_SQLITE3,
    DatabaseClientType.ORACLE,
    DatabaseClientType.MSSQL,
    DatabaseClientType.REDIS,
  ])('resolves a real entry for %s', type => {
    expect(resolveRawQueryComponent(type)).not.toBe(UnsupportedRawQuery);
  });

  it('maps both SQLite client types to the same entry', () => {
    expect(resolveRawQueryComponent(DatabaseClientType.BETTER_SQLITE3)).toBe(
      resolveRawQueryComponent(DatabaseClientType.SQLITE3)
    );
  });

  it.each([
    DatabaseClientType.MONGODB,
    DatabaseClientType.SNOWFLAKE,
    undefined,
  ])('falls back to the unsupported state for %s', type => {
    expect(resolveRawQueryComponent(type)).toBe(UnsupportedRawQuery);
  });

  it('tells the user raw query is unavailable for this engine', async () => {
    const wrapper = await mountSuspended(UnsupportedRawQuery);
    expect(wrapper.text()).toContain('Raw query is not supported');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the unsupported state**

Create `components/modules/driver/shared/raw-query/containers/UnsupportedRawQuery.vue`:

```vue
<script setup lang="ts">
import BaseEmpty from '~/components/base/base-empty/BaseEmpty.vue';
</script>

<template>
  <BaseEmpty
    title="Raw query is not supported"
    desc="This database engine does not have a raw query editor yet."
  />
</template>
```

`BaseEmpty`'s default icon is `icons:not-found`, already used elsewhere, so no new icon name needs verifying.

- [ ] **Step 4: Write the resolver**

Create `components/modules/driver/shared/raw-query/resolveRawQueryComponent.ts`:

```ts
import type { Component } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import UnsupportedRawQuery from './containers/UnsupportedRawQuery.vue';

/**
 * Each engine loads as its own chunk: PostgreSQL pulls the ECharts-backed
 * EXPLAIN timeline, and no other engine should pay for it.
 */
const RAW_QUERY_COMPONENTS: Partial<Record<DatabaseClientType, Component>> = {
  [DatabaseClientType.POSTGRES]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/postgres/raw-query/containers/PostgresRawQuery.vue'
      )
  ),
  [DatabaseClientType.MYSQL]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue'
      )
  ),
  [DatabaseClientType.MYSQL2]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue'
      )
  ),
  [DatabaseClientType.MARIADB]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/mariadb/raw-query/containers/MariadbRawQuery.vue'
      )
  ),
  [DatabaseClientType.SQLITE3]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/sqlite/raw-query/containers/SqliteRawQuery.vue'
      )
  ),
  [DatabaseClientType.BETTER_SQLITE3]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/sqlite/raw-query/containers/SqliteRawQuery.vue'
      )
  ),
  [DatabaseClientType.ORACLE]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/oracle/raw-query/containers/OracleRawQuery.vue'
      )
  ),
  [DatabaseClientType.MSSQL]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/mssql/raw-query/containers/MssqlRawQuery.vue'
      )
  ),
  [DatabaseClientType.REDIS]: defineAsyncComponent(
    () =>
      import(
        '~/components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue'
      )
  ),
};

export function resolveRawQueryComponent(
  type: DatabaseClientType | undefined
): Component {
  if (!type) return UnsupportedRawQuery;
  return RAW_QUERY_COMPONENTS[type] ?? UnsupportedRawQuery;
}
```

The `BETTER_SQLITE3` and `SQLITE3` entries must be the _same_ `defineAsyncComponent` instance for the identity assertion to hold — hoist it into a `const sqliteEntry = defineAsyncComponent(...)` and reference it twice. Do the same for the two MySQL entries.

- [ ] **Step 5: Switch the page**

In `pages/[workspaceId]/[connectionId]/explorer/[fileId].vue`, replace the `RawQuery` import and its usage:

```vue
<script setup lang="ts">
import { resolveRawQueryComponent } from '~/components/modules/driver/shared/raw-query';
import { useRawQueryFileContent } from '~/components/modules/raw-query/hooks';

const { connection } = useRawQueryFileContent();
const rawQueryComponent = computed(() =>
  resolveRawQueryComponent(connection.value?.type as DatabaseClientType)
);
</script>

<template>
  <component :is="rawQueryComponent" />
</template>
```

Read the existing file first and keep any surrounding layout, `definePageMeta` or wrapper markup intact.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 8: Manual behavior check**

Run `bun run dev`. Open a file on PostgreSQL, Redis and SQLite in turn. Each must render its editor, run queries, and show results. On PostgreSQL run EXPLAIN and confirm the plan tree, the timeline chart and the insights all render — this is the lazy-chunk risk from the spec. Switch connections inside one file and confirm the editor re-resolves.

- [ ] **Step 9: Report files for staging**

---

## Phase 5 — Cleanup and the SQLite unblock

### Task 15: Delete the old entry point

**Files:**

- Delete: `components/modules/raw-query/RawQuery.vue`
- Delete: `components/modules/raw-query/hooks/useRawQueryEditor.ts`
- Modify: `components/modules/raw-query/hooks/index.ts`
- Modify: `components/modules/raw-query/index.ts`
- Test: `test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: a guard test that fails if engine knowledge creeps back into the core.

- [ ] **Step 1: Write the failing test**

Create `test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE_ROOT = join(process.cwd(), 'components/modules/raw-query');

/** Every .ts and .vue file under the core, relative to CORE_ROOT. */
const coreSourceFiles = (): string[] =>
  readdirSync(CORE_ROOT, { recursive: true, encoding: 'utf8' }).filter(
    entry => entry.endsWith('.ts') || entry.endsWith('.vue')
  );

const readCoreFile = (relativePath: string): string =>
  readFileSync(join(CORE_ROOT, relativePath), 'utf8');

describe('raw-query core', () => {
  it('never imports DatabaseClientType as a value', () => {
    const offenders = coreSourceFiles().filter(file =>
      /^import\s+\{[^}]*\bDatabaseClientType\b/m.test(readCoreFile(file))
    );

    expect(offenders).toEqual([]);
  });

  it('never names a specific engine in a conditional', () => {
    const offenders = coreSourceFiles().filter(file =>
      /DatabaseClientType\.(POSTGRES|MYSQL|MYSQL2|MARIADB|SQLITE3|BETTER_SQLITE3|ORACLE|MSSQL|REDIS|MONGODB|SNOWFLAKE)/.test(
        readCoreFile(file)
      )
    );

    expect(offenders).toEqual([]);
  });
});
```

`fast-glob` is only a transitive dependency here, so this uses `readdirSync` with
`{ recursive: true }` (Node 20+) and adds no new package.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts`
Expected: FAIL — `RawQuery.vue` still imports and branches on `DatabaseClientType`.

- [ ] **Step 3: Delete the old entry point**

Delete `components/modules/raw-query/RawQuery.vue` and `components/modules/raw-query/hooks/useRawQueryEditor.ts`. Remove `useRawQueryEditor` from `hooks/index.ts`. Point `components/modules/raw-query/index.ts` at the shell, the hooks, the contracts and the services.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts`
Expected: PASS. The type-only import in `useQueryExecution.ts` does not match the value-import pattern, which is the intent.

- [ ] **Step 5: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green. Fix any lingering import of the deleted files.

- [ ] **Step 6: Report files for staging**

---

### Task 16: Unblock SQLite variables

**Files:**

- Modify: `components/modules/driver/sqlite/raw-query/capabilities/sqlite.capabilities.ts`
- Modify: `components/modules/raw-query/shell/RawQueryShell.vue` — the Variables empty-state copy
- Test: `test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: SQLite capabilities with `supportsVariables: true`.

- [ ] **Step 1: Flip the failing assertion**

In `test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`, replace the SQLite case:

```ts
it('enables variables for SQLite', () => {
  expect(
    resolveRawQueryCapabilities(DatabaseClientType.SQLITE3)?.supportsVariables
  ).toBe(true);
  expect(
    resolveRawQueryCapabilities(DatabaseClientType.BETTER_SQLITE3)
      ?.supportsVariables
  ).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`
Expected: FAIL — still `false`.

- [ ] **Step 3: Flip the capability and fix the copy**

In `sqlite.capabilities.ts` set `supportsVariables: true` and delete the comment about matching today's behavior.

In `RawQueryShell.vue`, change the empty-state description from "Variables are not available for Redis and SQLite connections." to "Variables are not available for Redis connections."

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`
Expected: PASS.

- [ ] **Step 5: Verify the whole suite**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

- [ ] **Step 6: Manual behavior check — this is the risky one**

Run `bun run dev` against a SQLite connection. In the Variables pane set `{"minId": 2}`. Run `SELECT * FROM <table> WHERE id >= :minId`. Confirm the rows come back filtered. Then run a statement using a parameter that is _not_ in the pane and confirm the missing-variables dialog appears, accepts a value, and inserts it back when asked. If the binding fails, capture the server error verbatim before changing anything — the server adapter already binds named parameters (`server/infrastructure/database/adapters/query/sqlite/sqlite-query.adapter.ts:88-106`), so a failure here is new information, not an expected outcome.

- [ ] **Step 7: Report files for staging**

---

### Task 17: Documentation and the knowledge graph

**Files:**

- Modify: `components/modules/raw-query/docs/01-architecture.md`
- Modify: `components/modules/raw-query/docs/02-query-execution.md`
- Modify: `components/modules/raw-query/docs/03-state-management.md`
- Modify: `components/modules/raw-query/docs/04-features.md`
- Create: `components/modules/driver/shared/raw-query/docs/ADDING_AN_ENGINE.md`

**Interfaces:**

- Consumes: the finished structure.
- Produces: docs that match the code.

- [ ] **Step 1: Rewrite the architecture doc**

`01-architecture.md` currently describes a "Facade Hook" pattern with `RawQuery.vue` as the orchestrator and `useRawQueryEditor` as the facade — both deleted. Rewrite the directory-structure block and the facade section to describe `RawQueryShell` + `useRawQueryCore` + the descriptor, and add a short section pointing at the driver folders.

- [ ] **Step 2: Update the execution doc**

`02-query-execution.md` describes the branching pipeline. Replace the branch description with the executor contract and name the three executors and where each lives.

- [ ] **Step 3: Check the other two docs**

Read `03-state-management.md` and `04-features.md`. Correct any path or symbol that moved. Leave everything still accurate untouched.

- [ ] **Step 4: Write the engine-onboarding doc**

Create `components/modules/driver/shared/raw-query/docs/ADDING_AN_ENGINE.md` covering: create `driver/<engine>/raw-query/` with `capabilities/`, `containers/` and `index.ts`; wrap `BaseSqlRawQuery` for a plain SQL engine or `RawQueryShell` when you need slots; register the descriptor in `resolveRawQueryDescriptor.ts` and the component in `resolveRawQueryComponent.ts`; add a capabilities test. Include the MariaDB entry as the worked example because it is the smallest.

- [ ] **Step 5: Refresh the knowledge graph**

Run: `graphify update .`
Expected: completes without error.

- [ ] **Step 6: Final verification**

Run: `bun run typecheck && bun test:unit && bun test:nuxt`
Expected: green.

If the Oracle fixture is already running, also run `bun test:e2e:raw` and check `test/playwright/oracle/workspace-flows-live.spec.ts` and `test/playwright/helpers/sql-workspace.ts`. If it is not running, say so in the report rather than starting fixtures for a single check.

- [ ] **Step 7: Report files for staging**

---

## Self-Review

**Spec coverage.** Every spec section maps to at least one task: §5.1 core/engine boundary → Tasks 2, 7, 11, 12, 15; §5.2 contracts → Tasks 1, 3, 7; §5.3 slots and contributions → Tasks 8, 9, 10; §5.4 resolver → Task 14; §6 file layout → Tasks 1, 10-14; §7 stages → the five phases; §8 testing → the test file in every task plus the disposition in Tasks 6, 7; §9 risks → the manual checks in Tasks 2, 6, 8, 9, 14, 16. D5 (unsupported engines) → Task 14. D3 (SQLite variables) → Task 16.

**Known wrinkle carried into execution.** Task 13 notes that MariaDB must not import MySQL's command result handler. The cleanest resolution is to move `MysqlCommandResultHandler` into `driver/shared/raw-query/services/` and have both `driver/mysql` and `driver/mariadb` wrap it; Task 7 should place it there rather than under `driver/mysql/` if the executing agent reaches Task 13 and finds the cross-driver import unavoidable. Either placement satisfies the dependency rule; the shared one is preferred.

**Type consistency.** `RawQueryCapabilities` uses `parserDialect` / `highlightDialect` / `keywordCompletion` in Tasks 1, 2 and 10. `RawQueryExecutor.execute` returns `RawQueryExecuteHandle` with `abort()` in Tasks 3-6, 11-12. `commandResultHandler` is a `CommandResultHandlerFactory` in Tasks 7, 11-13. `executeCurrentStatement` takes `{ currentStatements, queryPrefix?, executor?, resultView? }` in Tasks 6 and 11. `resolveRawQueryDescriptor` replaces `resolveRawQueryCapabilities` in Task 7, which keeps a thin wrapper so Task 2's callers still compile.
