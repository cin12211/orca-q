# MongoDB EJSON Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every BSON value through Mongo quick query and render BSON values in a Compass-style form.

**Architecture:** Canonical Extended JSON is the API boundary. Server helpers serialize driver documents to EJSON and deserialize requests before querying or mutating. Client utilities format EJSON for read-only views and safely normalize only ObjectId/ISODate shorthand before JSON parsing.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, MongoDB Node driver BSON EJSON, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-10-mongodb-ejson-design.md`

## Global Constraints

- Use Canonical EJSON (`relaxed: false`) at every Mongo quick-query API boundary.
- Do not evaluate raw Mongo shell input.
- Preserve the existing Mongo operator allowlist after EJSON deserialization.
- Keep existing user worktree changes intact.

---

### Task 1: BSON transport helpers

**Files:**

- Modify: `server/infrastructure/nosql/mongodb/mongodb-quick-query.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`

**Consumes:** BSON values returned by the MongoDB driver.

**Produces:** `serializeMongoDocument`, `normalizeMongoFilter`,
`normalizeMongoDocument`, and `buildMongoDocumentSelector` that preserve EJSON.

- [ ] **Step 1: Write failing unit tests**

```ts
expect(
  serializeMongoDocument({ amount: Decimal128.fromString('1.50') })
).toEqual({
  amount: { $numberDecimal: '1.50' },
});
expect(
  normalizeMongoFilter({ owner: { $oid: '65c19f4018898af31684c4a7' } })
).toMatchObject({ owner: expect.any(ObjectId) });
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`

Expected: FAIL because current recursive serialization flattens BSON classes and
filter normalization treats EJSON wrappers as ordinary objects.

- [ ] **Step 3: Implement EJSON boundaries**

```ts
const toCanonicalEjson = (value: unknown) =>
  EJSON.serialize(value, { relaxed: false });
const fromCanonicalEjson = <T>(value: T) =>
  EJSON.deserialize(value as Document, { relaxed: false });
```

Use these helpers before and after existing operator validation. Derive selectors
from the deserialized EJSON `_id` without converting arbitrary IDs to strings.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/mongodb-quick-query.spec.ts`

Expected: PASS.

### Task 2: Safe filter parsing and display formatting

**Files:**

- Modify: `components/modules/quick-query/mongodb/utils/mongoFilterUtils.ts`
- Create: `components/modules/quick-query/mongodb/utils/mongoEjsonUtils.ts`
- Modify: `components/modules/quick-query/mongodb/utils/index.ts`
- Test: `test/unit/components/modules/quick-query/mongodb/mongoFilterUtils.spec.ts`
- Create: `test/unit/components/modules/quick-query/mongodb/mongoEjsonUtils.spec.ts`

**Consumes:** Canonical EJSON transport values and raw filter text.

**Produces:** `parseMongoRawFilter`, `formatMongoEjsonValue`, and
`getMongoDocumentKey`.

- [ ] **Step 1: Write failing unit tests**

```ts
expect(
  buildMongoFilterPayload(
    [],
    '{ "businessId": ObjectId(\'65c19f4018898af31684c4a7\') }',
    MongoFilterMode.Raw
  )
).toEqual({ businessId: { $oid: '65c19f4018898af31684c4a7' } });
expect(formatMongoEjsonValue({ $numberDecimal: '1.50' })).toBe(
  "Decimal128('1.50')"
);
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `bun vitest --run test/unit/components/modules/quick-query/mongodb/mongoFilterUtils.spec.ts test/unit/components/modules/quick-query/mongodb/mongoEjsonUtils.spec.ts`

Expected: FAIL because raw filters call `JSON.parse` directly and no EJSON display
formatter exists.

- [ ] **Step 3: Implement a non-evaluating parser and formatter**

```ts
const normalized = rawText
  .replace(objectIdLiteral, (_, id) => JSON.stringify({ $oid: id }))
  .replace(isoDateLiteral, (_, date) => JSON.stringify({ $date: date }));
return JSON.parse(normalized);
```

Only replace complete value literals outside JSON strings. Format the canonical
EJSON forms for ObjectId, Date, numeric BSON types, Binary/UUID, Timestamp,
regular expressions, Code, DBRef, MinKey, and MaxKey; stringify unrecognized
objects unchanged.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `bun vitest --run test/unit/components/modules/quick-query/mongodb/mongoFilterUtils.spec.ts test/unit/components/modules/quick-query/mongodb/mongoEjsonUtils.spec.ts`

Expected: PASS.

### Task 3: Use EJSON across quick-query UI and mutations

**Files:**

- Modify: `components/modules/quick-query/mongodb/types/mongo-quick-query.types.ts`
- Modify: `components/modules/quick-query/mongodb/hooks/useMongoDocumentMutation.ts`
- Modify: `components/modules/quick-query/mongodb/components/MongoCollectionListItem.vue`
- Modify: `components/modules/quick-query/mongodb/components/MongoCollectionObjectListView.vue`
- Modify: `components/modules/quick-query/mongodb/utils/buildMongoColumnDefs.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts`
- Test: `test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`

**Consumes:** Canonical EJSON documents and `getMongoDocumentKey` from Task 2.

**Produces:** UI identity and mutation payloads that retain an EJSON `_id`, plus
Compass-style formatting in every document view.

- [ ] **Step 1: Write failing Nuxt tests**

```ts
expect(mockFetch).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({
    body: expect.objectContaining({ id: { $oid: '65c19f4018898af31684c4a7' } }),
  })
);
expect(
  renderNodeValue({
    node: { content: "Decimal128('1.50')" },
    defaultValue: 'x',
  })
).toBe("Decimal128('1.50')");
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`

Expected: FAIL because mutations require a string ID and the renderer recognizes
only ObjectId and ISODate.

- [ ] **Step 3: Implement UI adaptation**

Use `getMongoDocumentKey(document._id)` only for Vue keys and busy state. Submit
the untouched EJSON `_id` in mutation requests. Transform values only for
read-only rendering; edit content remains canonical EJSON so it passes the JSON
linter and round-trips safely.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/quick-query/mongodb/useMongoDocumentMutation.test.ts test/nuxt/components/modules/quick-query/mongodb/MongoCollectionListItem.test.ts`

Expected: PASS.

### Task 4: Endpoint integration and regression verification

**Files:**

- Modify: `server/api/mongodb/quick-query-mutation.post.ts`
- Test: `test/api/mongodb/mongodb-quick-query.test.ts`
- Test: `test/api/mongodb/mongodb-quick-query-mutation.test.ts`

**Consumes:** EJSON helper behavior from Task 1.

**Produces:** API responses and mutations that retain BSON types.

- [ ] **Step 1: Write failing endpoint assertions**

```ts
expect(res.documents[0]._id).toEqual({
  $oid: expect.stringMatching(/^[0-9a-f]{24}$/),
});
expect(updated.document?.createdBy).toEqual({
  $oid: '65c19f4018898af31684c4a7',
});
```

- [ ] **Step 2: Run Mongo API tests to verify they fail**

Run: `bash scripts/test-services/run-tests.sh --fixtures=mongodb -- bun vitest --run --project integration test/api/mongodb/mongodb-quick-query.test.ts test/api/mongodb/mongodb-quick-query-mutation.test.ts`

Expected: FAIL because the endpoint currently returns flattened/stringified BSON.

- [ ] **Step 3: Update endpoint request types and responses**

Accept EJSON `id` values, deserialize document update payloads, and return
canonical EJSON documents without type-coercing generated insert IDs.

- [ ] **Step 4: Run focused API tests and global verification**

Run: `bash scripts/test-services/run-tests.sh --fixtures=mongodb -- bun vitest --run --project integration test/api/mongodb/mongodb-quick-query.test.ts test/api/mongodb/mongodb-quick-query-mutation.test.ts`

Then run: `bun run typecheck && bun test:unit`

Expected: all commands exit 0.
