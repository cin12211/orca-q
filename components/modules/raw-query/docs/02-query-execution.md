# Query Execution Pipeline

Running a statement from the Raw Query Code Editor is managed by `hooks/useQueryExecution.ts`.
The hook owns everything up to and after the network call (statement isolation, variables, result tabs, diagnostics) and delegates the call itself to an injected **executor**.

## 1. Current Statement Isolation

Rather than blindly running the whole file string:

- `getCurrentStatement(editorView)` dynamically reads the user's text cursor position.
- CodeMirror AST boundaries are resolved into `treeNodes`.
- The hook safely resolves what exact semantic bounds constitute the intended operation without requiring manual text highlighting.
- The editor's statement detection mode comes from `utils/resolveStatementMode.ts`, called by `hooks/useSqlEditorExtensions.ts` as the `statementMode` of the editor extension: `'line'` (one command per line) for Redis, `'sql'` otherwise. `useQueryExecution` only receives the already isolated statements.

## 2. Parameter Replacement

Variables wrapped securely via `--@param=name:value` or within the `VariableEditor.vue` layout are injected safely via JSON. `fileVariables` acts as a reactive parameter definition context, passed to the executor as `params`.
The step only runs when `capabilities.supportsVariables` is true; missing variables are collected with `capabilities.parameterStyle` and prompted through `promptMissingVariables`.

## 3. The Executor Contract

There is no branching on execution type inside the hook. Every engine supplies a `RawQueryExecutor` (`contracts/rawQueryExecutor.ts`):

```ts
interface RawQueryExecutor {
  readonly streaming?: boolean;
  execute(
    request: RawQueryExecuteRequest, // { connection, query, params }
    handlers: RawQueryExecuteHandlers // onMeta, onRows, onComplete, onError
  ): RawQueryExecuteHandle; // { abort() }
}
```

`query` is the final statement text: the hook has already applied the prefix. Handlers may fire synchronously or many times (`onRows` per batch); `onMeta` fires once before any rows.

| Executor                                    | Lives in                                                        | Used by                                                             | Behavior                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sqlStreamingExecutor`                      | `raw-query/services/sqlStreamingExecutor.ts`                    | every SQL engine (through `BaseSqlRawQuery` and `PostgresRawQuery`) | `streaming: true`. NDJSON stream via `executeStreamingQuery` (`hooks/useStreamingQuery.ts`) with an abortable request, so large result sets render progressively.      |
| `postgresExplainExecutor`                   | `driver/postgres/raw-query/services/postgresExplainExecutor.ts` | PostgreSQL EXPLAIN ANALYZE only                                     | Not streaming. One `$fetch('/api/query/raw-execute')`; EXPLAIN returns a single plan row. `abort()` is a no-op.                                                        |
| `createRedisCommandExecutor(databaseIndex)` | `driver/redis/raw-query/services/redisCommandExecutor.ts`       | Redis                                                               | Not streaming. One `$fetch('/api/redis/workbench/execute')` including the reactive `databaseIndex`; result normalized by `normalizeRedisResult`. `abort()` is a no-op. |

The `streaming` flag sets `queryProcessState.isStreaming` (streaming indicator and cancel button in the footer). When it is not `true`, the run shows the plain execute-loading state instead.

## 4. Per-Execution Overrides

`executeCurrentStatement` accepts, besides `currentStatements`:

```ts
{ currentStatements, queryPrefix?, executor?, resultView? }
```

- `queryPrefix`: text prepended to the statement (`` `${queryPrefix} ${statement}` ``). PostgreSQL EXPLAIN passes `EXPLAIN (ANALYZE, FORMAT JSON, ...)`.
- `executor`: replaces the shell's executor for this one run (PostgreSQL EXPLAIN passes `postgresExplainExecutor`).
- `resultView`: the `ViewMode` the new tab opens in (default `ViewMode.RESULT`; EXPLAIN uses `ViewMode.EXPLAIN`).

Engine entries reach this through the shell's exposed `executeCurrentStatement` (see `usePostgresExplain`). Starting a new run aborts any in-flight run first.

## 5. `DatabaseError` Diagnostics Interface

We map errors tightly. If the executor reports a fault from the backend adapter, `onError({ message, detail })` records it on the result tab (`view` switches to `ViewMode.ERROR`) and, for SQL engines, injects the diagnostic payload directly onto the interactive IDE interface:

```ts
import { applySqlErrorDiagnostics } from '~/components/base/code-editor/utils';
```

- A red `Diagnostic` syntax underline matches the exact character boundary dynamically shifted by `mapErrorPosition()`.
- Standard hover tooltips allow the user to immediately identify precisely why execution halted (e.g., `severity` = `ERROR`, `length`, `routine = check_stack_depth`, etc.).
- **Redis skips SQL diagnostics**: they are applied only when `capabilities.language !== 'redis'`, because there is no SQL text to underline. The error still shows in the tab.
- The prefix offset is passed as `queryPrefix ?? ''`. The util concatenates it verbatim, so `undefined` would otherwise leak into the offset as the text "undefined".
