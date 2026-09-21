# MongoDB Raw Query Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MongoDB Raw Query format scripts, preserve BSON values, offer context-aware metadata completions, and show responsive, theme-aware results and console output.

**Architecture:** Keep Canonical Extended JSON at the HTTP and NDJSON boundaries, then use the existing Mongo display helpers to render values without losing BSON type information. Extend the existing raw-query metadata cache to lazily load databases and per-database collections, and make `MongoCollectionListView` reusable in read-only mode so Raw Query gets its existing virtualizer rather than a parallel renderer.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, CodeMirror 6, MongoDB BSON/EJSON, `@tanstack/vue-virtual`, Prettier 3, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-13-mongodb-raw-query-refinement-design.md`

## Global Constraints

- Preserve SQL and Redis result, format, and completion behavior exactly as it is.
- Keep MongoDB browser/server boundaries in Canonical EJSON (`relaxed: false`); do not use `JSON.parse` as BSON value conversion.
- Do not prefetch all collection metadata or request metadata on every keystroke.
- Raw Query Mongo result documents are view-only; expand, copy, and fullscreen remain available.
- Result lists must use `@tanstack/vue-virtual` with dynamic measurement and overscan.
- Keep all source changes ASCII and verify Hugeicons names before adding a new Hugeicons icon.
- Verify source changes with `bun run typecheck` and `bun test:unit`; run the narrowest relevant Nuxt/API suites first.

---

## File Structure

- `core/types/mongodb-raw-query.types.ts`: models Canonical EJSON payloads and expanded metadata response shape.
- `components/modules/raw-query/mongo/utils/mongoEjson.ts`: converts the variables editor's EJSON text and formats EJSON values for the Console without JSON conversion.
- `components/modules/raw-query/mongo/hooks/useMongoScriptExecution.ts`: sends variables as Canonical EJSON and stores streamed EJSON results/logs unchanged per tab.
- `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.ts`: serializes every emitted Mongo value/log argument into Canonical EJSON before NDJSON writes.
- `components/modules/raw-query/mongo/hooks/useMongoScriptMetadata.ts`: caches database names per connection and collections by connection/database.
- `components/modules/raw-query/mongo/utils/createMongoScriptCompletionSource.ts`: derives database aliases and completion context from the current editor document.
- `components/modules/quick-query/mongodb/components/MongoCollectionListView.vue`: provides explicit read-only and label props while retaining its virtualized list implementation.
- `components/modules/raw-query/mongo/components/MongoRawQueryResultView.vue`: thin Raw Query adapter over the shared virtualized list.
- `components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue`: renders EJSON-aware console entries using semantic theme tokens.
- `components/modules/raw-query/components/RawQueryResultTabs.vue`: selects the Mongo virtual list and Console modes, while hiding Chart only for MongoDB.

### Task 1: Canonical EJSON Across Variables, Logs, and Results

**Files:**

- Create: `components/modules/raw-query/mongo/utils/mongoEjson.ts`
- Modify: `components/modules/raw-query/mongo/hooks/useMongoScriptExecution.ts`
- Modify: `components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue`
- Modify: `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.ts`
- Modify: `core/types/mongodb-raw-query.types.ts`
- Test: `test/unit/components/modules/raw-query/mongo/mongoEjson.spec.ts`
- Test: `test/unit/components/modules/raw-query/mongo/useMongoScriptExecution.spec.ts`
- Create: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.spec.ts`
- Test: `test/nuxt/components/modules/raw-query/MongoRawQueryConsole.test.ts`

**Interfaces:**

- Consumes: `BSON.EJSON`, `MongoRawQueryRequest`, `MongoRawQueryLogEntry`, and streamed `MongoRawQueryStreamMessage` definitions.
- Produces: `parseMongoEjsonVariables(source: string): Record<string, unknown>`, `formatMongoEjsonConsoleValue(value: unknown): string`, `serializeMongoRawQueryValue(value: unknown): unknown`, and `serializeMongoRawQueryLogArgument(value: unknown): unknown`; emitted `rows`, `result`, and `log.entry.args` are Canonical EJSON-safe values.

- [ ] **Step 1: Write failing browser EJSON tests**

```ts
it('parses Canonical EJSON variables without JSON value conversion', () => {
  expect(
    parseMongoEjsonVariables('{"id":{"$oid":"65c19f4018898af31684c4a7"}}')
  ).toMatchObject({
    id: expect.objectContaining({ toHexString: expect.any(Function) }),
  });
});

it('formats Canonical EJSON console values as Mongo literals', () => {
  expect(
    formatMongoEjsonConsoleValue({ createdAt: { $date: { $numberLong: '0' } } })
  ).toContain("ISODate('1970-01-01T00:00:00.000Z')");
});
```

- [ ] **Step 2: Run the new browser EJSON test and verify it fails**

Run: `bunx vitest --run --project unit test/unit/components/modules/raw-query/mongo/mongoEjson.spec.ts`

Expected: FAIL because `mongoEjson.ts` does not exist.

- [ ] **Step 3: Write failing service serializer tests**

```ts
it('serializes an ObjectId as Canonical EJSON before an NDJSON write', () => {
  expect(
    serializeMongoRawQueryValue(new BSON.ObjectId('65c19f4018898af31684c4a7'))
  ).toEqual({ $oid: '65c19f4018898af31684c4a7' });
});

it('uses a bounded string fallback for one unserializable console argument', () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  expect(serializeMongoRawQueryLogArgument(circular)).toBe(
    '[Unserializable Mongo value]'
  );
});
```

- [ ] **Step 4: Implement the minimal EJSON boundary helpers and service changes**

```ts
// components/modules/raw-query/mongo/utils/mongoEjson.ts
import { BSON } from 'mongodb';

export const parseMongoEjsonVariables = (source: string) => {
  const value = BSON.EJSON.parse(source || '{}', { relaxed: false });
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Mongo variables must be an Extended JSON object');
  }
  return value as Record<string, unknown>;
};

export const serializeMongoEjson = (value: unknown) =>
  BSON.EJSON.serialize(value, { relaxed: false });

// server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.ts
export const serializeMongoRawQueryValue = (value: unknown) =>
  BSON.EJSON.serialize(value, { relaxed: false });

export const serializeMongoRawQueryLogArgument = (value: unknown) => {
  try {
    return serializeMongoRawQueryValue(value);
  } catch {
    return '[Unserializable Mongo value]';
  }
};
```

In `streamMongoRawQuery`, make one safe serializer for all externally emitted values. Apply it to `consoleFacade` arguments, cursor batches, and scalar/mutation result data. If an individual console argument cannot serialize, replace only that argument with a bounded `String(value)` fallback. Deserialize `request.params` through `BSON.EJSON.deserialize(..., { relaxed: false })` before passing `params` to the sandboxed script. In `useMongoScriptExecution`, replace `JSON.parse(options.fileVariables.value || '{}')` with `parseMongoEjsonVariables` and preserve event payloads as EJSON objects. The Console calls the display helper rather than `JSON.stringify` for BSON values.

- [ ] **Step 5: Run focused EJSON unit tests and verify they pass**

Run: `bunx vitest --run --project unit test/unit/components/modules/raw-query/mongo/mongoEjson.spec.ts test/unit/components/modules/raw-query/mongo/useMongoScriptExecution.spec.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.spec.ts`

Expected: PASS, including ObjectId and Date round trips plus stream-ordered log entries.

- [ ] **Step 6: Add and run the Console component regression**

```ts
it('renders Canonical EJSON log values without a hard-coded dark surface', () => {
  const wrapper = mount(MongoRawQueryConsole, {
    props: {
      logs: [
        { level: 'log', args: [{ id: { $oid: '65c19f4018898af31684c4a7' } }] },
      ],
    },
  });
  expect(wrapper.text()).toContain("ObjectId('65c19f4018898af31684c4a7')");
  expect(
    wrapper.get('[data-testid="mongo-raw-query-console"]').classes()
  ).toContain('bg-muted');
});
```

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/raw-query/MongoRawQueryConsole.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the EJSON boundary work**

```bash
git add core/types/mongodb-raw-query.types.ts components/modules/raw-query/mongo/utils/mongoEjson.ts components/modules/raw-query/mongo/hooks/useMongoScriptExecution.ts components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.ts test/unit/components/modules/raw-query/mongo/mongoEjson.spec.ts test/unit/components/modules/raw-query/mongo/useMongoScriptExecution.spec.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.spec.ts test/nuxt/components/modules/raw-query/MongoRawQueryConsole.test.ts
git commit -m "fix(mongodb): preserve raw-query BSON values"
```

### Task 2: Cached Database and Alias-Aware Completion

**Files:**

- Modify: `core/types/mongodb-raw-query.types.ts`
- Modify: `components/modules/raw-query/mongo/hooks/useMongoScriptMetadata.ts`
- Modify: `components/modules/raw-query/mongo/hooks/useMongoScriptEditorExtensions.ts`
- Modify: `components/modules/raw-query/mongo/utils/createMongoScriptCompletionSource.ts`
- Modify: `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.ts`
- Modify: `server/api/mongodb/raw-query-metadata.post.ts`
- Test: `test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts`
- Create: `test/unit/components/modules/raw-query/mongo/useMongoScriptMetadata.spec.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.spec.ts`

**Interfaces:**

- Consumes: active connection/database/collection refs, `/api/mongodb/databases`, and `/api/mongodb/raw-query-metadata`.
- Produces: `MongoRawQueryMetadata { databases: string[]; collections: string[]; fieldsByCollection: Record<string, string[]> }`; `ensureDatabaseMetadata(databaseName: string): Promise<void>`; completion source receives a `getMetadata(databaseName?: string)` callback.

- [ ] **Step 1: Write failing completion-context tests**

```ts
it('suggests cached databases inside db.getSiblingDB()', () => {
  expect(labels("db.getSiblingDB('an")).toContain('analytics');
});

it('suggests sibling database collections for a declared alias', () => {
  expect(
    labels("const d = db.getSiblingDB('analytics')\nd.collection('ev")
  ).toContain('events');
});

it('retains collection method suggestions for a collection alias', () => {
  expect(
    labels("const accounts = d.collection('accounts')\naccounts.")
  ).toContain('find');
});
```

- [ ] **Step 2: Run the completion test and verify it fails**

Run: `bunx vitest --run --project unit test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts`

Expected: FAIL because aliases and sibling database metadata are not understood.

- [ ] **Step 3: Write failing cache tests**

```ts
it('fetches database names once per connection and collections once per database', async () => {
  fetchMock.mockResolvedValueOnce({ databases: ['app', 'analytics'] });
  fetchMock.mockResolvedValueOnce({
    databases: ['app', 'analytics'],
    collections: ['events'],
    fieldsByCollection: {},
  });
  const hook = useMongoScriptMetadata({
    connection: ref(connection),
    databaseName: ref('app'),
    collectionContext: ref(),
  });
  await hook.ensureDatabaseMetadata('analytics');
  await hook.ensureDatabaseMetadata('analytics');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('keeps cached suggestions available when an optional metadata request fails', async () => {
  const hook = useMongoScriptMetadata({
    connection: ref(connection),
    databaseName: ref('app'),
    collectionContext: ref(),
  });
  fetchMock.mockRejectedValueOnce(new Error('network unavailable'));
  await expect(
    hook.ensureDatabaseMetadata('analytics')
  ).resolves.toBeUndefined();
  expect(hook.metadataForDatabase('analytics').value.collections).toEqual([]);
});
```

- [ ] **Step 4: Implement bounded metadata caching and alias detection**

```ts
const databaseCache = new Map<string, string[]>();
const collectionCache = new Map<string, MongoRawQueryMetadata>();

const aliasMatches = [
  ...before.matchAll(
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*db\.getSiblingDB\(['"]([^'"]+)['"]\)/g
  ),
];
const databaseAliases = new Map(
  aliasMatches.map(match => [match[1], match[2]])
);
```

Fetch `/api/mongodb/databases` lazily once for a connection. Include these names in raw-query metadata and cache a collection response by `connectionId:database`. On completion, identify the active `db`, a direct `db.getSiblingDB('name')`, or an alias initialized from that expression; select collections from the matching cache. The CodeMirror source must ask `ensureDatabaseMetadata` at most once for a missing database/context and return static suggestions immediately while the request is pending. Reconfigure the autocomplete compartment when metadata changes rather than capturing an initial metadata snapshot.

- [ ] **Step 5: Implement metadata service response and server tests**

```ts
const [{ withMongoClient }, metadata] = await Promise.all([
  import('../mongodb.client'),
  getMongoCollectionMetadata(request),
]);
const databases = await withMongoClient(request, client =>
  listMongoDatabases(client)
);
return { ...metadata, databases: databases.sort() };
```

Extract the existing collection lookup into `getMongoCollectionMetadata(request)` so the handler can fetch database names with the existing `listMongoDatabases` helper through `withMongoClient` while preserving the existing `withMongoDatabase` collection path. Keep collection sampling bounded to the existing 20 documents, and sort both database and collection names. Extend the metadata unit test with a fake client that returns `['admin', 'analytics']` and assert the `analytics` collection response is `['events']`.

- [ ] **Step 6: Run focused metadata and completion tests**

Run: `bunx vitest --run --project unit test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts test/unit/components/modules/raw-query/mongo/useMongoScriptMetadata.spec.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.spec.ts`

Expected: PASS, with no repeated request for the same connection/database tuple.

- [ ] **Step 7: Commit metadata completion work**

```bash
git add core/types/mongodb-raw-query.types.ts components/modules/raw-query/mongo/hooks/useMongoScriptMetadata.ts components/modules/raw-query/mongo/hooks/useMongoScriptEditorExtensions.ts components/modules/raw-query/mongo/utils/createMongoScriptCompletionSource.ts server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.ts server/api/mongodb/raw-query-metadata.post.ts test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts test/unit/components/modules/raw-query/mongo/useMongoScriptMetadata.spec.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.spec.ts
git commit -m "feat(mongodb): add raw-query metadata completions"
```

### Task 3: Reuse the Virtualized Mongo List for Read-Only Results

**Files:**

- Modify: `components/modules/quick-query/mongodb/components/MongoCollectionListView.vue`
- Modify: `components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue`
- Modify: `components/modules/raw-query/mongo/components/MongoRawQueryResultView.vue`
- Modify: `components/modules/raw-query/components/RawQueryResultTabs.vue`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`
- Test: `test/nuxt/components/modules/raw-query/MongoRawQueryResultView.test.ts`
- Test: `test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts`

**Interfaces:**

- Consumes: `MongoDocument[]` from cursor rows and the existing `useVirtualizer` integration.
- Produces: `MongoCollectionListView` props `isReadOnly?: boolean` and `getDocumentLabel?: (document, index) => string | undefined`; a Raw Query result adapter that forwards documents into the virtualized list.

- [ ] **Step 1: Write failing read-only virtual list tests**

```ts
it('forwards read-only mode and fallback labels through virtual rows', async () => {
  const list = wrapper.findComponent(MongoCollectionListItem);
  expect(list.props('isReadOnly')).toBe(true);
  expect(list.props('documentLabel')).toBe('Document 1');
});

it('renders only virtual rows for a large raw-query result', () => {
  const wrapper = mount(MongoRawQueryResultView, {
    props: {
      documents: Array.from({ length: 1_000 }, (_, index) => ({ index })),
    },
  });
  expect(wrapper.findAllComponents(MongoCollectionListItem)).toHaveLength(3);
});
```

- [ ] **Step 2: Run the virtual-list tests and verify they fail**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryResultView.test.ts`

Expected: FAIL because the shared list does not expose read-only/label forwarding and Raw Query renders a direct `v-for`.

- [ ] **Step 3: Implement shared read-only forwarding and adapter reuse**

```vue
<MongoCollectionListItem
  :document="documents[virtualRow.index]"
  :document-label="
    getDocumentLabel?.(documents[virtualRow.index], virtualRow.index)
  "
  :is-read-only="isReadOnly"
  :is-editing="
    !isReadOnly &&
    activeEditDocId === getDocKey(documents[virtualRow.index], virtualRow.index)
  "
  @start-edit="
    () => {
      if (!isReadOnly) onStartEdit(documents[virtualRow.index]._id);
    }
  "
/>
```

Give index-only documents a stable `index:${index}` key and `Document ${index + 1}` label. Keep Quick Query defaults editable. Replace `MongoRawQueryResultView`'s document `v-for` with `MongoCollectionListView` and set `is-read-only`; do not create a second virtualizer. Keep copy output Canonical EJSON by using the Mongo display/copy helper instead of ad hoc JSON output. Keep `MongoCollectionListItem` from exposing mutation actions or save keyboard handling in read-only mode.

- [ ] **Step 4: Make Result Tabs select only Mongo-specific views**

```vue
<MongoRawQueryResultView
  v-if="isMongoResult(activeTab) && currentView === ViewMode.RESULT"
  :documents="activeTab.result as Record<string, unknown>[]"
/>
```

Retain SQL/Redis `ResultTabResultView`. For Mongo tabs, omit `ViewMode.CHART`, add `ViewMode.CONSOLE`, and leave Error/Raw/Info behavior unchanged.

- [ ] **Step 5: Run focused virtual list and results-tab tests**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryResultView.test.ts test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts`

Expected: PASS; the list has no mutation controls, preserves copy/expand/fullscreen, and large data creates only virtual row components.

- [ ] **Step 6: Commit virtualized result reuse**

```bash
git add components/modules/quick-query/mongodb/components/MongoCollectionListView.vue components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue components/modules/raw-query/mongo/components/MongoRawQueryResultView.vue components/modules/raw-query/components/RawQueryResultTabs.vue test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListView.test.ts test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryResultView.test.ts test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts
git commit -m "feat(mongodb): virtualize raw-query result documents"
```

### Task 4: Finalize Mongo Formatting, Placeholder, and Theme-Aware Console

**Files:**

- Modify: `components/modules/raw-query/mongo/constants/mongoScriptCatalog.ts`
- Modify: `components/modules/raw-query/mongo/hooks/useMongoScriptEditorExtensions.ts`
- Modify: `components/modules/raw-query/hooks/useRawQueryEditor.ts`
- Modify: `components/modules/raw-query/RawQuery.vue`
- Modify: `components/modules/raw-query/components/RawQueryEditorFooter.vue`
- Modify: `components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue`
- Modify: `components/modules/raw-query/mongo/utils/formatMongoScript.ts`
- Test: `test/unit/components/modules/raw-query/mongo/formatMongoScript.spec.ts`
- Test: `test/unit/components/modules/raw-query/mongo/mongoScriptPlaceholder.spec.ts`
- Test: `test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts`
- Test: `test/nuxt/components/modules/raw-query/MongoRawQueryConsole.test.ts`

**Interfaces:**

- Consumes: editor `Mod-s`, `prettier/standalone`, `prettier/plugins/typescript`, `prettier/plugins/estree`, current database/collection refs, and application semantic Tailwind tokens.
- Produces: `getMongoScriptPlaceholder(databaseName?: string, collectionName?: string): string`, a non-persisted explanatory placeholder, Mongo-only `Format script` action, and Console surfaces that work in both application themes.

- [ ] **Step 1: Extend failing placeholder/format/theme tests**

```ts
it('substitutes the current database and collection in the empty-editor placeholder', () => {
  expect(getMongoScriptPlaceholder('analytics', 'accounts')).toContain(
    "db.getSiblingDB('analytics')"
  );
  expect(getMongoScriptPlaceholder('analytics', 'accounts')).toContain(
    "database.collection('accounts')"
  );
});

it('does not include a hard-coded hex background in the console class list', () => {
  expect(
    wrapper.get('[data-testid="mongo-raw-query-console"]').attributes('class')
  ).not.toContain('#101416');
});
```

- [ ] **Step 2: Run the focused editor and Console tests and verify they fail**

Run: `bunx vitest --run --project unit test/unit/components/modules/raw-query/mongo/formatMongoScript.spec.ts test/unit/components/modules/raw-query/mongo/mongoScriptPlaceholder.spec.ts && bunx vitest --run --project nuxt test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryConsole.test.ts`

Expected: FAIL only for the missing context substitution/theme assertion.

- [ ] **Step 3: Implement the final editor and Console behavior**

```ts
export const getMongoScriptPlaceholder = (
  databaseName?: string,
  collectionName?: string
) =>
  MONGO_SCRIPT_PLACEHOLDER.replace(
    'DATABASE',
    databaseName || '<database_name>'
  ).replace('COLLECTION', collectionName || '<collection_name>');
```

Pass `getMongoScriptPlaceholder(options.databaseName.value, options.collectionContext.value)` into CodeMirror's `placeholder()` extension. Keep the executable example with `const database = db.getSiblingDB(...)` so the injected `db` is never shadowed. Format the whole Mongo document with the existing lazy Prettier imports, replace the full editor range, and clamp the old cursor offset to the formatted document length. On Prettier rejection, leave text untouched and show a local formatting error. Use `bg-muted`, `text-foreground`, `text-muted-foreground`, `text-destructive`, and the already-defined warning semantic class rather than fixed dark/surface colors.

- [ ] **Step 4: Run final focused format and UI tests**

Run: `bunx vitest --run --project unit test/unit/components/modules/raw-query/mongo/formatMongoScript.spec.ts test/unit/components/modules/raw-query/mongo/mongoScriptPlaceholder.spec.ts && bunx vitest --run --project nuxt test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryConsole.test.ts test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Mongo editor and Console polish**

```bash
git add components/modules/raw-query/mongo/constants/mongoScriptCatalog.ts components/modules/raw-query/mongo/hooks/useMongoScriptEditorExtensions.ts components/modules/raw-query/hooks/useRawQueryEditor.ts components/modules/raw-query/RawQuery.vue components/modules/raw-query/components/RawQueryEditorFooter.vue components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue components/modules/raw-query/mongo/utils/formatMongoScript.ts test/unit/components/modules/raw-query/mongo/formatMongoScript.spec.ts test/unit/components/modules/raw-query/mongo/mongoScriptPlaceholder.spec.ts test/nuxt/components/modules/raw-query/RawQueryEditorFooter.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryConsole.test.ts
git commit -m "feat(mongodb): polish raw-query editor workflow"
```

### Task 5: Cross-Feature Verification and Graph Refresh

**Files:**

- Modify: `graphify-out/` (generated by `graphify update .`, if the repository tracks its generated graph)

**Interfaces:**

- Consumes: all completed Mongo Raw Query changes and project test scripts.
- Produces: typecheck/test evidence and an updated codebase graph.

- [ ] **Step 1: Run all relevant focused tests together**

Run: `bunx vitest --run --project unit test/unit/components/modules/raw-query/mongo test/unit/server/infrastructure/nosql/mongodb/raw-query && bunx vitest --run --project nuxt test/nuxt/components/modules/raw-query test/nuxt/components/modules/quick-query/mongodb`

Expected: PASS with no regression in existing Mongo list editing tests.

- [ ] **Step 2: Run required repository verification**

Run: `bun run typecheck && bun test:unit`

Expected: both commands exit 0. If either fails, classify failures as introduced versus pre-existing before making any correction.

- [ ] **Step 3: Run Mongo integration regression if fixtures are available**

Run: `bun test:api:raw -- test/api/mongodb/mongodb-raw-query.test.ts`

Expected: PASS, including Canonical EJSON in cursor/result/log NDJSON payloads. If fixtures are not running, report that state and do not start broad fixtures without instruction.

- [ ] **Step 4: Refresh the code graph and inspect the final diff**

Run: `graphify update . && git diff --check && git status --short`

Expected: graph refresh completes, no whitespace errors, and only intended files are modified.

- [ ] **Step 5: Commit final verification-only generated graph changes if any**

```bash
git add graphify-out
git commit -m "chore: refresh code graph"
```

Only make this commit when `graphify-out` is tracked and contains changes caused by this feature; otherwise leave it untouched.

## Plan Self-Review

- Spec coverage: Task 1 covers Canonical EJSON result/log/variable boundaries; Task 2 covers database/collection completion and bounded caching; Task 3 covers list component reuse, read-only behavior, virtual scrolling, Console tab, and hidden Mongo Chart; Task 4 covers placeholder, Prettier format action, and theme-aware Console; Task 5 covers regressions, typecheck, unit suite, integration evidence, and graph update.
- Placeholder scan: this plan has no deferred-work markers, generic error-handling placeholders, or undefined future interfaces. Each task names its input/output API and its concrete failing test command.
- Type consistency: metadata is consistently `MongoRawQueryMetadata` with `databases`, `collections`, and `fieldsByCollection`; browser variable conversion is `parseMongoEjsonVariables`; shared list props are `isReadOnly` and `getDocumentLabel` across both producer and consumer tasks.
