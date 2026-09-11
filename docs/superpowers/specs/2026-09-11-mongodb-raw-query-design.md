# MongoDB Raw Query Design

## Goal

Extend the existing Raw Query experience to MongoDB connections. Users can
write restricted TypeScript, query or mutate the currently selected MongoDB
database through a native-driver-compatible `db` facade, receive contextual
CodeMirror suggestions, and stream cursor results into the existing result-tab
UI.

This design preserves the current workspace query-file model. MongoDB scripts
do not require a special filename extension and files remain independent of a
specific connection. The active connection determines the editor language and
execution behavior when a file is opened.

## Chosen Approach

Run user code in a worker-hosted SES compartment. The sandbox receives only
explicit capabilities and communicates with the parent process through an RPC
bridge. The parent process owns the real MongoDB connection and executes all
database operations with the existing official `mongodb` driver.

The sandbox must not receive a native `Db` or `MongoClient` instance directly.
Those objects expose driver internals and connection state that should not be
reachable from user code. Instead, the injected `db` facade follows familiar
native driver method names while enforcing an allowlist, database isolation,
write confirmation, serialization limits, and cursor lifecycle management.

The implementation adds direct dependencies for the capabilities it uses:

- `@codemirror/lang-javascript` for JavaScript/TypeScript parsing and syntax
  highlighting in CodeMirror.
- `@jridgewell/trace-mapping` for mapping worker stack locations back to the
  original TypeScript source.
- `ses` for the hardened JavaScript compartment inside the worker.

The existing TypeScript compiler package supplies parsing, policy validation,
transpilation, and source maps on the server. It must remain server-only and
must not be included in the browser editor bundle.

## Product Contract

### Query files and connection context

- MongoDB uses the existing `CodeQuery` tab and workspace query-file storage.
- No `.mongo.ts` or other Mongo-specific filename extension is required.
- Query files do not persist a connection ID, matching current behavior.
- Opening a file under a MongoDB connection activates Mongo TypeScript mode.
- Opening the same file under SQL or Redis activates that connection family's
  existing mode and confirmation behavior.
- Creating a query from a MongoDB collection passes the current database and
  collection through tab metadata. The collection is suggestion context, not a
  permanent restriction on the script.

### Script shape

Scripts support TypeScript syntax, variables, functions, control flow,
promises, and top-level `await` through an async wrapper. A script uses an
explicit `return` to publish a result:

```ts
const users = db.collection('users')

return users.find({
  status: params.status,
})
```

If a script has no `return`, it can still complete successfully. The result tab
shows completion metadata and captured console output, but no result value.
CodeMirror should warn when a script has no reachable top-level return without
blocking execution.

Mongo execution uses the current text selection when it is non-empty;
otherwise it executes the complete query file. It does not reuse SQL's
statement-under-cursor behavior because a TypeScript return value may depend on
variables and functions declared anywhere in the script. SQL and Redis keep
their existing execution-unit behavior.

### Injected capabilities

The sandbox exposes only:

- `db`: a facade for the currently selected database.
- `params`: an immutable EJSON-decoded copy of the existing query-file
  variables object.
- BSON helpers: `ObjectId`, `Decimal128`, `Binary`, `UUID`, `BSON`, and `EJSON`.
- A bounded `console` implementation for log, info, warn, and error output.
- Standard hardened JavaScript intrinsics supplied by SES.

The sandbox does not expose `MongoClient`, database switching, Node globals,
environment variables, filesystem access, network access, module loading,
child processes, dynamic code evaluation, or host application objects.

## Editor Experience

### Language mode

Mongo Raw Query uses the JavaScript CodeMirror language with TypeScript enabled.
The Raw Query composition root selects SQL, Redis, or Mongo extensions from the
active connection family. Mongo mode hides SQL-only actions such as formatting,
Explain Analyze, SQL diagnostics, and relation tools.

When a new query file is opened from a collection and remains empty, CodeMirror
shows non-persisted ghost text:

```ts
return db.collection('users').find({}).limit(100)
```

The placeholder disappears as soon as the user enters content. It is never
written to query-file storage and never runs automatically.

### Completion sources

Mongo mode reuses OrcaQ's existing autocomplete UI and completion icons. A
Mongo-specific completion source combines a static API catalog with dynamic
database metadata.

Suggestions cover:

- Sandbox globals and BSON helpers.
- Database facade methods after `db.`.
- Collection names inside `db.collection(...)`.
- Collection CRUD, aggregation, bulk, and index methods.
- Find and aggregation cursor methods.
- Filter, aggregation, projection, and update operators based on syntax
  position.
- Fields inferred from existing schema metadata or bounded document samples.
- Full query, aggregation, insert, update, and delete snippets.

Completions include signatures, short documentation, return type, and a warning
badge on write operations. Metadata is loaded lazily and cached by connection
and database; typing must not issue a metadata request on every keystroke.

The completion source uses the CodeMirror/Lezer syntax tree to retain simple
type context. For example, an alias initialized with `db.collection('users')`
continues to receive collection methods and `users` field suggestions. V1 does
not embed a full TypeScript language server in the browser.

## Execution Architecture

### Components

1. The Raw Query UI selects Mongo mode and submits the script, connection
   parameters, file parameters, and optional approval challenge.
2. A Mongo raw-execute streaming endpoint validates the request and creates an
   execution context for the selected database.
3. A policy validator parses TypeScript, rejects forbidden constructs, detects
   potential writes, and builds a normalized operation manifest.
4. If confirmation is required, execution stops before opening a database
   operation and emits an approval-required event.
5. Approved source is transpiled with source maps and sent to a bounded worker.
6. The worker creates a SES compartment with the allowed capabilities.
7. Calls on the sandbox `db` facade are sent to the parent through the Mongo RPC
   bridge.
8. The parent executes allowlisted operations with the native MongoDB driver
   and returns EJSON-safe values or cursor handles.
9. Returned cursors are streamed to the UI as bounded NDJSON row batches.

### Policy validation

The validator rejects:

- Static imports, dynamic imports, `require`, and module references.
- `eval`, `Function`, and equivalent dynamic-code constructors.
- Node or browser host globals not explicitly supplied by the compartment.
- Computed calls such as `collection[method](...)` on database capabilities.
- Prototype mutation or attempts to reach capability constructors.
- Database switching and access to a client/session object.
- Change streams, GridFS, sessions, transactions, and unsupported admin calls.

The RPC bridge enforces the same policy at runtime. It independently
reclassifies the actual method, collection, command, and aggregation pipeline
received from the worker, then requires a matching entry in the approved
manifest. It never trusts an operation identifier supplied by sandbox code.
Static validation is a developer experience and preflight layer, not the
security boundary.

### Supported V1 operations

V1 supports common database, collection, and cursor operations for:

- Find, find-one, count, distinct, and bounded list operations.
- Aggregation, with `$out` and `$merge` gated as writes, but without `$function`
  or other server-side JavaScript.
- Insert, replace, update, delete, find-and-modify, and bulk writes.
- Index inspection, creation, and deletion.
- A documented database-command allowlist split into read and write commands.

Aggregation pipelines containing `$out` or `$merge` are classified as writes.
Arbitrary database commands, `$where`, map-reduce, change streams, GridFS,
sessions, transactions, and cross-database operations are outside V1.

## Write Confirmation

No write operation may occur on the initial unapproved run.

The policy validator identifies calls rooted in the `db` facade, including
write-capable aggregation stages and commands. When a write is present, the
endpoint emits `approval-required` with a bounded manifest containing:

- Method or command name.
- Collection name when statically known.
- Whether the target is dynamic.
- A redacted, size-limited argument summary.
- Risk level for destructive methods such as `drop`, `deleteMany`, or
  collection-wide updates.

The initial response creates an unapproved challenge in an in-memory TTL
registry and returns its ID with the manifest. The confirmation dialog submits
that challenge ID to a dedicated approval endpoint. The server then consumes the
challenge and issues a short-lived, single-use approval token for the rerun.
Both records are bound to the exact script hash, connection, database, parameter
hash, and operation manifest. Editing the script or parameters, changing
connection context, process restart, token expiry, or replaying a consumed token
requires confirmation again.

The runtime bridge rejects any write not covered by the approved manifest. This
provides a second check if static analysis and actual control flow differ.

## Results and Streaming

The endpoint uses NDJSON events compatible with the current streaming query
lifecycle, extended with Mongo-specific event types:

- `meta`: result category, fields, and serialization mode.
- `rows`: a batch of cursor documents.
- `log`: bounded console output.
- `done`: query time, row count, mutation summary, and truncation state.
- `error`: policy, transpile, driver, timeout, cancellation, or runtime error.
- `approval-required`: write manifest and approval challenge information.

Result handling follows these rules:

- A returned find or aggregation cursor streams documents into the result grid.
- An array of documents uses the grid and Raw EJSON views.
- One document renders as one grid row plus Raw EJSON.
- Scalars and arbitrary objects render in Raw/Info views.
- Mutation results render acknowledged, matched, modified, deleted, upserted,
  and inserted values in Info and Raw views.
- Console events appear in a console area owned by the matching result tab.
- A missing return renders completion metadata and console output only.

All database boundary values use Canonical Extended JSON so ObjectId, Date,
Int32, Long, Decimal128, Binary/UUID, Timestamp, regular expressions, and other
BSON types retain fidelity.

## Limits and Cancellation

Default execution limits are:

- 30-second wall timeout, configurable per run up to five minutes.
- 128 MB worker heap limit.
- 10,000 streamed documents per execution.
- 20 MB serialized limit for returned object or array values.
- 1 MB source and 2 MB serialized parameter payload before policy analysis.
- 100 manifest operations with 2,000 characters per redacted summary.
- Bounded console entry count and total console payload.

Reaching a document or payload limit closes the cursor and emits a successful
but truncated result with an explicit badge. Timeout or user cancellation aborts
the native MongoDB operation, closes live cursor handles, tears down the worker,
and releases the connection through the existing Mongo client lifecycle.

## UI Behavior

- MongoDB capability configuration allows `CodeQuery` and query files.
- Collection context menus expose New Raw Query using existing query-file
  creation and tab-management paths.
- The Raw Query header shows the active MongoDB database and retains Run,
  Cancel, layout, and connection controls.
- SQL-only controls disappear in Mongo mode.
- The existing variables panel remains available and supplies immutable
  `params` to the sandbox.
- The write dialog shows the normalized operation manifest and requires an
  explicit confirmation action.
- Connection changes reload Mongo collection/field metadata and invalidate any
  pending approval challenge.
- Result tabs retain Result, Raw, Info, and Error views, adding console output
  and Mongo mutation summaries without creating a separate workbench UI.

## Error Handling

Errors retain their phase so the UI can explain whether failure occurred during
policy validation, TypeScript transpilation, sandbox execution, MongoDB driver
execution, serialization, timeout, or cancellation.

Transpile and runtime stack locations are mapped through generated source maps
to the original TypeScript source. When a reliable range exists, Raw Query adds
a CodeMirror diagnostic at that range. Driver errors without a source range are
shown in the result tab with the responsible operation and collection when
known. Secrets and full connection strings must never appear in errors, logs,
approval manifests, or telemetry.

## Testing

### Unit coverage

- TypeScript policy parsing and forbidden syntax.
- Capability allowlists and read/write classification.
- Aggregation and command write detection.
- Approval expiry, replay, script/parameter mismatch, and database mismatch.
- SES capability isolation and known constructor/prototype escape attempts.
- Infinite-loop interruption and worker memory limits.
- EJSON RPC serialization and BSON round trips.
- Cursor batching, truncation, cancellation, and cleanup.
- Mongo completion context, alias tracking, snippets, and metadata caching.
- Result normalization for cursors, documents, arrays, scalars, and mutations.

### Nuxt component coverage

- Connection-family editor switching.
- Collection placeholder behavior.
- SQL-only control visibility.
- Write confirmation and approved rerun behavior.
- Cursor, mutation, console, truncated, and error result rendering.

### MongoDB integration coverage

Integration tests use only the repository's `mongodb` fixture profile and
cover reads, aggregation streaming, writes with confirmation, BSON fidelity,
cancellation, timeout, selected-database isolation, and connection cleanup.
Tests must prove that the first unapproved write request does not mutate data.

### End-to-end coverage

Add a MongoDB Playwright project that provisions only the MongoDB fixture. The
main flow creates a query file from a collection, observes contextual
suggestions, streams a query, confirms an update, verifies the changed document,
and reopens the file under a MongoDB connection.

Repository verification for implementation is:

```text
bun run typecheck
bun test:unit
bun test:nuxt
MongoDB integration tests with the mongodb fixture profile
MongoDB Playwright project
graphify update .
```

## Rollout and Compatibility

The capability registry enables Raw Query only for MongoDB connections that use
the supported direct provider. SQL and Redis execution paths keep their current
contracts. Existing query files require no migration because language selection
is connection-driven and no Mongo-specific extension or persisted connection is
introduced.

The first release should be marked beta in the Mongo Raw Query surface. Runtime
metrics may record phase, duration, result category, truncation, cancellation,
and normalized error class, but never source code, parameters, database values,
credentials, or console output.
