# MongoDB Raw Query Port — Design

Date: 2026-09-22
Status: Approved for planning
Scope: porting MongoDB raw-query support from `feat/support-mongodb-3` into
`refactor/driver-modules` (the shell + per-engine driver architecture)

## 1. Context

`refactor/driver-modules` just split `components/modules/raw-query` into an
engine-agnostic core (`RawQueryShell`, `useRawQueryCore`, `RawQueryExecutor`
contracts) plus one owned folder per engine under
`components/modules/driver/<engine>/raw-query/`. MongoDB currently resolves to
`UnsupportedRawQuery` — there is no raw-query surface for it at all.

A separate branch, `feat/support-mongodb-3`, built a full MongoDB raw-query
feature (script editor, execution, approval flow for destructive operations,
console output) on top of a _different_ core architecture: a
`RawQueryPlugin`/registry system (`RawQueryContext`, `defineRawQueryPlugin`,
per-engine header/footer/result profiles). That architecture predates the
shell/driver split and does not exist on `refactor/driver-modules`.

This spec covers moving MongoDB raw-query support from that branch onto the
current architecture. It is not a copy — the integration layer has to be
rewritten against the current contracts; only the MongoDB-specific logic and
the server-side infrastructure move largely unchanged.

## 2. Goals

1. Working MongoDB raw-query: script editor (JS-like Mongo shell syntax),
   execution with streaming results, an approval step for destructive
   operations, and a console view of execution logs.
2. Server-side support (capability host, script runtime, approval registry,
   metadata, the three API routes) ported with no behavior change.
3. The core (`components/modules/raw-query/`) gains no new engine-specific
   branching. The two additions it needs (a `ViewMode.CONSOLE` value and a
   `'mongo'` member on `RawQueryLanguage`) are inert data, not conditionals.
4. `components/modules/driver/mongodb/quick-query/` (already on this branch)
   is untouched. This port is raw-query only.

## 3. Non-goals

- Adopting any part of the `RawQueryPlugin`/registry abstraction from
  `feat/support-mongodb-3`. It is not used; MongoDB composes the same way
  Postgres and Redis do.
- Changing `useRawQueryCore`, `RawQueryShell`, or `useQueryExecution` to add
  injectable seams (editor-extensions adapter, statement-resolution adapter,
  variable-extraction adapter) for MongoDB's sake. MongoDB does not go
  through them at all (see §5.1).
- MongoDB quick-query, schema browsing, or any non-raw-query MongoDB feature.
- Changing the shared `RawQueryExecutor` contract. MongoDB does not implement
  it.

## 4. Decisions

| #   | Decision                                                                                                                                                                                                             | Rationale                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | MongoDB composes its own container, bypassing `RawQueryShell`/`useRawQueryCore`/`useQueryExecution`                                                                                                                  | Its shape (script execution, EJSON variables, an approval step, no SQL statement splitting) differs enough from the SQL/Redis shape that forcing it through the shared pipeline means adding seams only MongoDB would use |
| D2  | MongoDB reuses the shared _primitives_ — `RawQueryLayout`, `RawQueryEditorHeader`/`Footer` (via `header-extra`/`footer-extra`), `RawQueryResultTabs` (via the `result-view` slot), `RawQueryConnectionConfirmDialog` | These are already generic (no SQL/Redis assumptions baked in after the driver split); reusing them avoids duplicating layout, hotkeys, and dialog plumbing                                                                |
| D3  | Server infrastructure and MongoDB-specific client logic (script catalog, EJSON handling, completion source, execution/approval hooks) are ported near-verbatim                                                       | Already correct and self-contained; only their integration point changes                                                                                                                                                  |
| D4  | `ViewMode` gains a `CONSOLE` member; `RawQueryLanguage` gains a `'mongo'` member                                                                                                                                     | Minimal, inert additions — no core conditional reads either one                                                                                                                                                           |
| D5  | MongoDB's per-tab command-result summary reuses `genericCommandResult`                                                                                                                                               | Matches what the pre-split registry did for `DatabaseClientType.MONGODB`                                                                                                                                                  |

## 5. Architecture

### 5.1 Why MongoDB bypasses the shared core pipeline

The shared core is SQL/Redis-shaped end to end:

| Core mechanism                                | Assumes                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `useSqlEditorExtensions`                      | SQL dialect highlighting or Redis line-mode; language is `'sql' \| 'redis'`           |
| `useQueryExecution.executeCurrentStatement`   | A `SyntaxTreeNodeData[]` from CodeMirror's SQL statement tree (`getCurrentStatement`) |
| `extractVariables` / `MissingVariablesDialog` | Colon-style `:param` extraction, one symbol at a time                                 |
| `applySqlErrorDiagnostics`                    | SQL text positions                                                                    |

MongoDB's raw-query script:

- Uses `javascript({ typescript: true })` with its own completion source
  (`createMongoScriptCompletionSource`), not a SQL dialect.
- Has no "current statement" — a script executes as one unit.
- Takes variables as a single Extended JSON (EJSON) object, parsed whole
  (`parseMongoEjsonVariables`), not extracted symbol by symbol.
- Has an approval step: some operations require the user to confirm before
  execution, handled by `useMongoApproval` and a dedicated dialog.

Bending the shared core to fit this would mean adding three new injection
seams (editor-extensions, statement-resolution, variable-extraction) to
`useRawQueryCore`/`RawQueryShell`/`useQueryExecution` for a single consumer.
That is closer to the core knowing MongoDB's shape than to genuine
engine-agnosticism. Instead, `MongoRawQuery.vue` composes its own pipeline
from MongoDB-specific hooks and reuses only the primitives that are already
engine-agnostic.

### 5.2 What MongoDB reuses vs. replaces

| Reused as-is                                                                                       | Replaced with MongoDB's own                                                                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `RawQueryLayout`, `RawQueryEditorHeader`/`Footer` (`header-extra`/`footer-extra` slots)            | `useSqlEditorExtensions` → `useMongoScriptEditorExtensions`                                                   |
| `RawQueryResultTabs` (`result-view` slot, same mechanism Postgres uses for `EXPLAIN`)              | `useQueryExecution` → `useMongoScriptExecution`                                                               |
| `RawQueryConnectionConfirmDialog` + a copy of `requestConnectionExecutionConfirm`                  | —                                                                                                             |
| `VariableEditor.vue` (plain textarea; content is interpreted as EJSON instead of colon-param JSON) | `extractVariables` / `MissingVariablesDialog` — not used; the whole blob is parsed once, no per-symbol prompt |
| Hotkeys (mod+j), `IntroRawQuery` empty state                                                       | `useMongoApproval` + a MongoDB-specific approval dialog (no SQL/Redis equivalent)                             |

`useMongoScriptExecution` already accepts a `beforeExecute` callback with the
exact shape the connection-confirm dialog uses today, so wiring it is a
direct port, not new design.

### 5.3 Result views

MongoDB needs `RESULT`, `RAW`, `INFO`, `ERROR` (all already in
`RawQueryResultTabs`'s default fallback chain) plus `CONSOLE` (execution log
view, MongoDB-only). `ViewMode` gains `CONSOLE = 'console'`; MongoDB's
`#result-view` slot supplies the console renderer for that view and lets
every other view fall through to the shared default, exactly like Postgres's
`EXPLAIN` slot content today.

### 5.4 Registration

- `driver/shared/raw-query/resolveRawQueryDescriptor.ts`: add a `MONGODB`
  entry `{ capabilities: MONGODB_RAW_QUERY_CAPABILITIES, commandResultHandler: genericCommandResult }`.
  `MONGODB_RAW_QUERY_CAPABILITIES` exists only to satisfy this map's type —
  MongoDB's own pipeline never reads it. Its `language` field uses the new
  `'mongo'` member, documented in a comment as descriptor-only.
- `driver/shared/raw-query/resolver/resolveRawQueryComponent.ts`: change the
  `MONGODB` entry from `UnsupportedRawQuery` to `MongoRawQuery` (built with
  the same `defineEngineEntry` factory — loading/error states, `suspensible:
false`). `SNOWFLAKE` and any other unmapped type stay on
  `UnsupportedRawQuery`.

## 6. File layout

```
components/modules/driver/mongodb/raw-query/
├── containers/
│   └── MongoRawQuery.vue
├── components/            # console view, header badge, format/execute actions,
│                          # approval dialog, variable-usage guide popover
├── hooks/
│   ├── useMongoScriptExecution.ts
│   ├── useMongoApproval.ts
│   ├── useMongoScriptEditorExtensions.ts
│   └── useMongoScriptMetadata.ts
├── api/                   # executeMongoRawQuery, approveMongoRawQuery (client -> server)
├── utils/                 # mongoEjson, resolveMongoScriptSource, formatMongoScript,
│                          # createMongoScriptCompletionSource
├── constants/             # mongoScriptCatalog
├── capabilities/
│   └── mongo.capabilities.ts   # descriptor-only, see §5.4
└── index.ts                    # does not export containers/, per the existing convention
```

Server (paths unchanged from `feat/support-mongodb-3`):

```
server/infrastructure/nosql/mongodb/raw-query/
├── index.ts
├── mongo-approval-registry.ts
├── mongo-capability-host.ts
├── mongo-operation-catalog.ts
├── mongo-raw-query-metadata.ts
├── mongo-raw-query.service.ts
├── mongo-script-policy.ts
└── mongo-script-runtime.ts

server/api/mongodb/
├── raw-query-approve.post.ts
├── raw-query-metadata.post.ts
└── raw-query-stream.post.ts

core/types/mongodb-raw-query.types.ts
```

Core changes (minimal, both inert data additions):

- `components/modules/raw-query/interfaces/index.ts`: `ViewMode.CONSOLE`.
- `components/modules/raw-query/contracts/rawQueryCapabilities.ts`:
  `RawQueryLanguage` gains `'mongo'`.

No other core file changes.

## 7. Migration stages

1. **Server + core types.** Copy `server/infrastructure/nosql/mongodb/raw-query/`,
   the three `server/api/mongodb/raw-query-*.post.ts` routes, and
   `core/types/mongodb-raw-query.types.ts` verbatim. Verify their imports
   resolve against this branch's server code (adapter factories, shared
   helpers) — repoint any that moved; do not change behavior.
2. **MongoDB-specific client logic.** Copy `mongo/{api,hooks,utils,components,constants}`
   from `feat/support-mongodb-3` into
   `driver/mongodb/raw-query/{api,hooks,utils,components,constants}`, fixing
   import paths for the new location. Strip stray debug `console.log`/`console.warn`
   calls left in `useMongoScriptExecution.ts` during that branch's development —
   a mechanical cleanup, not a behavior change. No integration yet.
3. **Core additions.** Add `ViewMode.CONSOLE` and `RawQueryLanguage`'s
   `'mongo'` member. Add `mongo.capabilities.ts`.
4. **Container + registration.** Build `MongoRawQuery.vue` per §5.2, wire
   `useMongoScriptExecution`/`useMongoApproval`/`useMongoScriptEditorExtensions`,
   register in `resolveRawQueryDescriptor.ts` and
   `resolver/resolveRawQueryComponent.ts`.
5. **Tests + docs.** Cover the container mount, the execution/approval hooks,
   the resolver's new MongoDB entry, and update
   `components/modules/driver/shared/raw-query/docs/ADDING_AN_ENGINE.md` if
   MongoDB's shape (bypassing the shared pipeline) is worth noting there as a
   second pattern alongside the SQL-family one.

## 8. Testing

Follow the same discipline as the raw-query driver split: `bun run typecheck`
and `bun test:unit` fully green at every stage; `bun test:nuxt` is
non-deterministic at this branch's HEAD, so new/changed nuxt tests run
individually rather than via the full suite.

New coverage needed:

- `resolveRawQueryComponent` resolves `MONGODB` to `MongoRawQuery`, not
  `UnsupportedRawQuery`.
- `resolveRawQueryDescriptor` returns the `MONGODB` entry with
  `genericCommandResult`.
- `MongoRawQuery.vue` mount: header/footer extras render, the connection
  confirm dialog wires through `beforeExecute`, the `CONSOLE` result view
  renders via the slot and other views fall through to the shared default.
- Server routes and the ported infrastructure keep whatever tests existed on
  `feat/support-mongodb-3` for them, repointed to this branch's test layout.

## 9. Risks

| Risk                                                                                                                                                                                       | Mitigation                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-side shared helpers (adapter factories, connection helpers) diverged between the two branches since `feat/support-mongodb-3` was cut                                                | Stage 1 explicitly checks every import in the copied server files against this branch before treating the copy as done                                        |
| `MongoRawQuery.vue` drifts from the shell's behavior for things it re-implements (keepalive cursor/scroll restore, hotkey registration, the connection-confirm dialog's promise lifecycle) | Copy those specific blocks from `RawQueryShell.vue` rather than re-deriving them; the implementation plan should diff against the shell for each reused block |
| `useMongoScriptExecution`'s debug logging and any other leftover development cruft ships to production                                                                                     | Stage 2 explicitly greps for `console.log`/`console.warn` in the ported files and removes them                                                                |
