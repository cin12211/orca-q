# MongoDB Raw Query Refinement Design

## Goal

Finish the MongoDB Raw Query experience so it preserves BSON values, gives
contextual database and collection suggestions, displays debug output in the
active application theme, and renders large document results without creating
one DOM node per document.

## Scope

- Show an informative MongoDB editor placeholder for empty query files.
- Format Mongo TypeScript scripts with browser-loaded Prettier.
- Hide the Chart result view for MongoDB and add a per-result Console view.
- Render MongoDB result documents through the Quick Query list components in
  read-only mode with virtual scrolling.
- Preserve Canonical Extended JSON across MongoDB result, console, and
  variables boundaries.
- Suggest database names after `db.getSiblingDB('` and collections after an
  alias created from `db.getSiblingDB(...)`.

SQL and Redis result behavior, formatting, and completion behavior remain
unchanged.

## Placeholder And Formatting

The empty MongoDB editor shows non-persisted placeholder text only. It explains
that `db` is injected for the active database and uses a separate `database`
alias, avoiding the invalid self-shadowing form `const db = db.getSiblingDB()`.

```ts
/*
 * db is initialized with the active MongoDB database.
 * Use getSiblingDB() when you want to query a different database.
 */
const database = db.getSiblingDB('<database_name>')
const collection = database.collection('<collection_name>')
return collection.find({})
```

Known database and collection context replace the angle-bracket placeholders.
The Format button reads "Format script" for MongoDB, formats the entire
TypeScript document with lazy-loaded `prettier/standalone` plus its TypeScript
and ESTree plugins, and retains the cursor within the formatted document. The
MongoDB `Cmd/Ctrl+S` key binding invokes the same operation. SQL retains its
existing statement and document formatting options.

## BSON And EJSON Boundary

MongoDB values cross every browser/server boundary as Canonical Extended JSON.
The server serializes rows, scalar values, mutation summaries, and console
arguments through `BSON.EJSON.serialize(value, { relaxed: false })` before
writing NDJSON. The browser sends Mongo variables as Canonical EJSON and
deserializes them only where a BSON value is required. Raw Mongo data must not
be parsed through `JSON.parse` as a value conversion step.

The existing Mongo EJSON display utilities remain the single renderer for
ObjectId, Date, Decimal128, Binary, Timestamp, regular expression, and other
BSON literals. Copy output uses Canonical EJSON so it is round-trippable.

## Results And Console

MongoDB result tabs expose Result, Raw, Info, Errors, and Console. Chart is not
shown for MongoDB. Every execution owns its own ordered `logs` array; NDJSON
`log` events append to that result tab and remain visible even if execution
later fails.

`MongoRawQueryConsole` renders an empty state or terminal-style output using
theme semantic tokens rather than hard-coded dark colors. Log, info, warning,
and error levels use readable theme-compatible status colors, while values are
displayed as EJSON-aware text.

The Result view reuses `MongoCollectionListView` and
`MongoCollectionListItem`. A new read-only mode hides edit, save, and delete
actions but retains expand, copy, and fullscreen actions. The list continues to
use `@tanstack/vue-virtual`, measured item heights, and overscan so large
cursor results do not create an unbounded DOM tree. Documents without `_id`
receive stable index-based keys and labels such as `Document 1`.

## Metadata And Completion

The Mongo raw-query metadata response gains a cached database-name list and a
per-database collection cache. The client fetches database names once per
connection, then fetches collection metadata only for the active database or a
database referenced by a recognized `getSiblingDB` alias.

The completion source recognizes these contexts:

- `db.getSiblingDB('...')` suggests database names.
- `db.collection('...')` suggests collections in the active database.
- `const d = db.getSiblingDB('analytics')` followed by `d.collection('...')`
  suggests collections from `analytics`.
- An alias initialized by either collection expression continues to receive
  collection-method suggestions.

Completions stay local after their metadata is cached. A missing metadata value
may initiate one bounded asynchronous request; it must never fetch on every
keystroke or block normal static API suggestions.

## Error Handling

Failed metadata requests leave static MongoDB completions available and do not
prevent execution. EJSON serialization failures use a bounded string fallback
for the single affected console argument and do not break the NDJSON stream.
Prettier failures leave the editor unchanged and report a local formatting
error without affecting query execution.

## Testing

- Unit: placeholder composition, TypeScript formatting, EJSON round trips,
  console argument serialization, metadata caching, and completion contexts
  for active database and sibling database aliases.
- Nuxt: Mongo footer formatting affordance, theme-aware console classes,
  Mongo-only result tabs, read-only virtual list result rendering, and large
  list virtualization.
- Regression: existing SQL, Redis, Quick Query Mongo list edit behavior, and
  existing Mongo raw-query stream tests remain green.

## Non-Goals

- No arbitrary database admin commands beyond the existing raw-query policy.
- No full TypeScript language server or unbounded metadata preloading.
- No editing or deletion from Raw Query MongoDB results.
