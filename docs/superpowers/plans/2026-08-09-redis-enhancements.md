# Redis Browser Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix sidebar key focus/scroll sync, add key/group delete (context menu + keyboard), make key-detail switching fast (cache + parallel backend fetch + page keepalive), and stop `listRedisKeys` from silently dropping keys past 500.

**Architecture:** Backend changes live in `server/infrastructure/nosql/redis/redis-browser.service.ts` (parallel fetch, uncapped scan, `UNLINK`-based delete) plus two new `.delete.ts` server routes. Frontend changes are layered: a shared `FileTree.vue` gets one new keyboard emit; `RedisKeyTree.vue` gets a local-click suppression flag + `onActivated` refocus + a context-menu wrapper; `useRedisWorkspaceBrowser.ts` gets a connection+db+key-scoped in-memory cache and delete/preview methods; a new `RedisDeleteKeyDialog.vue` is shared by the sidebar tree and the key-detail panel; the Redis tab route gains `keepalive` to match its sibling tab routes.

**Tech Stack:** Vue 3 `<script setup>` + Composition API, Pinia, Nuxt 3 server routes (h3), `redis` (node-redis v5) client, Zod validation, Vitest (`unit` and `nuxt` projects), `@vue/test-utils`.

## Global Constraints

- Any source change must pass `bun run typecheck` and the relevant Vitest project(s) before being considered done, per project verification rules.
- No `any` types; explicit types for new function params/returns.
- Reuse existing UI primitives (`AlertDialog`, `BaseContextMenu`, shadcn components) — do not create new one-off dialog/menu primitives.
- Prefer `hugeicons:*` icons; verified against `node_modules/@iconify-json/hugeicons/icons.json` (`delete-02` confirmed present).
- Every folder-level `index.ts` barrel convention from `module-architecture.md` applies only to the `modules/<domain>/{components,hooks,...}` layout described there — this codebase's actual `redis-browser`/`redis-workspace` modules do not currently use per-folder `index.ts` barrels (components/hooks are imported by direct file path throughout), so new files follow the **existing** direct-import convention already used by every file touched in this plan. Do not introduce barrels as part of this work.

---

### Task 1: Parallelize independent Redis calls in `buildRedisKeyDetail`

**Files:**

- Modify: `server/infrastructure/nosql/redis/redis-browser.service.ts:282-349` (`buildRedisKeyDetail`)
- Test: `test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `buildRedisKeyDetail` keeps its exact existing signature and return shape (`RedisKeyDetail`) — pure internal perf change, no caller updates needed.

- [ ] **Step 1: Write the failing test asserting call order/concurrency**

Add to `test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts` (new `describe` block, reusing the existing `clientMock`/`createRedisRuntimeClientMock` setup already in the file):

```ts
describe('getRedisKeyDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.select.mockResolvedValue('OK');
    clientMock.type.mockResolvedValue('string');
    clientMock.ttl.mockResolvedValue(120);
    clientMock.get.mockResolvedValue('paid');
    clientMock.strLen.mockResolvedValue(4);
    clientMock.sendCommand.mockResolvedValue(null);
  });

  it('resolves ttl, value, memory usage and encoding concurrently instead of sequentially', async () => {
    const callOrder: string[] = [];
    let ttlResolve!: () => void;
    let getResolve!: () => void;

    clientMock.ttl.mockImplementation(
      () =>
        new Promise(resolve => {
          callOrder.push('ttl:start');
          ttlResolve = () => {
            callOrder.push('ttl:end');
            resolve(120);
          };
        })
    );
    clientMock.get.mockImplementation(
      () =>
        new Promise(resolve => {
          callOrder.push('get:start');
          getResolve = () => {
            callOrder.push('get:end');
            resolve('paid');
          };
        })
    );

    const detailPromise = getRedisKeyDetail(
      { method: EConnectionMethod.STRING, url: 'redis://127.0.0.1:6379/0' },
      'orders:1'
    );

    // Both ttl and value reads must already be in flight before either resolves —
    // proves they were started concurrently, not one after the other.
    await vi.waitFor(() => {
      expect(callOrder).toContain('ttl:start');
      expect(callOrder).toContain('get:start');
    });

    ttlResolve();
    getResolve();

    await detailPromise;

    expect(callOrder.indexOf('get:start')).toBeLessThan(
      callOrder.indexOf('ttl:end')
    );
  });
});
```

Add the missing import at the top of the file: `import { getRedisKeyDetail, listRedisKeys, updateRedisKeyValue } from '~/server/infrastructure/nosql/redis/redis-browser.service';` (extend the existing import line instead of duplicating it).

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest --run --project unit test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts -t "resolves ttl, value, memory usage and encoding concurrently"`
Expected: FAIL — with the current sequential `await` chain, `get:start` only happens after `ttl:end`, so the `toBeLessThan` assertion fails.

- [ ] **Step 3: Parallelize the independent calls**

Replace in `server/infrastructure/nosql/redis/redis-browser.service.ts`:

```ts
const buildRedisKeyDetail = async (
  client: RedisClient,
  key: string,
  databaseIndex: number
): Promise<RedisKeyDetail> => {
  const type = await client.type(key);
  const ttl = await client.ttl(key);
  const value = await readRedisValue(client, key, type);
  const memoryUsage = await getRedisMemoryUsage(client, key);
  const length = await getRedisLength(client, key, type, value);
  const encoding = await getRedisEncoding(client, key);
  const jsonValue =
    type === 'string' ? tryParseJsonString(value as string | null) : null;
  const tablePreview = buildTablePreview(type, value);
```

with:

```ts
const buildRedisKeyDetail = async (
  client: RedisClient,
  key: string,
  databaseIndex: number
): Promise<RedisKeyDetail> => {
  const type = await client.type(key);
  const [ttl, value, memoryUsage, encoding] = await Promise.all([
    client.ttl(key),
    readRedisValue(client, key, type),
    getRedisMemoryUsage(client, key),
    getRedisEncoding(client, key),
  ]);
  const length = await getRedisLength(client, key, type, value);
  const jsonValue =
    type === 'string' ? tryParseJsonString(value as string | null) : null;
  const tablePreview = buildTablePreview(type, value);
```

Nothing else in the function changes — `ttl`, `value`, `memoryUsage`, `length`, `encoding` are used identically below.

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest --run --project unit test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`
Expected: PASS (all tests in the file, including the pre-existing ones — this is a pure refactor).

- [ ] **Step 5: Commit**

```bash
git add server/infrastructure/nosql/redis/redis-browser.service.ts test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts
git commit -m "perf(redis): parallelize independent Redis calls when building key detail"
```

---

### Task 2: Stop `listRedisKeys` from silently truncating results past 500

**Files:**

- Modify: `server/infrastructure/nosql/redis/redis-browser.service.ts:382-443` (`listRedisKeys`)
- Modify: `core/types/redis-workspace.types.ts:55-60` (`RedisBrowserResponse`)
- Test: `test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `listRedisKeys(input, options)` return type becomes `{ cursor: string; keys: RedisKeyListItem[]; truncated: boolean }` — the two existing call sites (`server/api/redis/browser/index.post.ts` line 18 and any test mocking it) only read `.keys`/`.cursor` today and spread the whole object, so `truncated` flows through for free without code changes there.

- [ ] **Step 1: Update the existing scan tests for the new default limit and `truncated` field**

In `test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`, the two existing assertions on `listRedisKeys`'s return value need `truncated: false` added since the function's return shape is changing. Update:

```ts
    expect(result).toEqual({
      cursor: '0',
      keys: [
        {
          key: 'orders:1',
          type: 'string',
          ttl: 120,
          memoryUsage: 1024,
          memoryUsageHuman: '1.0 KB',
        },
        {
          key: 'orders:2',
          type: 'hash',
          ttl: -1,
          memoryUsage: 256,
          memoryUsageHuman: '256 B',
        },
      ],
    });
    expect(closeMock).toHaveBeenCalled();
  });
```

to:

```ts
    expect(result).toEqual({
      cursor: '0',
      truncated: false,
      keys: [
        {
          key: 'orders:1',
          type: 'string',
          ttl: 120,
          memoryUsage: 1024,
          memoryUsageHuman: '1.0 KB',
        },
        {
          key: 'orders:2',
          type: 'hash',
          ttl: -1,
          memoryUsage: 256,
          memoryUsageHuman: '256 B',
        },
      ],
    });
    expect(closeMock).toHaveBeenCalled();
  });
```

And the second existing test's expectation:

```ts
    expect(clientMock.scan).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      cursor: '0',
      keys: [
```

to:

```ts
    expect(clientMock.scan).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      cursor: '0',
      truncated: false,
      keys: [
```

- [ ] **Step 2: Write the new failing tests for uncapped scanning and the safety ceiling**

Add to the same `describe('updateRedisKeyValue', ...)` block's neighboring scope (as a new top-level `describe` in the file, after the existing `updateRedisKeyValue` block):

```ts
describe('listRedisKeys scanning limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.select.mockResolvedValue('OK');
    clientMock.type.mockResolvedValue('string');
    clientMock.ttl.mockResolvedValue(-1);
    clientMock.sendCommand.mockResolvedValue(null);
  });

  it('keeps scanning past the old 500-key default until the cursor is exhausted', async () => {
    const firstBatch = Array.from({ length: 300 }, (_, i) => `key:${i}`);
    const secondBatch = Array.from({ length: 300 }, (_, i) => `key:${i + 300}`);

    clientMock.scan
      .mockResolvedValueOnce({ cursor: 11, keys: firstBatch })
      .mockResolvedValueOnce({ cursor: 0, keys: secondBatch });

    const result = await listRedisKeys({
      method: EConnectionMethod.STRING,
      url: 'redis://127.0.0.1:6379/0',
    });

    expect(result.keys).toHaveLength(600);
    expect(result.truncated).toBe(false);
    expect(clientMock.scan).toHaveBeenCalledTimes(2);
  });

  it('stops at an explicit count and reports truncated when more keys remain', async () => {
    clientMock.scan
      .mockResolvedValueOnce({ cursor: 5, keys: ['a', 'b'] })
      .mockResolvedValueOnce({ cursor: 9, keys: ['c'] });

    const result = await listRedisKeys(
      { method: EConnectionMethod.STRING, url: 'redis://127.0.0.1:6379/0' },
      { count: 3 }
    );

    expect(result.keys.map(item => item.key)).toEqual(['a', 'b', 'c']);
    expect(result.truncated).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `bunx vitest --run --project unit test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts -t "listRedisKeys scanning limits"`
Expected: FAIL — current code caps `requestedKeyCount` at `Math.max(options?.count ?? 500, 100)` and never returns a `truncated` field, so both new assertions fail (600 keys would actually pass today by coincidence since 600 > 500 gets capped at 500, so the length assertion fails at 500 ≠ 600).

- [ ] **Step 4: Remove the hard cap, scan to exhaustion, add the `truncated` flag**

Replace in `server/infrastructure/nosql/redis/redis-browser.service.ts`:

```ts
export async function listRedisKeys(
  input: RedisBrowserInput,
  options?: {
    cursor?: string;
    keyPattern?: string;
    count?: number;
  }
) {
  return withSelectedDatabase(input, async client => {
    const scanPattern = options?.keyPattern || '*';
    const requestedKeyCount = Math.max(options?.count ?? 500, 100);
    const scanBatchCount = Math.min(requestedKeyCount, 200);
    const collectedKeys: string[] = [];
    const seenKeys = new Set<string>();
    let cursor = options?.cursor || '0';

    do {
      const scanResult = await client.scan(cursor, {
        MATCH: scanPattern,
        COUNT: scanBatchCount,
      });

      cursor = `${scanResult.cursor}`;

      for (const key of scanResult.keys) {
        if (seenKeys.has(key)) {
          continue;
        }

        seenKeys.add(key);
        collectedKeys.push(key);

        if (collectedKeys.length >= requestedKeyCount) {
          break;
        }
      }
    } while (cursor !== '0' && collectedKeys.length < requestedKeyCount);

    const keys = await Promise.all(
      collectedKeys.map(async key => {
        const [type, ttl, memoryUsage] = await Promise.all([
          client.type(key),
          client.ttl(key),
          getRedisMemoryUsage(client, key),
        ]);

        return {
          key,
          type,
          ttl,
          memoryUsage,
          memoryUsageHuman: formatBytes(memoryUsage),
        };
      })
    );

    return {
      cursor,
      keys: keys as RedisKeyListItem[],
    };
  });
}
```

with:

```ts
// Safety ceiling only — not a normal-case limit. Fetching "all matching keys"
// is the correct MVP behavior (see design doc item 4); this just stops an
// unbounded request against a pathologically huge keyspace from hanging.
const DEFAULT_KEY_SCAN_LIMIT = 20_000;

export async function listRedisKeys(
  input: RedisBrowserInput,
  options?: {
    cursor?: string;
    keyPattern?: string;
    count?: number;
  }
) {
  return withSelectedDatabase(input, async client => {
    const scanPattern = options?.keyPattern || '*';
    const keyLimit = options?.count ?? DEFAULT_KEY_SCAN_LIMIT;
    const scanBatchCount = Math.min(keyLimit, 200);
    const collectedKeys: string[] = [];
    const seenKeys = new Set<string>();
    let cursor = options?.cursor || '0';
    let truncated = false;

    do {
      const scanResult = await client.scan(cursor, {
        MATCH: scanPattern,
        COUNT: scanBatchCount,
      });

      cursor = `${scanResult.cursor}`;

      for (const key of scanResult.keys) {
        if (seenKeys.has(key)) {
          continue;
        }

        seenKeys.add(key);
        collectedKeys.push(key);

        if (collectedKeys.length >= keyLimit) {
          truncated = cursor !== '0';
          break;
        }
      }
    } while (cursor !== '0' && collectedKeys.length < keyLimit);

    if (truncated) {
      console.warn(
        `[redis-browser] Key scan hit the ${keyLimit}-key limit for pattern "${scanPattern}"; results are incomplete.`
      );
    }

    const keys = await Promise.all(
      collectedKeys.map(async key => {
        const [type, ttl, memoryUsage] = await Promise.all([
          client.type(key),
          client.ttl(key),
          getRedisMemoryUsage(client, key),
        ]);

        return {
          key,
          type,
          ttl,
          memoryUsage,
          memoryUsageHuman: formatBytes(memoryUsage),
        };
      })
    );

    return {
      cursor,
      truncated,
      keys: keys as RedisKeyListItem[],
    };
  });
}
```

- [ ] **Step 5: Add `truncated` to the `RedisBrowserResponse` type**

In `core/types/redis-workspace.types.ts`, update:

```ts
export interface RedisBrowserResponse {
  cursor: string;
  keys: RedisKeyListItem[];
  databases: RedisDatabaseOption[];
  selectedKeyDetail: RedisKeyDetail | null;
}
```

to:

```ts
export interface RedisBrowserResponse {
  cursor: string;
  truncated: boolean;
  keys: RedisKeyListItem[];
  databases: RedisDatabaseOption[];
  selectedKeyDetail: RedisKeyDetail | null;
}
```

- [ ] **Step 6: Run all tests in the file to verify everything passes**

Run: `bunx vitest --run --project unit test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`
Expected: PASS (all tests, old and new).

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: no new errors (the `index.post.ts` route spreads the `listRedisKeys` result directly into a `RedisBrowserResponse`-shaped object, so the new `truncated` field is required there too, but since it comes from the spread it satisfies the type automatically).

- [ ] **Step 8: Commit**

```bash
git add server/infrastructure/nosql/redis/redis-browser.service.ts core/types/redis-workspace.types.ts test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts
git commit -m "fix(redis): scan keys to exhaustion instead of silently capping at 500"
```

---

### Task 3: Add `deleteRedisKeys` service function using `UNLINK`

**Files:**

- Modify: `server/infrastructure/nosql/redis/redis-browser.service.ts` (add new exported function near `updateRedisKeyValue`)
- Test: `test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`

**Interfaces:**

- Consumes: `withSelectedDatabase` (existing internal helper in the same file).
- Produces: `deleteRedisKeys(input: RedisBrowserInput, keys: string[]): Promise<{ deletedCount: number }>` — used by both new server routes in Task 4 (single-key delete calls it with a one-element array).

- [ ] **Step 1: Write the failing test**

Add to `test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`. First extend the hoisted `clientMock` object (near the top of the file) to include `unlink: vi.fn()`:

```ts
const clientMock = {
  scan: vi.fn(),
  select: vi.fn(),
  type: vi.fn(),
  ttl: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  strLen: vi.fn(),
  sendCommand: vi.fn(),
  expire: vi.fn(),
  persist: vi.fn(),
  del: vi.fn(),
  unlink: vi.fn(),
  hSet: vi.fn(),
  rPush: vi.fn(),
  sAdd: vi.fn(),
  zAdd: vi.fn(),
};
```

Then add the import (extend the existing import from `redis-browser.service`) and a new `describe` block:

```ts
describe('deleteRedisKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.select.mockResolvedValue('OK');
    clientMock.unlink.mockResolvedValue(1);
  });

  it('unlinks a single key and returns the deleted count', async () => {
    const result = await deleteRedisKeys(
      { method: EConnectionMethod.STRING, url: 'redis://127.0.0.1:6379/0' },
      ['orders:1']
    );

    expect(clientMock.unlink).toHaveBeenCalledWith(['orders:1']);
    expect(result).toEqual({ deletedCount: 1 });
    expect(closeMock).toHaveBeenCalled();
  });

  it('chunks large key lists into batches of 500 for UNLINK', async () => {
    const keys = Array.from({ length: 1200 }, (_, i) => `bulk:${i}`);
    clientMock.unlink.mockImplementation(
      async (chunk: string[]) => chunk.length
    );

    const result = await deleteRedisKeys(
      { method: EConnectionMethod.STRING, url: 'redis://127.0.0.1:6379/0' },
      keys
    );

    expect(clientMock.unlink).toHaveBeenCalledTimes(3);
    expect(clientMock.unlink).toHaveBeenNthCalledWith(1, keys.slice(0, 500));
    expect(clientMock.unlink).toHaveBeenNthCalledWith(2, keys.slice(500, 1000));
    expect(clientMock.unlink).toHaveBeenNthCalledWith(3, keys.slice(1000));
    expect(result).toEqual({ deletedCount: 1200 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest --run --project unit test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts -t "deleteRedisKeys"`
Expected: FAIL with `deleteRedisKeys is not a function` / import error, since it doesn't exist yet.

- [ ] **Step 3: Implement `deleteRedisKeys`**

Add to `server/infrastructure/nosql/redis/redis-browser.service.ts`, after `updateRedisKeyValue`:

```ts
const DELETE_CHUNK_SIZE = 500;

export async function deleteRedisKeys(
  input: RedisBrowserInput,
  keys: string[]
): Promise<{ deletedCount: number }> {
  return withSelectedDatabase(input, async client => {
    let deletedCount = 0;

    for (let index = 0; index < keys.length; index += DELETE_CHUNK_SIZE) {
      const chunk = keys.slice(index, index + DELETE_CHUNK_SIZE);
      deletedCount += await client.unlink(chunk);
    }

    return { deletedCount };
  });
}
```

`UNLINK` is used instead of `DEL` because it reclaims memory asynchronously in a background thread, so deleting a very large hash/list/set doesn't block the Redis event loop the way a synchronous `DEL` would.

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest --run --project unit test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add server/infrastructure/nosql/redis/redis-browser.service.ts test/unit/server/infrastructure/nosql/redis-browser.service.spec.ts
git commit -m "feat(redis): add chunked UNLINK-based deleteRedisKeys service function"
```

---

### Task 4: Add single-key and bulk delete server routes

**Files:**

- Create: `server/api/redis/browser/value.delete.ts`
- Create: `server/api/redis/browser/keys.delete.ts`
- Modify: `server/infrastructure/nosql/redis/parse-connection-body.ts` (export nothing new — schemas are composed in the route files themselves, matching how `value.patch.ts` does it)
- Test: `test/unit/server/api/redis/browser.spec.ts`

**Interfaces:**

- Consumes: `deleteRedisKeys` from Task 3, `connectionBodySchema`/`parseConnectionBody` from `parse-connection-body.ts`.
- Produces: `POST`-free routes `DELETE /api/redis/browser/value` (body: `{ ...RedisConnectionRequestBody, key: string }`) and `DELETE /api/redis/browser/keys` (body: `{ ...RedisConnectionRequestBody, keys: string[] }`), both returning `{ deletedCount: number }`. These are the exact endpoints Task 6's client methods call.

- [ ] **Step 1: Write the failing route tests**

Add to `test/unit/server/api/redis/browser.spec.ts`. Extend the hoisted mocks and the service mock:

```ts
const {
  readBodyMock,
  readValidatedBodyMock,
  listRedisKeysMock,
  listRedisDatabasesMock,
  getRedisKeyDetailMock,
  updateRedisKeyValueMock,
  deleteRedisKeysMock,
} = vi.hoisted(() => ({
  readBodyMock: vi.fn(),
  readValidatedBodyMock: vi.fn(),
  listRedisKeysMock: vi.fn(),
  listRedisDatabasesMock: vi.fn(),
  getRedisKeyDetailMock: vi.fn(),
  updateRedisKeyValueMock: vi.fn(),
  deleteRedisKeysMock: vi.fn(),
}));
```

```ts
vi.mock('~/server/infrastructure/nosql/redis/redis-browser.service', () => ({
  listRedisKeys: listRedisKeysMock,
  listRedisDatabases: listRedisDatabasesMock,
  getRedisKeyDetail: getRedisKeyDetailMock,
  updateRedisKeyValue: updateRedisKeyValueMock,
  deleteRedisKeys: deleteRedisKeysMock,
}));
```

Add the new handler imports at the top:

```ts
import keysDeleteHandler from '~/server/api/redis/browser/keys.delete';
import valueDeleteHandler from '~/server/api/redis/browser/value.delete';
```

Add new tests inside the existing `describe('Redis browser routes', ...)` block:

```ts
it('deletes a single key via UNLINK', async () => {
  readValidatedBodyMock.mockResolvedValue({
    method: EConnectionMethod.STRING,
    stringConnection: 'redis://127.0.0.1:6379/0',
    key: 'orders:1',
  });
  deleteRedisKeysMock.mockResolvedValue({ deletedCount: 1 });

  const result = await valueDeleteHandler({} as never);

  expect(result).toEqual({ deletedCount: 1 });
  expect(deleteRedisKeysMock).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'redis://127.0.0.1:6379/0' }),
    ['orders:1']
  );
});

it('rejects single delete when key is missing', async () => {
  readValidatedBodyMock.mockRejectedValue(
    new Error('Validation error: key is required')
  );

  await expect(valueDeleteHandler({} as never)).rejects.toThrow(
    'Validation error: key is required'
  );
  expect(deleteRedisKeysMock).not.toHaveBeenCalled();
});

it('deletes a bulk key list via UNLINK', async () => {
  readValidatedBodyMock.mockResolvedValue({
    method: EConnectionMethod.STRING,
    stringConnection: 'redis://127.0.0.1:6379/0',
    keys: ['orders:1', 'orders:2'],
  });
  deleteRedisKeysMock.mockResolvedValue({ deletedCount: 2 });

  const result = await keysDeleteHandler({} as never);

  expect(result).toEqual({ deletedCount: 2 });
  expect(deleteRedisKeysMock).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'redis://127.0.0.1:6379/0' }),
    ['orders:1', 'orders:2']
  );
});

it('rejects bulk delete when keys array is empty', async () => {
  readValidatedBodyMock.mockRejectedValue(
    new Error('Validation error: keys must contain at least 1 item')
  );

  await expect(keysDeleteHandler({} as never)).rejects.toThrow(
    'Validation error: keys must contain at least 1 item'
  );
  expect(deleteRedisKeysMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest --run --project unit test/unit/server/api/redis/browser.spec.ts`
Expected: FAIL — `value.delete` / `keys.delete` modules don't exist yet, so the imports throw.

- [ ] **Step 3: Create the two route handlers**

Create `server/api/redis/browser/value.delete.ts`:

```ts
import { readValidatedBody } from 'h3';
import { z } from 'zod';
import {
  connectionBodySchema,
  parseConnectionBody,
} from '~/server/infrastructure/nosql/redis/parse-connection-body';
import { deleteRedisKeys } from '~/server/infrastructure/nosql/redis/redis-browser.service';

const valueDeleteBodySchema = connectionBodySchema.extend({
  key: z.string().min(1),
});

export default defineEventHandler(async event => {
  const body = await readValidatedBody(event, valueDeleteBodySchema.parse);

  return deleteRedisKeys(parseConnectionBody(body), [body.key]);
});
```

Create `server/api/redis/browser/keys.delete.ts`:

```ts
import { readValidatedBody } from 'h3';
import { z } from 'zod';
import {
  connectionBodySchema,
  parseConnectionBody,
} from '~/server/infrastructure/nosql/redis/parse-connection-body';
import { deleteRedisKeys } from '~/server/infrastructure/nosql/redis/redis-browser.service';

const keysDeleteBodySchema = connectionBodySchema.extend({
  keys: z.array(z.string().min(1)).min(1),
});

export default defineEventHandler(async event => {
  const body = await readValidatedBody(event, keysDeleteBodySchema.parse);

  return deleteRedisKeys(parseConnectionBody(body), body.keys);
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest --run --project unit test/unit/server/api/redis/browser.spec.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add server/api/redis/browser/value.delete.ts server/api/redis/browser/keys.delete.ts test/unit/server/api/redis/browser.spec.ts
git commit -m "feat(redis): add single and bulk key delete server routes"
```

---

### Task 5: Add a `deletedCount` response type and cache-scoped key detail Map in `useRedisWorkspaceBrowser.ts`

**Files:**

- Modify: `core/types/redis-workspace.types.ts` (add `RedisDeleteResponse`)
- Modify: `components/modules/redis-workspace/hooks/useRedisWorkspaceBrowser.ts`
- Test: `test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts`

**Interfaces:**

- Consumes: nothing new from other tasks.
- Produces: `refreshSelectedKeyDetail(key?: string, options?: { force?: boolean })` (new optional second param, default behavior unchanged for existing single-arg callers); the hook's returned object gains no new fields yet (delete/preview methods come in Task 6) — this task only adds the cache itself and wires it into the existing fetch/save paths.

- [ ] **Step 1: Add `RedisDeleteResponse` to the shared types**

In `core/types/redis-workspace.types.ts`, add after `RedisValueUpdateRequestBody`:

```ts
export interface RedisDeleteResponse {
  deletedCount: number;
}
```

- [ ] **Step 2: Write the failing cache test**

Add to `test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts`, as a new `it` inside the existing `describe('useRedisWorkspace', ...)` block:

```ts
it('serves a previously fetched key detail from cache without another network call', async () => {
  const workspace = useRedisWorkspace({
    connection: ref(makeConnection()),
  });

  await flushReactive();
  workspace.session.value!.selectedKey = 'orders:1';
  await flushReactive();

  expect(workspace.selectedKeyDetail.value?.key).toBe('orders:1');

  workspace.session.value!.selectedKey = 'orders:2';
  await flushReactive();
  expect(workspace.selectedKeyDetail.value?.key).toBe('orders:2');

  mockFetch.mockClear();
  workspace.session.value!.selectedKey = 'orders:1';
  await flushReactive();

  expect(workspace.selectedKeyDetail.value?.key).toBe('orders:1');
  expect(mockFetch).not.toHaveBeenCalledWith(
    '/api/redis/browser/value',
    expect.anything()
  );
});

it('bypasses the cache and refetches when focusKey is called for a manual refresh', async () => {
  const workspace = useRedisWorkspace({
    connection: ref(makeConnection()),
  });

  await flushReactive();
  workspace.session.value!.selectedKey = 'orders:1';
  await flushReactive();

  mockFetch.mockClear();
  await workspace.focusKey('orders:1');

  expect(mockFetch).toHaveBeenCalledWith(
    '/api/redis/browser/value',
    expect.objectContaining({
      body: expect.objectContaining({ key: 'orders:1' }),
    })
  );
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts -t "cache"`
Expected: FAIL — today every `selectedKey` change refetches unconditionally, so the first new test's `not.toHaveBeenCalledWith` assertion fails; `focusKey` already refetches so the second test passes coincidentally today but must keep passing after the change (it verifies the `force` bypass still works).

- [ ] **Step 4: Add the cache to `useRedisWorkspaceBrowser.ts`**

In `components/modules/redis-workspace/hooks/useRedisWorkspaceBrowser.ts`, add near the top of `useRedisWorkspaceBrowser` (after the existing `ref`/`shallowRef` declarations):

```ts
const detailCache = new Map<string, RedisKeyDetail>();

const getDetailCacheKey = (databaseIndex: number, key: string) =>
  `${connection.value?.id}:${databaseIndex}:${key}`;
```

Replace the existing `refreshSelectedKeyDetail`:

```ts
const refreshSelectedKeyDetail = async (key = session.value?.selectedKey) => {
  if (!connection.value || !session.value || !key) {
    selectedKeyDetail.value = null;
    editUnavailableReason.value = '';
    loadingSelectedKeyDetail.value = false;
    return;
  }

  const requestId = ++selectedKeyDetailRequestId;
  selectedKeyDetail.value = null;
  loadingSelectedKeyDetail.value = true;

  try {
    const detail = await $fetch<RedisKeyDetail>('/api/redis/browser/value', {
      method: 'POST',
      body: {
        ...buildConnectionBody(connection.value),
        databaseIndex: session.value.selectedDatabaseIndex,
        key,
      },
    });

    if (requestId !== selectedKeyDetailRequestId) {
      return;
    }

    selectedKeyDetail.value = detail;
    editUnavailableReason.value = '';
  } finally {
    if (requestId === selectedKeyDetailRequestId) {
      loadingSelectedKeyDetail.value = false;
    }
  }
};
```

with:

```ts
const refreshSelectedKeyDetail = async (
  key = session.value?.selectedKey,
  options?: { force?: boolean }
) => {
  if (!connection.value || !session.value || !key) {
    selectedKeyDetail.value = null;
    editUnavailableReason.value = '';
    loadingSelectedKeyDetail.value = false;
    return;
  }

  const cacheKey = getDetailCacheKey(session.value.selectedDatabaseIndex, key);
  const cached = detailCache.get(cacheKey);

  if (!options?.force && cached) {
    selectedKeyDetail.value = cached;
    editUnavailableReason.value = '';
    loadingSelectedKeyDetail.value = false;
    return;
  }

  const requestId = ++selectedKeyDetailRequestId;
  selectedKeyDetail.value = null;
  loadingSelectedKeyDetail.value = true;

  try {
    const detail = await $fetch<RedisKeyDetail>('/api/redis/browser/value', {
      method: 'POST',
      body: {
        ...buildConnectionBody(connection.value),
        databaseIndex: session.value.selectedDatabaseIndex,
        key,
      },
    });

    if (requestId !== selectedKeyDetailRequestId) {
      return;
    }

    detailCache.set(cacheKey, detail);
    selectedKeyDetail.value = detail;
    editUnavailableReason.value = '';
  } finally {
    if (requestId === selectedKeyDetailRequestId) {
      loadingSelectedKeyDetail.value = false;
    }
  }
};
```

Update `focusKey` to force-bypass the cache (it's the function behind the manual "Refresh" button and auto-refresh in `RedisValueEditor.vue`):

```ts
const focusKey = async (key: string) => {
  if (!session.value) {
    return;
  }

  await openKey(key);
  await refreshSelectedKeyDetail(key);
};
```

to:

```ts
const focusKey = async (key: string) => {
  if (!session.value) {
    return;
  }

  await openKey(key);
  await refreshSelectedKeyDetail(key, { force: true });
};
```

Update `saveSelectedValue` to write the fresh detail into the cache after a successful save. Replace:

```ts
selectedKeyDetail.value = await $fetch<RedisKeyDetail>(
  '/api/redis/browser/value',
  {
    method: 'PATCH',
    body: {
      ...buildConnectionBody(connection.value),
      databaseIndex: session.value.selectedDatabaseIndex,
      key: session.value.selectedKey,
      previewKind: payload.previewKind,
      stringFormat: payload.stringFormat,
      tableKind: payload.tableKind,
      ttlSeconds: payload.ttlSeconds,
      value: payload.value,
    },
  }
);
editUnavailableReason.value = '';
```

with:

```ts
const updatedDetail = await $fetch<RedisKeyDetail>('/api/redis/browser/value', {
  method: 'PATCH',
  body: {
    ...buildConnectionBody(connection.value),
    databaseIndex: session.value.selectedDatabaseIndex,
    key: session.value.selectedKey,
    previewKind: payload.previewKind,
    stringFormat: payload.stringFormat,
    tableKind: payload.tableKind,
    ttlSeconds: payload.ttlSeconds,
    value: payload.value,
  },
});

detailCache.set(
  getDetailCacheKey(
    session.value.selectedDatabaseIndex,
    session.value.selectedKey
  ),
  updatedDetail
);
selectedKeyDetail.value = updatedDetail;
editUnavailableReason.value = '';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts`
Expected: PASS (all tests, old and new).

- [ ] **Step 6: Commit**

```bash
git add core/types/redis-workspace.types.ts components/modules/redis-workspace/hooks/useRedisWorkspaceBrowser.ts test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts
git commit -m "perf(redis): cache key detail per connection/database so switching keys doesn't refetch"
```

---

### Task 6: Add `deleteKey`, `deleteKeys`, `previewGroupKeys` to the workspace hook

**Files:**

- Modify: `components/modules/redis-workspace/hooks/useRedisWorkspaceBrowser.ts`
- Modify: `components/modules/redis-workspace/hooks/useRedisWorkspace.ts:194-211` (return object)
- Test: `test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts`

**Interfaces:**

- Consumes: `deleteRedisKeys` server routes from Task 4, `detailCache`/`getDetailCacheKey` from Task 5.
- Produces: `useRedisWorkspace(...)` return object gains `deleteKey(key: string): Promise<void>`, `deleteKeys(keys: string[]): Promise<void>`, `previewGroupKeys(prefix: string): Promise<string[]>`, `isDeletingKey: Ref<boolean>` — these are exactly what Task 12 (`ManagementRedisBrowser.vue`) and Task 13 (`RedisWorkspace.vue`) call.

- [ ] **Step 1: Write the failing tests**

Add to `test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts`:

```ts
it('deletes a single key, clears it from the list, and clears the selection if it was selected', async () => {
  mockFetch.mockImplementation(async (url, options) => {
    if (url === '/api/redis/browser') {
      return {
        cursor: '0',
        truncated: false,
        keys: [
          { key: 'orders:1', type: 'string', ttl: -1 },
          { key: 'orders:2', type: 'string', ttl: -1 },
        ],
        databases: [
          { index: 0, label: 'DB 0', keyCount: 2, expires: 0, avgTtl: null },
        ],
        selectedKeyDetail: null,
      };
    }

    if (url === '/api/redis/browser/value' && options?.method === 'DELETE') {
      return { deletedCount: 1 };
    }

    return {};
  });

  const workspace = useRedisWorkspace({
    connection: ref(makeConnection()),
  });

  await flushReactive();
  await workspace.refreshKeys();
  workspace.session.value!.selectedKey = 'orders:1';
  await flushReactive();

  await workspace.deleteKey('orders:1');

  expect(mockFetch).toHaveBeenCalledWith(
    '/api/redis/browser/value',
    expect.objectContaining({
      method: 'DELETE',
      body: expect.objectContaining({ key: 'orders:1' }),
    })
  );
  expect(workspace.keys.value.map(item => item.key)).toEqual(['orders:2']);
  expect(workspace.session.value!.selectedKey).toBeNull();
});

it('deletes multiple keys in bulk without touching the selection when it is unaffected', async () => {
  mockFetch.mockImplementation(async (url, options) => {
    if (url === '/api/redis/browser') {
      return {
        cursor: '0',
        truncated: false,
        keys: [
          { key: 'orders:1', type: 'string', ttl: -1 },
          { key: 'orders:2', type: 'string', ttl: -1 },
          { key: 'inventory:1', type: 'string', ttl: -1 },
        ],
        databases: [],
        selectedKeyDetail: null,
      };
    }

    if (url === '/api/redis/browser/keys' && options?.method === 'DELETE') {
      return { deletedCount: 2 };
    }

    return {};
  });

  const workspace = useRedisWorkspace({
    connection: ref(makeConnection()),
  });

  await flushReactive();
  await workspace.refreshKeys();
  workspace.session.value!.selectedKey = 'inventory:1';
  await flushReactive();

  await workspace.deleteKeys(['orders:1', 'orders:2']);

  expect(mockFetch).toHaveBeenCalledWith(
    '/api/redis/browser/keys',
    expect.objectContaining({
      method: 'DELETE',
      body: expect.objectContaining({ keys: ['orders:1', 'orders:2'] }),
    })
  );
  expect(workspace.keys.value.map(item => item.key)).toEqual(['inventory:1']);
  expect(workspace.session.value!.selectedKey).toBe('inventory:1');
});

it('previews the full set of keys matching a group prefix', async () => {
  mockFetch.mockImplementation(async (url, options) => {
    if (url === '/api/redis/browser') {
      const body = (options as { body?: { keyPattern?: string } })?.body;

      if (body?.keyPattern === 'orders:*') {
        return {
          cursor: '0',
          truncated: false,
          keys: [
            { key: 'orders:1', type: 'string', ttl: -1 },
            { key: 'orders:2', type: 'string', ttl: -1 },
          ],
          databases: [],
          selectedKeyDetail: null,
        };
      }

      return {
        cursor: '0',
        truncated: false,
        keys: [],
        databases: [],
        selectedKeyDetail: null,
      };
    }

    return {};
  });

  const workspace = useRedisWorkspace({
    connection: ref(makeConnection()),
  });

  await flushReactive();

  const preview = await workspace.previewGroupKeys('orders');

  expect(preview).toEqual(['orders:1', 'orders:2']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts -t "delete"`
Expected: FAIL — `workspace.deleteKey`/`deleteKeys`/`previewGroupKeys` are `undefined`.

- [ ] **Step 3: Implement the three methods in `useRedisWorkspaceBrowser.ts`**

Add near the end of `useRedisWorkspaceBrowser`, before the `return` statement:

```ts
const isDeletingKey = ref(false);

const removeKeysFromList = (deletedKeys: string[]) => {
  const deletedSet = new Set(deletedKeys);
  keys.value = keys.value.filter(item => !deletedSet.has(item.key));
};

const clearSelectionIfDeleted = (deletedKeys: string[]) => {
  if (
    !session.value?.selectedKey ||
    !deletedKeys.includes(session.value.selectedKey)
  ) {
    return;
  }

  store.patchSession(session.value.connectionId, { selectedKey: null });
  selectedKeyDetail.value = null;
};

const deleteKey = async (key: string) => {
  if (!connection.value || !session.value) {
    return;
  }

  isDeletingKey.value = true;

  try {
    await $fetch<RedisDeleteResponse>('/api/redis/browser/value', {
      method: 'DELETE',
      body: {
        ...buildConnectionBody(connection.value),
        databaseIndex: session.value.selectedDatabaseIndex,
        key,
      },
    });

    detailCache.delete(
      getDetailCacheKey(session.value.selectedDatabaseIndex, key)
    );
    removeKeysFromList([key]);
    clearSelectionIfDeleted([key]);
  } finally {
    isDeletingKey.value = false;
  }
};

const deleteKeys = async (keysToDelete: string[]) => {
  if (!connection.value || !session.value || keysToDelete.length === 0) {
    return;
  }

  isDeletingKey.value = true;

  try {
    await $fetch<RedisDeleteResponse>('/api/redis/browser/keys', {
      method: 'DELETE',
      body: {
        ...buildConnectionBody(connection.value),
        databaseIndex: session.value.selectedDatabaseIndex,
        keys: keysToDelete,
      },
    });

    keysToDelete.forEach(key =>
      detailCache.delete(
        getDetailCacheKey(session.value!.selectedDatabaseIndex, key)
      )
    );
    removeKeysFromList(keysToDelete);
    clearSelectionIfDeleted(keysToDelete);
  } finally {
    isDeletingKey.value = false;
  }
};

const previewGroupKeys = async (prefix: string): Promise<string[]> => {
  if (!connection.value || !session.value) {
    return [];
  }

  const result = await $fetch<RedisBrowserResponse>('/api/redis/browser', {
    method: 'POST',
    body: {
      ...buildConnectionBody(connection.value),
      databaseIndex: session.value.selectedDatabaseIndex,
      keyPattern: `${prefix}:*`,
    },
  });

  return result.keys.map(item => item.key);
};
```

Add the new type imports at the top of the file (extend the existing `~/core/types/redis-workspace.types` import):

```ts
import type {
  RedisBrowserResponse,
  RedisDatabaseOption,
  RedisDeleteResponse,
  RedisKeyDetail,
  RedisKeyListItem,
  RedisValueUpdatePayload,
} from '~/core/types/redis-workspace.types';
```

Add the three new methods plus `isDeletingKey` to the function's final `return` object:

```ts
  return {
    keys,
    databases,
    selectedKeyDetail,
    loadingKeys,
    loadingSelectedKeyDetail,
    savingValue,
    isDeletingKey,
    editUnavailableReason,
    canEditSelectedValue,
    refreshKeys,
    refreshDatabases,
    refreshSelectedKeyDetail,
    openKey,
    focusKey,
    saveSelectedValue,
    deleteKey,
    deleteKeys,
    previewGroupKeys,
  };
```

- [ ] **Step 4: Expose the new methods from `useRedisWorkspace.ts`**

In `components/modules/redis-workspace/hooks/useRedisWorkspace.ts`, update the final `return` statement:

```ts
  return {
    session,
    keys: browser.keys,
    databases: browser.databases,
    selectedKeyDetail: browser.selectedKeyDetail,
    loadingKeys: browser.loadingKeys,
    loadingSelectedKeyDetail: browser.loadingSelectedKeyDetail,
    savingValue: browser.savingValue,
    selectedDatabaseIndex,
    keyPattern,
    canEditSelectedValue: browser.canEditSelectedValue,
    editUnavailableReason: browser.editUnavailableReason,
    refreshKeys: browser.refreshKeys,
    openKey: browser.openKey,
    focusKey: browser.focusKey,
    saveSelectedValue: browser.saveSelectedValue,
  };
```

to:

```ts
  return {
    session,
    keys: browser.keys,
    databases: browser.databases,
    selectedKeyDetail: browser.selectedKeyDetail,
    loadingKeys: browser.loadingKeys,
    loadingSelectedKeyDetail: browser.loadingSelectedKeyDetail,
    savingValue: browser.savingValue,
    isDeletingKey: browser.isDeletingKey,
    selectedDatabaseIndex,
    keyPattern,
    canEditSelectedValue: browser.canEditSelectedValue,
    editUnavailableReason: browser.editUnavailableReason,
    refreshKeys: browser.refreshKeys,
    openKey: browser.openKey,
    focusKey: browser.focusKey,
    saveSelectedValue: browser.saveSelectedValue,
    deleteKey: browser.deleteKey,
    deleteKeys: browser.deleteKeys,
    previewGroupKeys: browser.previewGroupKeys,
  };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts`
Expected: PASS (all tests, old and new).

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add components/modules/redis-workspace/hooks/useRedisWorkspaceBrowser.ts components/modules/redis-workspace/hooks/useRedisWorkspace.ts test/nuxt/components/modules/redis-workspace/useRedisWorkspace.test.ts
git commit -m "feat(redis): add deleteKey/deleteKeys/previewGroupKeys to the workspace hook"
```

---

### Task 7: Add a `delete` keyboard emit to the shared `FileTree.vue`

**Files:**

- Modify: `components/base/tree-folder/FileTree.vue:625-692` (`handleKeyDown`) and its emits type
- Test: `test/nuxt/components/base/tree-folder/FileTree.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `FileTree` emits `delete: [nodeId: string, event: KeyboardEvent]` whenever `Delete` or `Backspace` is pressed while a node has tree focus. Purely additive — existing consumers (Explorer, Schemas, UserRoles trees) don't listen for it, so their behavior is unchanged. Task 10 (`RedisKeyTree.vue`) is the first consumer.

- [ ] **Step 1: Write the failing test**

Add to `test/nuxt/components/base/tree-folder/FileTree.test.ts`, inside the `describe('FileTree', ...)` block:

```ts
it('emits delete with the focused node id when Delete is pressed', async () => {
  const wrapper = mountTree();

  await wrapper.vm.$nextTick();
  await wrapper.find('.tree-row').trigger('click');
  await wrapper.find('.file-tree').trigger('keydown', { key: 'Delete' });

  expect(wrapper.emitted('delete')?.[0]?.[0]).toBe('root');
});

it('emits delete when Backspace is pressed on a focused node', async () => {
  const wrapper = mountTree();

  await wrapper.vm.$nextTick();
  await wrapper.find('.tree-row').trigger('click');
  await wrapper.find('.file-tree').trigger('keydown', { key: 'Backspace' });

  expect(wrapper.emitted('delete')?.[0]?.[0]).toBe('root');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest --run --project nuxt test/nuxt/components/base/tree-folder/FileTree.test.ts -t "emits delete"`
Expected: FAIL — `wrapper.emitted('delete')` is `undefined` since nothing emits it yet.

- [ ] **Step 3: Add the emit type and the keydown case**

Find the emits type definition near the top of `components/base/tree-folder/FileTree.vue` (it already declares `click`, `contextmenu`, etc. — e.g. `contextmenu: [nodeId: string, event: MouseEvent];` at line 59) and add a sibling entry:

```ts
  delete: [nodeId: string, event: KeyboardEvent];
```

In `handleKeyDown`, add a new `case` before the closing `switch`:

```ts
    case 'Enter':
    case ' ':
      event.preventDefault();
      const node = nodes.value[focusedId.value];
      if (node.type === 'folder') {
        toggleExpansion(focusedId.value);
      } else {
        emit('click', focusedId.value, event as unknown as MouseEvent);
      }
      break;
  }
```

to:

```ts
    case 'Enter':
    case ' ':
      event.preventDefault();
      const node = nodes.value[focusedId.value];
      if (node.type === 'folder') {
        toggleExpansion(focusedId.value);
      } else {
        emit('click', focusedId.value, event as unknown as MouseEvent);
      }
      break;

    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      emit('delete', focusedId.value, event);
      break;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest --run --project nuxt test/nuxt/components/base/tree-folder/FileTree.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/base/tree-folder/FileTree.vue test/nuxt/components/base/tree-folder/FileTree.test.ts
git commit -m "feat(tree): emit delete on Delete/Backspace when a node has focus"
```

---

### Task 8: Fix sidebar focus/scroll sync in `RedisKeyTree.vue`

**Files:**

- Modify: `components/modules/management/redis-browser/components/RedisKeyTree.vue:143-163` (the `selectedKey` watch) and its `<script setup>` block
- Test: `test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts` (new test cases)

**Interfaces:**

- Consumes: `FileTree`'s existing `focusItem`/`clearSelection` exposed methods (unchanged).
- Produces: no prop/emit signature changes to `RedisKeyTree.vue` — this task only changes internal behavior (when `focusItem` fires).

Note: as identified during design, `RedisKeyTree.vue` currently has an _unstaged_ local edit changing its loading-state markup (`v-if="loading"` → `LoadingOverlay`). That edit is unrelated to this task and must be left as-is — do not revert it. The watch/click logic touched here is further down the file and does not overlap with that markup.

- [ ] **Step 1: Write the failing tests**

Add to `test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts` (create the file if it doesn't already cover this; if `test/nuxt/components/modules/management/redis-browser/RedisKeyTree.test.ts` is the actual existing path — confirm from the repo, it is — add these `it` blocks to the existing `describe('useRedisTreeData', ...)` — actually add a **new** `describe('RedisKeyTree focus behavior', ...)` block in the same file, since these tests are about the component, not the `useRedisTreeData` composable):

```ts
describe('RedisKeyTree focus behavior', () => {
  it('does not re-focus the row on a direct click (already highlighted by FileTree itself)', async () => {
    const wrapper = mount(RedisKeyTree, {
      props: {
        keys: redisKeys,
        viewMode: 'list',
      },
    });

    await wrapper.vm.$nextTick();
    const focusItemSpy = vi.spyOn(
      (wrapper.vm as any).flatTreeRef ?? {},
      'focusItem'
    );

    const items = wrapper.findAll('button');
    await items[0]?.trigger('click');
    await wrapper.setProps({ selectedKey: 'inventory:1' });
    await wrapper.vm.$nextTick();

    expect(focusItemSpy).not.toHaveBeenCalled();
  });

  it('focuses the selected key when the component is (re)activated with a key already selected', async () => {
    const KeepAliveHost = defineComponent({
      components: { RedisKeyTree },
      props: { selectedKey: { type: String, default: null } },
      template:
        '<KeepAlive><RedisKeyTree v-if="show" :keys="keys" :selected-key="selectedKey" view-mode="list" /></KeepAlive>',
      data() {
        return { show: true, keys: redisKeys };
      },
    });

    const wrapper = mount(KeepAliveHost, {
      props: { selectedKey: 'orders:1' },
    });

    await wrapper.vm.$nextTick();
    const treeInstance = wrapper.findComponent(RedisKeyTree);
    const focusItemSpy = vi.spyOn(
      (treeInstance.vm as any).flatTreeRef,
      'focusItem'
    );

    (wrapper.vm as any).show = false;
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).show = true;
    await wrapper.vm.$nextTick();

    expect(focusItemSpy).toHaveBeenCalledWith('redis-key:orders:1');
  });
});
```

Add the needed imports at the top of the file: `import { defineComponent } from 'vue';` and `vi` from `vitest` (already imported as `describe, expect, it` — extend to include `vi`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest --run --project nuxt test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts -t "focus behavior"`
Expected: FAIL — today every `selectedKey` prop change (including the one caused by the click itself) calls `focusItem`, so the first test's `not.toHaveBeenCalled()` fails; the second test fails because there's no `onActivated` hook yet, so `focusItem` is never called on reactivation.

- [ ] **Step 3: Add the local-click suppression flag and the `onActivated` hook**

In `components/modules/management/redis-browser/components/RedisKeyTree.vue`, find `handleListClick` and `handleTreeClick`:

```ts
const handleListClick = (nodeId: string) => {
  const node = flatFileTreeData.value[nodeId];
  const redisKey = node?.data?.redisKey;

  if (node?.data?.kind === 'key' && redisKey) {
    emit('select', redisKey);
  }
};

const handleTreeClick = (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  const redisKey = node?.data?.redisKey;

  if (node?.data?.kind === 'key' && redisKey) {
    emit('select', redisKey);
  }
};
```

Replace with:

```ts
const isLocalSelection = ref(false);

const handleListClick = (nodeId: string) => {
  const node = flatFileTreeData.value[nodeId];
  const redisKey = node?.data?.redisKey;

  if (node?.data?.kind === 'key' && redisKey) {
    isLocalSelection.value = true;
    emit('select', redisKey);
  }
};

const handleTreeClick = (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  const redisKey = node?.data?.redisKey;

  if (node?.data?.kind === 'key' && redisKey) {
    isLocalSelection.value = true;
    emit('select', redisKey);
  }
};
```

Find the existing `watch(() => props.selectedKey, ...)`:

```ts
watch(
  () => props.selectedKey,
  selectedKey => {
    const activeRef =
      props.viewMode === RedisBrowserViewMode.Tree
        ? fileTreeRef.value
        : flatTreeRef.value;

    if (!activeRef) {
      return;
    }

    if (!selectedKey) {
      activeRef.clearSelection();
      return;
    }

    activeRef.focusItem(`redis-key:${selectedKey}`);
  },
  { flush: 'post', immediate: true }
);
```

Replace with:

```ts
const focusSelectedKey = (selectedKey: string | null) => {
  const activeRef =
    props.viewMode === RedisBrowserViewMode.Tree
      ? fileTreeRef.value
      : flatTreeRef.value;

  if (!activeRef) {
    return;
  }

  if (!selectedKey) {
    activeRef.clearSelection();
    return;
  }

  activeRef.focusItem(`redis-key:${selectedKey}`);
};

watch(
  () => props.selectedKey,
  selectedKey => {
    if (isLocalSelection.value) {
      isLocalSelection.value = false;
      return;
    }

    focusSelectedKey(selectedKey);
  },
  { flush: 'post', immediate: true }
);

onActivated(() => {
  if (props.selectedKey) {
    focusSelectedKey(props.selectedKey);
  }
});
```

`onActivated` is a Vue composition API function auto-imported by Nuxt (same as `onBeforeUnmount`, already used elsewhere in this file's sibling components) — no explicit import statement needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest --run --project nuxt test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/modules/management/redis-browser/components/RedisKeyTree.vue test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts
git commit -m "fix(redis): stop redundant focus on direct click, refocus selected key on panel reactivation"
```

---

### Task 9: Add page-level `keepalive` to the Redis tab route

**Files:**

- Modify: `pages/[workspaceId]/[connectionId]/redis/[tabViewId].vue`

**Interfaces:**

- Consumes: `DEFAULT_MAX_KEEP_ALIVE` from `~/core/constants`.
- Produces: no interface change — this only affects whether Vue Router keeps the page's component instance alive across navigations away and back.

- [ ] **Step 1: Add `definePageMeta` with `keepalive`**

In `pages/[workspaceId]/[connectionId]/redis/[tabViewId].vue`, this page is currently missing `definePageMeta` entirely, unlike its sibling tab routes (`quick-query/[tabViewId].vue`, `agent/[tabViewId].vue`, both use `keepalive: { max: DEFAULT_MAX_KEEP_ALIVE }`). Update:

```vue
<script setup lang="ts">
import RedisWorkspace from '~/components/modules/redis-workspace/RedisWorkspace.vue';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';

const route = useRoute('workspaceId-connectionId-redis-tabViewId');
```

to:

```vue
<script setup lang="ts">
import RedisWorkspace from '~/components/modules/redis-workspace/RedisWorkspace.vue';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-redis-tabViewId');
```

This means switching to a different top-level tab and back no longer destroys/remounts `RedisWorkspace.vue` — its `useRedisWorkspace` instance (including the Task 5 detail cache) survives across tab switches. It's complementary to Task 5's cache, not a replacement: this only helps when the _route_ changes (switching tabs); Task 5's cache is what makes switching _keys within_ an already-open tab fast, since that never changes route at all.

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 3: Manual verification note**

This is a page-meta change with no unit-testable behavior in this repo's Vitest setup (sibling pages' `keepalive` meta isn't unit tested either). Verify manually per the project's UI-change rule: `bun run dev`, open a Redis connection, open a key in the Redis tab, switch to a different tab (e.g. Quick Query), switch back — the previously open key should still be shown instantly without a loading flash.

- [ ] **Step 4: Commit**

```bash
git add "pages/[workspaceId]/[connectionId]/redis/[tabViewId].vue"
git commit -m "fix(redis): keep the Redis tab page alive across tab switches like its sibling tabs"
```

---

### Task 10: Build `useRedisTreeContextMenu.ts`

**Files:**

- Create: `components/modules/management/redis-browser/hooks/useRedisTreeContextMenu.ts`
- Test: `test/nuxt/components/management/redis-browser/useRedisTreeContextMenu.test.ts` (new file)

**Interfaces:**

- Consumes: `ContextMenuItem`/`ContextMenuItemType` from `~/components/base/context-menu/menuContext.type`, `RedisTreeNodeData` from `~/components/modules/management/redis-browser/hooks/useRedisTreeData`.
- Produces: `useRedisTreeContextMenu(options: { resolveNode: (nodeId: string) => RedisTreeNodeData | null; onDeleteKey: (key: string) => void; onDeleteGroup: (prefix: string) => void }): { contextMenuItems: ComputedRef<ContextMenuItem[]>; onRightClickItem: (nodeId: string) => void; onClearContextMenu: () => void }`. Task 11 (`RedisKeyTree.vue`) is the consumer.

- [ ] **Step 1: Write the failing tests**

Create `test/nuxt/components/management/redis-browser/useRedisTreeContextMenu.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { ContextMenuItemType } from '~/components/base/context-menu/menuContext.type';
import { useRedisTreeContextMenu } from '~/components/modules/management/redis-browser/hooks/useRedisTreeContextMenu';
import { RedisKeyType } from '~/components/modules/management/redis-browser/hooks/useRedisTreeData';

describe('useRedisTreeContextMenu', () => {
  it('builds a Delete action for a key node and calls onDeleteKey with its redis key', () => {
    const onDeleteKey = vi.fn();
    const onDeleteGroup = vi.fn();
    const { contextMenuItems, onRightClickItem } = useRedisTreeContextMenu({
      resolveNode: () => ({
        kind: 'key',
        redisKey: 'orders:1',
        keyType: RedisKeyType.String,
      }),
      onDeleteKey,
      onDeleteGroup,
    });

    onRightClickItem('redis-key:orders:1');

    const deleteAction = contextMenuItems.value.find(
      item => item.type === ContextMenuItemType.ACTION
    );
    deleteAction?.select?.();

    expect(deleteAction?.title).toBe('Delete');
    expect(onDeleteKey).toHaveBeenCalledWith('orders:1');
    expect(onDeleteGroup).not.toHaveBeenCalled();
  });

  it('builds a "Delete N keys..." action for a group node using the node id as the prefix', () => {
    const onDeleteKey = vi.fn();
    const onDeleteGroup = vi.fn();
    const { contextMenuItems, onRightClickItem } = useRedisTreeContextMenu({
      resolveNode: () => ({ kind: 'group', keyCount: 5 }),
      onDeleteKey,
      onDeleteGroup,
    });

    onRightClickItem('redis-group:orders');

    const deleteAction = contextMenuItems.value.find(
      item => item.type === ContextMenuItemType.ACTION
    );
    deleteAction?.select?.();

    expect(deleteAction?.title).toBe('Delete 5 keys...');
    expect(onDeleteGroup).toHaveBeenCalledWith('orders');
    expect(onDeleteKey).not.toHaveBeenCalled();
  });

  it('returns no items when nothing has been right-clicked yet', () => {
    const { contextMenuItems } = useRedisTreeContextMenu({
      resolveNode: () => null,
      onDeleteKey: vi.fn(),
      onDeleteGroup: vi.fn(),
    });

    expect(contextMenuItems.value).toEqual([]);
  });

  it('clears the menu on onClearContextMenu', () => {
    const { contextMenuItems, onRightClickItem, onClearContextMenu } =
      useRedisTreeContextMenu({
        resolveNode: () => ({ kind: 'key', redisKey: 'orders:1' }),
        onDeleteKey: vi.fn(),
        onDeleteGroup: vi.fn(),
      });

    onRightClickItem('redis-key:orders:1');
    expect(contextMenuItems.value.length).toBeGreaterThan(0);

    onClearContextMenu();
    expect(contextMenuItems.value).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest --run --project nuxt test/nuxt/components/management/redis-browser/useRedisTreeContextMenu.test.ts`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement the composable**

Create `components/modules/management/redis-browser/hooks/useRedisTreeContextMenu.ts`:

```ts
import { computed, ref } from 'vue';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import type { RedisTreeNodeData } from './useRedisTreeData';

const GROUP_PREFIX = 'redis-group:';

export interface UseRedisTreeContextMenuOptions {
  resolveNode: (nodeId: string) => RedisTreeNodeData | null;
  onDeleteKey: (key: string) => void;
  onDeleteGroup: (prefix: string) => void;
}

export function useRedisTreeContextMenu(
  options: UseRedisTreeContextMenuOptions
) {
  const contextNodeId = ref<string | null>(null);

  const onRightClickItem = (nodeId: string) => {
    contextNodeId.value = nodeId;
  };

  const onClearContextMenu = () => {
    contextNodeId.value = null;
  };

  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    const nodeId = contextNodeId.value;

    if (!nodeId) {
      return [];
    }

    const data = options.resolveNode(nodeId);

    if (!data) {
      return [];
    }

    if (data.kind === 'key' && data.redisKey) {
      const key = data.redisKey;

      return [
        {
          title: 'Delete',
          icon: 'hugeicons:delete-02',
          type: ContextMenuItemType.ACTION,
          select: () => options.onDeleteKey(key),
        },
      ];
    }

    if (data.kind === 'group') {
      const prefix = nodeId.startsWith(GROUP_PREFIX)
        ? nodeId.slice(GROUP_PREFIX.length)
        : nodeId;
      const countLabel =
        typeof data.keyCount === 'number' ? ` ${data.keyCount}` : '';

      return [
        {
          title: `Delete${countLabel} keys...`,
          icon: 'hugeicons:delete-02',
          type: ContextMenuItemType.ACTION,
          select: () => options.onDeleteGroup(prefix),
        },
      ];
    }

    return [];
  });

  return {
    contextMenuItems,
    onRightClickItem,
    onClearContextMenu,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest --run --project nuxt test/nuxt/components/management/redis-browser/useRedisTreeContextMenu.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/modules/management/redis-browser/hooks/useRedisTreeContextMenu.ts test/nuxt/components/management/redis-browser/useRedisTreeContextMenu.test.ts
git commit -m "feat(redis): add context menu composable for key/group delete actions"
```

---

### Task 11: Wire context menu + keyboard delete into `RedisKeyTree.vue`

**Files:**

- Modify: `components/modules/management/redis-browser/components/RedisKeyTree.vue`
- Test: `test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts`

**Interfaces:**

- Consumes: `useRedisTreeContextMenu` from Task 10, `delete` emit from `FileTree.vue` (Task 7).
- Produces: `RedisKeyTree.vue` emits two new events: `delete-key: [key: string, options: { immediate: boolean }]` and `delete-group: [prefix: string]`. Task 12 (`ManagementRedisBrowser.vue`) listens for both.

- [ ] **Step 1: Write the failing tests**

Add to `test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts`, as a new `describe('RedisKeyTree delete', ...)` block (sibling to the `describe('RedisKeyTree focus behavior', ...)` block added in Task 8):

```ts
describe('RedisKeyTree delete', () => {
  it('emits delete-key with immediate:false on a plain Delete keypress for a focused key', async () => {
    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'list' },
    });

    await wrapper.vm.$nextTick();
    const items = wrapper.findAll('button');
    await items[0]?.trigger('click');
    await wrapper.find('.file-tree').trigger('keydown', { key: 'Delete' });

    expect(wrapper.emitted('delete-key')?.[0]).toEqual([
      'inventory:1',
      { immediate: false },
    ]);
  });

  it('emits delete-key with immediate:true when Cmd+Delete is pressed on a focused key row', async () => {
    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'list' },
    });

    await wrapper.vm.$nextTick();
    const items = wrapper.findAll('button');
    await items[0]?.trigger('click');
    await wrapper.find('.file-tree').trigger('keydown', {
      key: 'Delete',
      metaKey: true,
    });

    expect(wrapper.emitted('delete-key')?.[0]).toEqual([
      'inventory:1',
      { immediate: true },
    ]);
  });

  it('emits delete-group with the group prefix when a folder node is deleted via keyboard', async () => {
    const wrapper = mount(RedisKeyTree, {
      props: { keys: redisKeys, viewMode: 'tree' },
    });

    await wrapper.vm.$nextTick();
    const groupRow = wrapper
      .findAll('.tree-row, button')
      .find(node => node.text().includes('orders'));
    await groupRow?.trigger('click');
    await wrapper.find('.file-tree').trigger('keydown', { key: 'Delete' });

    expect(wrapper.emitted('delete-group')?.[0]).toEqual(['orders']);
  });
});
```

All three tests click a row first to establish tree focus, then dispatch the keyboard event — matching how `FileTree`'s own tests already establish focus via a prior click before testing keyboard behavior (see `test/nuxt/components/base/tree-folder/FileTree.test.ts`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest --run --project nuxt test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts -t "RedisKeyTree delete"`
Expected: FAIL — `RedisKeyTree.vue` doesn't emit `delete-key`/`delete-group` yet, and doesn't listen to `FileTree`'s `delete` event at all.

- [ ] **Step 3: Wire the composable and the delete emits**

In `components/modules/management/redis-browser/components/RedisKeyTree.vue`, add to the emits:

```ts
const emit = defineEmits<{
  (e: 'select', key: string): void;
}>();
```

to:

```ts
const emit = defineEmits<{
  (e: 'select', key: string): void;
  (e: 'delete-key', key: string, options: { immediate: boolean }): void;
  (e: 'delete-group', prefix: string): void;
}>();
```

Add the import:

```ts
import { useRedisTreeContextMenu } from '../hooks/useRedisTreeContextMenu';
```

and `BaseContextMenu`:

```ts
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
```

After the existing `getRedisNodeData` helper, add a resolver that works across both tree and list data sources, and wire the composable:

```ts
const resolveNode = (nodeId: string): RedisTreeNodeData | null => {
  const source =
    props.viewMode === RedisBrowserViewMode.Tree
      ? fileTreeData.value
      : flatFileTreeData.value;

  return getRedisNodeData(source[nodeId]);
};

const { contextMenuItems, onRightClickItem, onClearContextMenu } =
  useRedisTreeContextMenu({
    resolveNode,
    onDeleteKey: key => emit('delete-key', key, { immediate: false }),
    onDeleteGroup: prefix => emit('delete-group', prefix),
  });

const handleTreeDelete = (nodeId: string, event: KeyboardEvent) => {
  const data = resolveNode(nodeId);

  if (!data) {
    return;
  }

  if (data.kind === 'key' && data.redisKey) {
    emit('delete-key', data.redisKey, {
      immediate: event.metaKey || event.ctrlKey,
    });
    return;
  }

  if (data.kind === 'group') {
    const prefix = nodeId.startsWith('redis-group:')
      ? nodeId.slice('redis-group:'.length)
      : nodeId;
    emit('delete-group', prefix);
  }
};
```

Update the template to wrap both `FileTree` variants in a single `BaseContextMenu`, and wire `@contextmenu`/`@delete` on each `FileTree`. Replace:

```vue
    <div
      v-else-if="props.viewMode === RedisBrowserViewMode.Tree"
      class="h-full"
    >
      <FileTree
        ref="fileTreeRef"
        :init-expanded-ids="defaultFolderOpenIds"
        :initial-data="fileTreeData"
        storage-key="redis-key-tree"
        :allow-drag-and-drop="false"
        :delay-focus="0"
        @click="handleTreeClick"
      >
        <template #actions="{ node }">
          <div class="flex items-center gap-1.5 text-xxs text-muted-foreground">
            <span
              v-for="meta in getNodeMeta(node)"
              :key="`${node.id}-${meta.label}`"
              class="truncate"
              :title="meta.title"
            >
              {{ meta.label }}
            </span>
          </div>
        </template>
      </FileTree>
    </div>

    <div v-else class="h-full">
      <FileTree
        ref="flatTreeRef"
        :init-expanded-ids="[]"
        :initial-data="flatFileTreeData"
        storage-key="redis-key-list"
        :allow-drag-and-drop="false"
        :delay-focus="0"
        @click="handleListClick"
      >
        <template #actions="{ node }">
          <div class="flex items-center gap-1.5 text-xxs text-muted-foreground">
            <span
              v-for="meta in getNodeMeta(node)"
              :key="`${node.id}-${meta.label}`"
              class="truncate"
              :title="meta.title"
            >
              {{ meta.label }}
            </span>
          </div>
        </template>
      </FileTree>
    </div>
  </div>
</template>
```

with:

```vue
    <BaseContextMenu
      v-else
      :context-menu-items="contextMenuItems"
      @on-clear-context-menu="onClearContextMenu"
    >
      <div v-if="props.viewMode === RedisBrowserViewMode.Tree" class="h-full">
        <FileTree
          ref="fileTreeRef"
          :init-expanded-ids="defaultFolderOpenIds"
          :initial-data="fileTreeData"
          storage-key="redis-key-tree"
          :allow-drag-and-drop="false"
          :delay-focus="0"
          @click="handleTreeClick"
          @contextmenu="onRightClickItem"
          @delete="handleTreeDelete"
        >
          <template #actions="{ node }">
            <div
              class="flex items-center gap-1.5 text-xxs text-muted-foreground"
            >
              <span
                v-for="meta in getNodeMeta(node)"
                :key="`${node.id}-${meta.label}`"
                class="truncate"
                :title="meta.title"
              >
                {{ meta.label }}
              </span>
            </div>
          </template>
        </FileTree>
      </div>

      <div v-else class="h-full">
        <FileTree
          ref="flatTreeRef"
          :init-expanded-ids="[]"
          :initial-data="flatFileTreeData"
          storage-key="redis-key-list"
          :allow-drag-and-drop="false"
          :delay-focus="0"
          @click="handleListClick"
          @contextmenu="onRightClickItem"
          @delete="handleTreeDelete"
        >
          <template #actions="{ node }">
            <div
              class="flex items-center gap-1.5 text-xxs text-muted-foreground"
            >
              <span
                v-for="meta in getNodeMeta(node)"
                :key="`${node.id}-${meta.label}`"
                class="truncate"
                :title="meta.title"
              >
                {{ meta.label }}
              </span>
            </div>
          </template>
        </FileTree>
      </div>
    </BaseContextMenu>
  </div>
</template>
```

Note the `v-if`/`v-else-if`/`v-else` chain in this template already has branches for `loading` and `visibleKeys.length === 0` above this block (see the file's current structure) — this replaces only the final tree/list branch, now merged into one `v-else` wrapped by `BaseContextMenu`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest --run --project nuxt test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/modules/management/redis-browser/components/RedisKeyTree.vue test/nuxt/components/management/redis-browser/RedisKeyTree.test.ts
git commit -m "feat(redis): wire context menu and keyboard delete shortcuts into the key tree"
```

---

### Task 12: Build `RedisDeleteKeyDialog.vue`

**Files:**

- Create: `components/modules/redis-workspace/components/RedisDeleteKeyDialog.vue`
- Test: `test/nuxt/components/modules/redis-workspace/RedisDeleteKeyDialog.test.ts` (new file)

**Interfaces:**

- Consumes: shadcn `AlertDialog*` components (globally available, same as `RedisBulkActionsDialog.vue` — no import needed).
- Produces: props `{ open: boolean; mode: 'key' | 'group'; targetKey?: string; targetKeys?: string[]; loading?: boolean }`, emits `update:open: [boolean]` and `confirm: []`. Task 13 and Task 14 both mount this component.

- [ ] **Step 1: Write the failing tests**

Create `test/nuxt/components/modules/redis-workspace/RedisDeleteKeyDialog.test.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RedisDeleteKeyDialog from '~/components/modules/redis-workspace/components/RedisDeleteKeyDialog.vue';

const mountDialog = (props: Record<string, unknown>) =>
  mount(RedisDeleteKeyDialog, {
    props: { open: true, mode: 'key', ...props },
    global: {
      stubs: {
        AlertDialog: { template: '<div><slot /></div>' },
        AlertDialogContent: { template: '<div><slot /></div>' },
        AlertDialogHeader: { template: '<div><slot /></div>' },
        AlertDialogTitle: { template: '<div><slot /></div>' },
        AlertDialogDescription: { template: '<div><slot /></div>' },
        AlertDialogFooter: { template: '<div><slot /></div>' },
        AlertDialogCancel: { template: '<button><slot /></button>' },
        AlertDialogAction: {
          props: ['disabled'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('RedisDeleteKeyDialog', () => {
  it('shows the single key name in key mode', () => {
    const wrapper = mountDialog({ mode: 'key', targetKey: 'orders:1' });

    expect(wrapper.text()).toContain('orders:1');
  });

  it('shows every key and the count in group mode', () => {
    const wrapper = mountDialog({
      mode: 'group',
      targetKeys: ['orders:1', 'orders:2', 'orders:3'],
    });

    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('orders:1');
    expect(wrapper.text()).toContain('orders:2');
    expect(wrapper.text()).toContain('orders:3');
  });

  it('emits confirm when the destructive action is clicked', async () => {
    const wrapper = mountDialog({ mode: 'key', targetKey: 'orders:1' });

    await wrapper.find('button:last-of-type').trigger('click');

    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('disables the confirm action while loading', () => {
    const wrapper = mountDialog({
      mode: 'key',
      targetKey: 'orders:1',
      loading: true,
    });

    const actionButtons = wrapper.findAll('button');
    const confirmButton = actionButtons[actionButtons.length - 1];

    expect(confirmButton?.attributes('disabled')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/RedisDeleteKeyDialog.test.ts`
Expected: FAIL — the component file doesn't exist yet.

- [ ] **Step 3: Implement the dialog**

Create `components/modules/redis-workspace/components/RedisDeleteKeyDialog.vue`:

```vue
<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    mode: 'key' | 'group';
    targetKey?: string;
    targetKeys?: string[];
    loading?: boolean;
  }>(),
  {
    targetKey: '',
    targetKeys: () => [],
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border">
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ mode === 'key' ? 'Delete key' : 'Delete keys' }}
        </AlertDialogTitle>
        <AlertDialogDescription class="space-y-2">
          <p v-if="mode === 'key'">
            This will permanently delete
            <span class="font-mono font-medium">{{ targetKey }}</span>
            . This cannot be undone.
          </p>
          <template v-else>
            <p>
              This will permanently delete
              <span class="font-medium">{{ targetKeys.length }}</span>
              keys. This cannot be undone.
            </p>
            <ul
              class="max-h-48 overflow-y-auto rounded-md border bg-muted/20 p-3 font-mono text-xs"
            >
              <li v-for="key in targetKeys" :key="key" class="truncate">
                {{ key }}
              </li>
            </ul>
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel class="border">Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-white hover:bg-destructive/90"
          :disabled="loading"
          @click="emit('confirm')"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/RedisDeleteKeyDialog.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/modules/redis-workspace/components/RedisDeleteKeyDialog.vue test/nuxt/components/modules/redis-workspace/RedisDeleteKeyDialog.test.ts
git commit -m "feat(redis): add shared single/group key delete confirmation dialog"
```

---

### Task 13: Wire delete flow into `ManagementRedisBrowser.vue`

**Files:**

- Modify: `components/modules/management/redis-browser/ManagementRedisBrowser.vue`
- Test: `test/nuxt/components/modules/management/redis-browser/ManagementRedisBrowser.test.ts`

**Interfaces:**

- Consumes: `deleteKey`/`deleteKeys`/`previewGroupKeys`/`isDeletingKey` from `useRedisWorkspace` (Task 6), `delete-key`/`delete-group` emits from `RedisKeyTree.vue` (Task 11), `RedisDeleteKeyDialog.vue` (Task 12).
- Produces: no new public interface — this is the leaf that wires everything together for the sidebar.

- [ ] **Step 1: Write the failing tests**

Add to `test/nuxt/components/modules/management/redis-browser/ManagementRedisBrowser.test.ts`. First extend `workspaceMock` with the new methods:

```ts
const deleteKeyMock = vi.fn().mockResolvedValue(undefined);
const deleteKeysMock = vi.fn().mockResolvedValue(undefined);
const previewGroupKeysMock = vi
  .fn()
  .mockResolvedValue(['orders:1', 'orders:2']);

const workspaceMock = {
  selectedDatabaseIndex: ref(2),
  keyPattern: ref('orders:*'),
  databases: ref([
    { index: 2, label: 'DB 2', keyCount: 4, expires: 0, avgTtl: null },
  ]),
  loadingKeys: ref(false),
  keys: ref([{ key: 'orders:1', type: 'string', ttl: -1 }]),
  session: ref({ selectedKey: null, viewMode: 'tree' }),
  refreshKeys: vi.fn(),
  openKey: openKeyMock,
  focusKey: vi.fn(),
  deleteKey: deleteKeyMock,
  deleteKeys: deleteKeysMock,
  previewGroupKeys: previewGroupKeysMock,
  isDeletingKey: ref(false),
};
```

Update the `RedisKeyTree` stub in `mountComponent`'s `stubs` to also forward the new emits so tests can trigger them:

```ts
          RedisKeyTree: {
            template:
              '<div><button data-test="select-key" @click="$emit(\'select\', \'orders:1\')">select</button><button data-test="delete-key-immediate" @click="$emit(\'delete-key\', \'orders:1\', { immediate: true })">delete-key-immediate</button><button data-test="delete-key-confirm" @click="$emit(\'delete-key\', \'orders:1\', { immediate: false })">delete-key-confirm</button><button data-test="delete-group" @click="$emit(\'delete-group\', \'orders\')">delete-group</button></div>',
          },
```

Add stubs for the new dialog (it renders real `AlertDialog*` globals which aren't registered in this test's `global.stubs`, so stub the whole dialog component):

```ts
          RedisDeleteKeyDialog: {
            props: ['open', 'mode', 'targetKey', 'targetKeys', 'loading'],
            emits: ['update:open', 'confirm'],
            template:
              '<div v-if="open" data-test="delete-dialog" :data-mode="mode"><button data-test="confirm-delete" @click="$emit(\'confirm\')">confirm</button></div>',
          },
```

Add the new tests inside `describe('ManagementRedisBrowser', ...)`:

```ts
it('deletes a key immediately when the tree reports an immediate delete request', async () => {
  const wrapper = mountComponent();

  await wrapper.find('[data-test="delete-key-immediate"]').trigger('click');

  expect(deleteKeyMock).toHaveBeenCalledWith('orders:1');
  expect(wrapper.find('[data-test="delete-dialog"]').exists()).toBe(false);
});

it('opens a confirm dialog for a non-immediate single-key delete request', async () => {
  const wrapper = mountComponent();

  await wrapper.find('[data-test="delete-key-confirm"]').trigger('click');

  const dialog = wrapper.find('[data-test="delete-dialog"]');
  expect(dialog.exists()).toBe(true);
  expect(dialog.attributes('data-mode')).toBe('key');
  expect(deleteKeyMock).not.toHaveBeenCalled();

  await dialog.find('[data-test="confirm-delete"]').trigger('click');
  expect(deleteKeyMock).toHaveBeenCalledWith('orders:1');
});

it('previews the full group key list and opens a group confirm dialog on delete-group', async () => {
  const wrapper = mountComponent();

  await wrapper.find('[data-test="delete-group"]').trigger('click');
  await flushPromises();

  expect(previewGroupKeysMock).toHaveBeenCalledWith('orders');

  const dialog = wrapper.find('[data-test="delete-dialog"]');
  expect(dialog.exists()).toBe(true);
  expect(dialog.attributes('data-mode')).toBe('group');

  await dialog.find('[data-test="confirm-delete"]').trigger('click');
  expect(deleteKeysMock).toHaveBeenCalledWith(['orders:1', 'orders:2']);
});
```

Add `flushPromises` to the `@vue/test-utils` import at the top of the file:

```ts
import { flushPromises, mount } from '@vue/test-utils';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/management/redis-browser/ManagementRedisBrowser.test.ts -t "delete"`
Expected: FAIL — `ManagementRedisBrowser.vue` doesn't listen for `delete-key`/`delete-group` yet, and doesn't render `RedisDeleteKeyDialog`.

- [ ] **Step 3: Wire the dialog and delete handlers**

In `components/modules/management/redis-browser/ManagementRedisBrowser.vue`, add the import:

```ts
import RedisDeleteKeyDialog from '~/components/modules/redis-workspace/components/RedisDeleteKeyDialog.vue';
```

Destructure the new hook fields (extend the existing destructure of `workspace`):

```ts
const { session, keys, databases, loadingKeys, selectedDatabaseIndex } =
  workspace;
```

to:

```ts
const {
  session,
  keys,
  databases,
  loadingKeys,
  selectedDatabaseIndex,
  isDeletingKey,
} = workspace;
```

Add the delete-dialog state and handlers (near `openSelectedKey`):

```ts
const deleteDialogState = ref<
  | { open: false }
  | { open: true; mode: 'key'; key: string }
  | { open: true; mode: 'group'; prefix: string; keys: string[] }
>({ open: false });

const closeDeleteDialog = () => {
  deleteDialogState.value = { open: false };
};

const onDeleteKeyRequest = async (
  key: string,
  options: { immediate: boolean }
) => {
  if (options.immediate) {
    await workspace.deleteKey(key);
    return;
  }

  deleteDialogState.value = { open: true, mode: 'key', key };
};

const onDeleteGroupRequest = async (prefix: string) => {
  const groupKeys = await workspace.previewGroupKeys(prefix);
  deleteDialogState.value = {
    open: true,
    mode: 'group',
    prefix,
    keys: groupKeys,
  };
};

const onConfirmDelete = async () => {
  const state = deleteDialogState.value;

  if (!state.open) {
    return;
  }

  if (state.mode === 'key') {
    await workspace.deleteKey(state.key);
  } else {
    await workspace.deleteKeys(state.keys);
  }

  closeDeleteDialog();
};

// Computed here (not inlined in the template) so TypeScript narrows the
// deleteDialogState union in one place — vue-tsc doesn't reliably narrow
// discriminated unions accessed directly inside template expressions.
const deleteDialogMode = computed(() =>
  deleteDialogState.value.open ? deleteDialogState.value.mode : 'key'
);
const deleteDialogTargetKey = computed(() =>
  deleteDialogState.value.open && deleteDialogState.value.mode === 'key'
    ? deleteDialogState.value.key
    : ''
);
const deleteDialogTargetKeys = computed(() =>
  deleteDialogState.value.open && deleteDialogState.value.mode === 'group'
    ? deleteDialogState.value.keys
    : []
);
```

Wire the new emits and mount the dialog in the template. Replace:

```vue
      <RedisKeyTree
        ref="treePanelRef"
        :keys="keys"
        :selected-key="selectedKey"
        :loading="loadingKeys"
        :search-query="searchQuery"
        :view-mode="viewMode"
        @select="openSelectedKey"
      />
    </div>
  </div>
</template>
```

with:

```vue
      <RedisKeyTree
        ref="treePanelRef"
        :keys="keys"
        :selected-key="selectedKey"
        :loading="loadingKeys"
        :search-query="searchQuery"
        :view-mode="viewMode"
        @select="openSelectedKey"
        @delete-key="onDeleteKeyRequest"
        @delete-group="onDeleteGroupRequest"
      />
    </div>

    <RedisDeleteKeyDialog
      :open="deleteDialogState.open"
      :mode="deleteDialogMode"
      :target-key="deleteDialogTargetKey"
      :target-keys="deleteDialogTargetKeys"
      :loading="isDeletingKey"
      @update:open="value => !value && closeDeleteDialog()"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/management/redis-browser/ManagementRedisBrowser.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/modules/management/redis-browser/ManagementRedisBrowser.vue test/nuxt/components/modules/management/redis-browser/ManagementRedisBrowser.test.ts
git commit -m "feat(redis): wire delete confirm dialog into the sidebar key tree"
```

---

### Task 14: Add a Delete button to `RedisValueEditor.vue` and wire it in `RedisWorkspace.vue`

**Files:**

- Modify: `components/modules/redis-workspace/components/RedisValueEditor.vue`
- Modify: `components/modules/redis-workspace/RedisWorkspace.vue`
- Test: `test/nuxt/components/modules/redis-workspace/RedisValueEditor.test.ts`

**Interfaces:**

- Consumes: `RedisDeleteKeyDialog.vue` (Task 12), `deleteKey`/`isDeletingKey` from `useRedisWorkspace` (Task 6).
- Produces: `RedisValueEditor.vue` emits a new `delete: []` event (no payload — the parent already knows `detail.key`).

- [ ] **Step 1: Write the failing test**

Add to `test/nuxt/components/modules/redis-workspace/RedisValueEditor.test.ts`, inside `describe('RedisValueEditor', ...)`:

```ts
it('emits delete when the Delete button is clicked', async () => {
  const wrapper = mountComponent();

  await wrapper.find('button[aria-label="Delete key"]').trigger('click');

  expect(wrapper.emitted('delete')).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/RedisValueEditor.test.ts -t "emits delete"`
Expected: FAIL — no such button exists yet.

- [ ] **Step 3: Add the Delete button**

In `components/modules/redis-workspace/components/RedisValueEditor.vue`, add to the emits:

```ts
const emit = defineEmits<{
  (e: 'save', payload: RedisValueUpdatePayload): void;
  (e: 'refresh'): void;
}>();
```

to:

```ts
const emit = defineEmits<{
  (e: 'save', payload: RedisValueUpdatePayload): void;
  (e: 'refresh'): void;
  (e: 'delete'): void;
}>();
```

In the template, add the button next to the existing Refresh button (inside the `ml-auto flex items-center gap-2` div, after the `Refresh` `Button`):

```vue
<Button
  variant="ghost"
  size="sm"
  class="h-7 px-2 text-xs"
  aria-label="Refresh key detail"
  :disabled="loading || saving"
  @click="emit('refresh')"
>
            <Icon name="hugeicons:redo" class="size-3.5! min-w-3.5" />
            Refresh
          </Button>
```

to:

```vue
<Button
  variant="ghost"
  size="sm"
  class="h-7 px-2 text-xs"
  aria-label="Refresh key detail"
  :disabled="loading || saving"
  @click="emit('refresh')"
>
            <Icon name="hugeicons:redo" class="size-3.5! min-w-3.5" />
            Refresh
          </Button>
<Button
  variant="ghost"
  size="sm"
  class="h-7 px-2 text-xs text-destructive hover:text-destructive"
  aria-label="Delete key"
  :disabled="loading || saving"
  @click="emit('delete')"
>
            <Icon name="hugeicons:delete-02" class="size-3.5! min-w-3.5" />
            Delete
          </Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest --run --project nuxt test/nuxt/components/modules/redis-workspace/RedisValueEditor.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Wire the dialog in `RedisWorkspace.vue`**

In `components/modules/redis-workspace/RedisWorkspace.vue`, add the import:

```ts
import RedisDeleteKeyDialog from './components/RedisDeleteKeyDialog.vue';
```

Add dialog state after the existing `activeType` computed:

```ts
const activeType = computed(
  () => props.tabInfo?.type || TabViewType.RedisBrowser
);
```

to:

```ts
const activeType = computed(
  () => props.tabInfo?.type || TabViewType.RedisBrowser
);

const isDeleteDialogOpen = ref(false);

const confirmDelete = async () => {
  if (!selectedKeyDetail.value) {
    return;
  }

  await workspace.deleteKey(selectedKeyDetail.value.key);
  isDeleteDialogOpen.value = false;
};
```

Also destructure `isDeletingKey` alongside the other fields already pulled from `workspace`:

```ts
const {
  canEditSelectedValue,
  databases,
  editUnavailableReason,
  loadingKeys,
  loadingSelectedKeyDetail,
  savingValue,
  selectedDatabaseIndex,
  selectedKeyDetail,
} = workspace;
```

to:

```ts
const {
  canEditSelectedValue,
  databases,
  editUnavailableReason,
  isDeletingKey,
  loadingKeys,
  loadingSelectedKeyDetail,
  savingValue,
  selectedDatabaseIndex,
  selectedKeyDetail,
} = workspace;
```

Update the template to wire the button and mount the dialog. Replace:

```vue
  <RedisValueEditor
    v-else
    :detail="selectedKeyDetail"
    :loading="loadingKeys || loadingSelectedKeyDetail"
    :saving="savingValue"
    :can-edit="canEditSelectedValue"
    :unavailable-reason="editUnavailableReason"
    @save="workspace.saveSelectedValue"
    @refresh="selectedKeyDetail && workspace.focusKey(selectedKeyDetail.key)"
  />
</template>
```

with:

```vue
  <RedisValueEditor
    v-else
    :detail="selectedKeyDetail"
    :loading="loadingKeys || loadingSelectedKeyDetail"
    :saving="savingValue"
    :can-edit="canEditSelectedValue"
    :unavailable-reason="editUnavailableReason"
    @save="workspace.saveSelectedValue"
    @refresh="selectedKeyDetail && workspace.focusKey(selectedKeyDetail.key)"
    @delete="isDeleteDialogOpen = true"
  />

  <RedisDeleteKeyDialog
    :open="isDeleteDialogOpen"
    mode="key"
    :target-key="selectedKeyDetail?.key ?? ''"
    :loading="isDeletingKey"
    @update:open="value => (isDeleteDialogOpen = value)"
    @confirm="confirmDelete"
  />
</template>
```

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add components/modules/redis-workspace/components/RedisValueEditor.vue components/modules/redis-workspace/RedisWorkspace.vue test/nuxt/components/modules/redis-workspace/RedisValueEditor.test.ts
git commit -m "feat(redis): add delete button to the key detail panel with confirm dialog"
```

---

### Task 15: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `bun test:unit`
Expected: PASS.

- [ ] **Step 2: Run the full nuxt/component suite**

Run: `bun test:nuxt`
Expected: PASS.

- [ ] **Step 3: Typecheck the whole project**

Run: `bun run typecheck`
Expected: PASS with no errors.

- [ ] **Step 4: Format check**

Run: `bun run format:check`
Expected: PASS. If it fails only on files touched in this plan, run `bun run format` and re-stage.

- [ ] **Step 5: Manual smoke test (per project UI-change rule)**

Run: `bun run dev`, open a Redis connection with a nested key namespace (e.g. keys like `orders:1`, `orders:2`, `inventory:1`), and verify:

1. Clicking a key in the sidebar tree does not visibly re-scroll/flicker.
2. Switching the primary sidebar to Schemas and back to Redis re-highlights the previously selected key.
3. Right-click a key → Delete → confirm dialog appears → confirming removes it from the tree.
4. Right-click a group folder → Delete N keys... → dialog lists every key under that prefix → confirming removes them all.
5. With a key row focused in the tree, pressing Delete opens the confirm dialog; Cmd/Ctrl+Delete deletes immediately without a dialog.
6. Open a key, switch to a different key and back — the second view is instant (no loading flash). Click "Refresh" — it still re-fetches.
7. Switch to a different top-level tab and back to the Redis tab — the previously open key is still shown without a reload.
8. Click the Delete button inside the key detail panel — confirm dialog appears, confirming removes the key and clears the detail panel.
9. Point at a database with more than 500 keys (or a fixture that seeds that many) and confirm every key eventually shows up in the tree/list, not just the first 500.

Expected: all 9 behaviors match. If any UI behavior can't be verified this way (e.g. no >500-key fixture available), say so explicitly rather than claiming it's confirmed.

- [ ] **Step 6: Report**

Summarize: which commands were run, which passed, which failed, and whether any failures are related to this change or pre-existing.
