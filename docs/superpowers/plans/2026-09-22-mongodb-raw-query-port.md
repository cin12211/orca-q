# MongoDB Raw Query Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port MongoDB raw-query support (script editor, streaming execution, an approval step for destructive operations, console output) from `feat/support-mongodb-3` onto `refactor/driver-modules`'s shell + per-engine driver architecture, replacing MongoDB's current `UnsupportedRawQuery` state.

**Architecture:** Server infrastructure and MongoDB-specific client logic (script catalog, EJSON handling, completion source, execution/approval hooks) move over close to verbatim. The integration layer does not: `feat/support-mongodb-3` built MongoDB on a `RawQueryPlugin`/registry abstraction that does not exist on this branch. MongoDB instead composes its own container the way Postgres and Redis do — reusing the shared primitives (`RawQueryLayout`, header/footer via their `header-extra`/`footer-extra` slots, `RawQueryResultTabs` via its `result-view` slot, the connection-confirm dialog) but bypassing `RawQueryShell`/`useRawQueryCore`/`useQueryExecution` entirely, because its shape (script execution instead of SQL statements, EJSON variables instead of colon-param extraction, an approval step) does not fit the SQL/Redis-shaped core pipeline.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup lang="ts">`, CodeMirror 6 (`@codemirror/lang-javascript`, `@codemirror/lint`), `bson` (EJSON), `@tanstack/vue-virtual`, `prettier/standalone` (script formatting), MongoDB Node driver, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-mongodb-raw-query-port-design.md`

## Global Constraints

- **Never run `git add`, `git mv`, `git commit`, `git stash`, `git reset`, `git checkout <file>`, `git rm`, `git apply`.** The user owns staging and commits. At the end of each task, list every file created/modified so the user can stage it.
- Work happens in the main worktree, `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ`, on branch `refactor/driver-modules`. Source files to port live in the sibling worktree `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3` (branch `feat/support-mongodb-3`) — read from there, never write to it.
- Every task ends green on `bun run typecheck` and `bun test:unit` — both fully clean. `bun test:nuxt`'s full suite is non-deterministic on this branch (mount-based raw-query tests flake even with zero changes) — run new/changed nuxt test files individually, never the full suite, and do not try to fix unrelated pre-existing failures.
- No `any` in source. Use explicit types or `unknown` with a type guard. Where a ported file used `as any` to bypass a type gap this plan closes (see Task 5), remove the cast instead of carrying it over.
- Use the `~/` alias for cross-module imports. Every new folder gets an `index.ts` barrel; import through barrels.
- Layering: the core (`components/modules/raw-query/**`) must not import driver modules or `DatabaseClientType` as a value — the guard test `test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts` must stay green throughout. `components/modules/driver/mongodb/raw-query/index.ts` must not export `containers/` (matches the existing convention for every other driver, avoiding an import cycle with `driver/shared/raw-query`).
- `components/modules/driver/mongodb/quick-query/` is out of scope. Do not modify it.
- Prefer Hugeicons (`hugeicons:*`) for new icon usage; verify any new icon name against `node_modules/@iconify-json/hugeicons/icons.json` before using it. Every icon name used in this plan's code blocks (`hugeicons:command-line`, `hugeicons:alert-02`, `hugeicons:help-circle`) is copied from files that already exist and render correctly, so no verification step is needed for them.

---

## File Structure

```
components/modules/driver/mongodb/raw-query/
├── containers/
│   └── MongoRawQuery.vue                  # Task 7
├── components/
│   ├── MongoRawQueryConsole.vue           # Task 4
│   ├── MongoRawQueryApprovalDialog.vue    # Task 4
│   ├── MongoRawQueryResultView.vue        # Task 4 (simplified)
│   ├── MongoRawQueryVariableUsageGuidePopover.vue  # Task 4
│   └── index.ts
├── hooks/
│   ├── useMongoScriptMetadata.ts          # Task 3
│   ├── useMongoScriptEditorExtensions.ts  # Task 3
│   ├── useMongoScriptExecution.ts         # Task 3
│   ├── useMongoApproval.ts                # Task 3
│   └── index.ts
├── api/
│   ├── executeMongoRawQuery.ts            # Task 2
│   └── index.ts
├── utils/
│   ├── resolveMongoScriptSource.ts        # Task 2
│   ├── createMongoScriptCompletionSource.ts  # Task 2
│   ├── createMongoSuggestionInfo.ts       # Task 2
│   ├── formatMongoScript.ts               # Task 2
│   ├── mongoEjson.ts                      # Task 2
│   └── index.ts
├── constants/
│   ├── mongoScriptCatalog.ts              # Task 2
│   └── index.ts
├── capabilities/
│   ├── mongo.capabilities.ts              # Task 6
│   └── index.ts
└── index.ts                                # Task 6 (does not export containers/)

server/infrastructure/nosql/mongodb/raw-query/   # Task 1, copied verbatim
├── index.ts
├── mongo-approval-registry.ts
├── mongo-capability-host.ts
├── mongo-operation-catalog.ts
├── mongo-raw-query-metadata.ts
├── mongo-raw-query.service.ts
├── mongo-script-policy.ts
└── mongo-script-runtime.ts

server/api/mongodb/                        # Task 1, copied verbatim
├── raw-query-approve.post.ts
├── raw-query-metadata.post.ts
└── raw-query-stream.post.ts

server/utils/load-typescript.ts            # Task 1, copied verbatim
core/types/mongodb-raw-query.types.ts      # Task 1, copied verbatim
core/constants/mongodb-raw-query.ts        # Task 1, copied verbatim
```

Modified in the core (both additive, no engine branching):

- `components/modules/raw-query/interfaces/index.ts` — `ViewMode.CONSOLE`, `ExecutedResultItem.metadata` gains four optional fields (Task 5).
- `components/modules/raw-query/contracts/rawQueryCapabilities.ts` — `RawQueryLanguage` gains `'mongo'` (Task 6).

Modified in the driver-shared layer:

- `components/modules/driver/shared/raw-query/resolveRawQueryDescriptor.ts` — add the `MONGODB` entry (Task 6).
- `components/modules/driver/shared/raw-query/resolver/resolveRawQueryComponent.ts` — `MONGODB` resolves to `MongoRawQuery` instead of `UnsupportedRawQuery` (Task 8).

Deliberately **not** ported (verified during design, see spec §5.2 and the per-file notes in Task 4): `components/modules/raw-query/components/mongo/RawQueryMongoHeaderBadge.vue` (a `RawQueryContext.dialectState` demo artifact tied to the abandoned plugin architecture, no product behavior), `RawQueryMongoExecuteAction.vue` (redundant with the shared footer's built-in Execute/Cancel button and emits), `RawQueryMongoFormatAction.vue` (redundant with the shared footer's built-in Format button once wired to `formatMongoScript`).

---

## Task 1: Server infrastructure, API routes, and core types

**Files:**

- Create: `server/infrastructure/nosql/mongodb/raw-query/index.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-operation-catalog.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-script-runtime.ts`
- Create: `server/api/mongodb/raw-query-approve.post.ts`
- Create: `server/api/mongodb/raw-query-metadata.post.ts`
- Create: `server/api/mongodb/raw-query-stream.post.ts`
- Create: `server/utils/load-typescript.ts`
- Create: `core/types/mongodb-raw-query.types.ts`
- Create: `core/constants/mongodb-raw-query.ts`
- Modify: `package.json` (verify `typescript` dependency placement — see Step 6)

**Interfaces:**

- Consumes: `server/infrastructure/nosql/mongodb/mongodb.client.ts`'s `withMongoClient<T>(params: DatabaseMetadataRequestParams, operation: (client: MongoClient) => Promise<T>): Promise<T>` — **already verified identical in signature** between this branch and `feat/support-mongodb-3** (this branch's version additionally caches clients internally; the caller-facing contract is unchanged). `core/types/database-schemas.types.ts`'s `DatabaseMetadataRequestParams` — already exists on this branch, used unchanged.
- Produces: `isMongoRawQueryStreamMessage`, `MongoRawQueryRequest`, `MongoRawQueryStreamMessage`, `MongoRawQueryMetadata`, `MongoRawQueryOperation`, `MongoRawQueryApprovalResponse`, `MongoRawQueryLogEntry`, `MongoRawQueryMutationSummary` (all from `core/types/mongodb-raw-query.types.ts`, consumed by Tasks 2–4); `MONGO_RAW_QUERY_LIMITS`, `MONGO_RAW_QUERY_RESULT_DEFAULTS` (from `core/constants/mongodb-raw-query.ts`); the three POST routes `/api/mongodb/raw-query-approve`, `/api/mongodb/raw-query-metadata`, `/api/mongodb/raw-query-stream` (consumed by Task 2's `api/` files).

- [ ] **Step 1: Copy the core types file verbatim**

Create `core/types/mongodb-raw-query.types.ts`:

```ts
import type { DatabaseMetadataRequestParams } from './database-schemas.types';

export type MongoRawQueryResultKind =
  | 'cursor'
  | 'documents'
  | 'document'
  | 'scalar'
  | 'mutation'
  | 'void';

export type MongoRawQueryErrorPhase =
  | 'validation'
  | 'compile'
  | 'approval'
  | 'execution'
  | 'timeout'
  | 'cancelled'
  | 'serialization'
  | 'connection';

export interface MongoRawQueryOperation {
  id: string;
  target: 'database' | 'collection';
  method: string;
  database?: string;
  dynamicDatabase: boolean;
  collection?: string;
  dynamicTarget: boolean;
  risk: 'write' | 'destructive';
  summary: string;
}

export interface MongoRawQueryRequest extends DatabaseMetadataRequestParams {
  connectionId: string;
  script: string;
  params?: Record<string, unknown>;
  collectionContext?: string;
  approvalToken?: string;
}

export interface MongoRawQueryMetadataRequest
  extends DatabaseMetadataRequestParams {
  connectionId: string;
  database: string;
  collectionContext?: string;
}

export interface MongoRawQueryMetadata {
  collections: string[];
  fieldsByCollection: Record<string, string[]>;
}

export interface MongoRawQueryLogEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  args: unknown[];
  timestamp?: string;
}

export interface MongoRawQueryDiagnostic {
  message: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  code?: string | number;
}

export interface MongoRawQueryMutationSummary {
  acknowledged?: boolean;
  insertedCount?: number;
  matchedCount?: number;
  modifiedCount?: number;
  deletedCount?: number;
  upsertedCount?: number;
  upsertedId?: unknown;
}

export type MongoRawQueryStreamMessage =
  | {
      type: 'approval-required';
      challengeId: string;
      operations: MongoRawQueryOperation[];
    }
  | {
      type: 'meta';
      resultKind: MongoRawQueryResultKind;
      fields: { name: string }[];
      command: 'MONGODB';
    }
  | { type: 'rows'; data: Record<string, unknown>[] }
  | {
      type: 'result';
      data: unknown;
      mutationSummary?: MongoRawQueryMutationSummary;
    }
  | { type: 'log'; entry: MongoRawQueryLogEntry }
  | { type: 'done'; rowCount: number; queryTime: number; truncated: boolean }
  | {
      type: 'error';
      phase: MongoRawQueryErrorPhase;
      message: string;
      diagnostic?: MongoRawQueryDiagnostic;
    };

const MONGO_RAW_QUERY_MESSAGE_TYPES = new Set<string>([
  'approval-required',
  'meta',
  'rows',
  'result',
  'log',
  'done',
  'error',
]);

export function isMongoRawQueryStreamMessage(
  value: unknown
): value is MongoRawQueryStreamMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && MONGO_RAW_QUERY_MESSAGE_TYPES.has(type);
}

export interface MongoRawQueryApprovalRequest {
  challengeId: string;
}

export interface MongoRawQueryApprovalResponse {
  approvalToken: string;
  expiresAt: string;
}

export interface MongoRawQueryAnalysis {
  wrappedSource: string;
  operations: MongoRawQueryOperation[];
  hasReturn: boolean;
  diagnostics: MongoRawQueryDiagnostic[];
}
```

This is a byte-for-byte copy of `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/core/types/mongodb-raw-query.types.ts`. Before moving on, diff your new file against the source to confirm:

```bash
diff /Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/core/types/mongodb-raw-query.types.ts core/types/mongodb-raw-query.types.ts
```

Expected: no output (files identical).

- [ ] **Step 2: Copy the core constants file verbatim**

Create `core/constants/mongodb-raw-query.ts`:

```ts
export const MONGO_RAW_QUERY_LIMITS = {
  maxDocuments: 10_000,
  maxValueBytes: 20 * 1024 * 1024,
  maxScriptBytes: 1024 * 1024,
  maxParamsBytes: 2 * 1024 * 1024,
  maxOperations: 100,
  maxOperationSummaryChars: 2_000,
} as const;

export const MONGO_RAW_QUERY_RESULT_DEFAULTS = {
  batchSize: 100,
} as const;
```

Verify: `diff /Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/core/constants/mongodb-raw-query.ts core/constants/mongodb-raw-query.ts` — expected: no output.

- [ ] **Step 3: Copy `server/utils/load-typescript.ts` verbatim**

Create `server/utils/load-typescript.ts`:

```ts
import { createRequire } from 'node:module';
import type * as TypeScript from 'typescript';

const require = createRequire(import.meta.url);

// TypeScript's Node system expects CommonJS globals such as __filename.
export const typeScriptCompiler = require('typescript') as typeof TypeScript;
```

Verify: `diff /Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/server/utils/load-typescript.ts server/utils/load-typescript.ts` — expected: no output.

- [ ] **Step 4: Copy the eight `server/infrastructure/nosql/mongodb/raw-query/*.ts` files verbatim**

For each of `index.ts`, `mongo-approval-registry.ts`, `mongo-capability-host.ts`, `mongo-operation-catalog.ts`, `mongo-raw-query-metadata.ts`, `mongo-raw-query.service.ts`, `mongo-script-policy.ts`, `mongo-script-runtime.ts`: read the file at
`/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/server/infrastructure/nosql/mongodb/raw-query/<name>` and create the identical file at
`server/infrastructure/nosql/mongodb/raw-query/<name>` in this repo. Do not alter their content — their only external dependency outside this new folder is `../mongodb.client` (`withMongoClient`, verified compatible in this task's Interfaces section), `~/core/constants/mongodb-raw-query`, `~/core/types/mongodb-raw-query.types`, `~/server/utils/load-typescript`, and ordinary npm packages (`mongodb`, `h3`, `node:crypto`, `typescript`) — all of which now exist after Steps 1–3.

After copying, verify each file is byte-identical to its source:

```bash
for f in index.ts mongo-approval-registry.ts mongo-capability-host.ts \
         mongo-operation-catalog.ts mongo-raw-query-metadata.ts \
         mongo-raw-query.service.ts mongo-script-policy.ts mongo-script-runtime.ts; do
  diff "/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/server/infrastructure/nosql/mongodb/raw-query/$f" \
       "server/infrastructure/nosql/mongodb/raw-query/$f"
done
```

Expected: no output for any file.

- [ ] **Step 5: Copy the three API routes verbatim**

For each of `raw-query-approve.post.ts`, `raw-query-metadata.post.ts`, `raw-query-stream.post.ts`: read
`/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/server/api/mongodb/<name>` and create the identical file at `server/api/mongodb/<name>`.

Verify:

```bash
for f in raw-query-approve.post.ts raw-query-metadata.post.ts raw-query-stream.post.ts; do
  diff "/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/server/api/mongodb/$f" \
       "server/api/mongodb/$f"
done
```

Expected: no output.

- [ ] **Step 6: Verify the `typescript` dependency and `bson` availability**

`server/utils/load-typescript.ts` calls `require('typescript')` at runtime inside a Nitro server handler (triggered by `mongo-script-runtime.ts`, which compiles/type-checks the user's script before execution). Check `package.json`:

```bash
grep -A2 '"dependencies"' package.json | head -5
python3 -c "
import json
p = json.load(open('package.json'))
print('typescript in dependencies:', 'typescript' in p.get('dependencies', {}))
print('typescript in devDependencies:', 'typescript' in p.get('devDependencies', {}))
"
```

If `typescript` is only in `devDependencies`, move it to `dependencies` in `package.json` (Nitro's server bundle needs it available at runtime, not just at build/typecheck time). Run `bun install` after editing `package.json` to confirm the lockfile updates cleanly.

Separately, confirm `bson` resolves (it is a transitive dependency of the `mongodb` package, and Task 2's `mongoEjson.ts` imports it directly):

```bash
ls node_modules/bson/package.json
```

Expected: the file exists. If it does not, add `"bson"` to `dependencies` at the version pinned by `node_modules/mongodb/node_modules/bson/package.json` (or the hoisted `node_modules/bson/package.json`) and run `bun install`.

- [ ] **Step 7: Run verification**

```bash
bun run typecheck
bun test:unit
```

Expected: both fully green. Nothing yet imports these new server files from client code, so this step is mainly confirming the copied files compile against this branch's existing server infrastructure (adapter factories, `DatabaseMetadataRequestParams`, etc.) with no missing-import errors.

- [ ] **Step 8: Report files for staging**

List every created file and the `package.json`/lockfile diff (if any). Do not run `git add`.

---

## Task 2: MongoDB-specific client logic — API client, utils, constants

**Files:**

- Create: `components/modules/driver/mongodb/raw-query/api/executeMongoRawQuery.ts`
- Create: `components/modules/driver/mongodb/raw-query/api/index.ts`
- Create: `components/modules/driver/mongodb/raw-query/utils/resolveMongoScriptSource.ts`
- Create: `components/modules/driver/mongodb/raw-query/utils/createMongoScriptCompletionSource.ts`
- Create: `components/modules/driver/mongodb/raw-query/utils/createMongoSuggestionInfo.ts`
- Create: `components/modules/driver/mongodb/raw-query/utils/formatMongoScript.ts`
- Create: `components/modules/driver/mongodb/raw-query/utils/mongoEjson.ts`
- Create: `components/modules/driver/mongodb/raw-query/utils/index.ts`
- Create: `components/modules/driver/mongodb/raw-query/constants/mongoScriptCatalog.ts`
- Create: `components/modules/driver/mongodb/raw-query/constants/index.ts`

**Interfaces:**

- Consumes: `core/types/mongodb-raw-query.types.ts` (Task 1); `formatMongoDisplayJson` from `~/components/modules/driver/mongodb/quick-query/utils/mongoEjsonUtils` (already exists on this branch — verified byte-identical to the copy `feat/support-mongodb-3` has at the old pre-split path `components/modules/quick-query/mongodb/utils/mongoEjsonUtils.ts`).
- Produces: `executeMongoRawQuery(options): MongoRawQueryExecution`, `approveMongoRawQuery(challengeId): Promise<MongoRawQueryApprovalResponse>` (consumed by Task 3's `useMongoScriptExecution`); `resolveMongoScriptSource(view: EditorView): { text: string; from: number; to: number }` (consumed by Task 7); `createMongoScriptCompletionSource(options)`, `getMongoScriptPlaceholder(databaseName?, collectionName?): string` (consumed by Task 3); `formatMongoScript(source: string): Promise<string>` (consumed by Task 7); `parseMongoEjsonVariables(source: string): Record<string, unknown>`, `serializeMongoEjson`, `formatMongoEjsonConsoleValue` (consumed by Tasks 3 and 4).

- [ ] **Step 1: Copy `executeMongoRawQuery.ts` and its barrel**

Create `components/modules/driver/mongodb/raw-query/api/executeMongoRawQuery.ts`:

```ts
import type {
  MongoRawQueryApprovalResponse,
  MongoRawQueryRequest,
  MongoRawQueryStreamMessage,
} from '~/core/types/mongodb-raw-query.types';
import { isMongoRawQueryStreamMessage } from '~/core/types/mongodb-raw-query.types';

export interface MongoRawQueryCallbacks {
  onMeta?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'meta' }>
  ) => void;
  onRows?: (rows: Record<string, unknown>[], totalRows: number) => void;
  onResult?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'result' }>
  ) => void;
  onLog?: (
    entry: Extract<MongoRawQueryStreamMessage, { type: 'log' }>['entry']
  ) => void;
  onApprovalRequired?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'approval-required' }>
  ) => void;
  onDone?: (
    message: Extract<MongoRawQueryStreamMessage, { type: 'done' }>
  ) => void;
  onError?: (
    error: Error,
    message?: Extract<MongoRawQueryStreamMessage, { type: 'error' }>
  ) => void;
}

export interface MongoRawQueryExecution {
  finished: Promise<void>;
  abort(): void;
}

export function executeMongoRawQuery(
  options: MongoRawQueryRequest & MongoRawQueryCallbacks
): MongoRawQueryExecution {
  const controller = new AbortController();
  const finished = (async () => {
    try {
      const response = await fetch('/api/mongodb/raw-query-stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(options),
        signal: controller.signal,
      });
      if (!response.ok || !response.body)
        throw new Error(`Mongo query failed (${response.status})`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rowCount = 0;
      const consume = (line: string) => {
        if (!line.trim()) return;
        let payload: unknown;
        try {
          payload = JSON.parse(line);
        } catch {
          options.onError?.(new Error('Malformed Mongo NDJSON event'));
          return;
        }
        if (!isMongoRawQueryStreamMessage(payload)) {
          options.onError?.(new Error('Unknown Mongo NDJSON event'));
          return;
        }
        if (payload.type === 'meta') options.onMeta?.(payload);
        else if (payload.type === 'rows') {
          rowCount += payload.data.length;
          options.onRows?.(payload.data, rowCount);
        } else if (payload.type === 'result') options.onResult?.(payload);
        else if (payload.type === 'log') options.onLog?.(payload.entry);
        else if (payload.type === 'approval-required')
          options.onApprovalRequired?.(payload);
        else if (payload.type === 'done') options.onDone?.(payload);
        else if (payload.type === 'error')
          options.onError?.(new Error(payload.message), payload);
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      consume(buffer);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      options.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  })();
  return { finished, abort: () => controller.abort() };
}

export async function approveMongoRawQuery(
  challengeId: string
): Promise<MongoRawQueryApprovalResponse> {
  const response = await fetch('/api/mongodb/raw-query-approve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId }),
  });
  if (!response.ok)
    throw new Error(`Mongo approval failed (${response.status})`);
  return response.json() as Promise<MongoRawQueryApprovalResponse>;
}
```

This is a byte-for-byte copy of `.../OrcaQ-mongodb-3/components/modules/raw-query/mongo/api/executeMongoRawQuery.ts`. Verify with `diff`.

Create `components/modules/driver/mongodb/raw-query/api/index.ts`:

```ts
export * from './executeMongoRawQuery';
```

- [ ] **Step 2: Copy `mongoEjson.ts` with one import-path fix**

Create `components/modules/driver/mongodb/raw-query/utils/mongoEjson.ts`:

```ts
import { EJSON } from 'bson';
import { formatMongoDisplayJson } from '~/components/modules/driver/mongodb/quick-query/utils/mongoEjsonUtils';

export function parseMongoEjsonVariables(
  source: string
): Record<string, unknown> {
  const value = EJSON.parse(source || '{}', { relaxed: false });
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Mongo variables must be an Extended JSON object');
  }
  return value as Record<string, unknown>;
}

export function serializeMongoEjson(value: unknown): unknown {
  return EJSON.serialize(value, { relaxed: false });
}

export function formatMongoEjsonConsoleValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (typeof value === 'bigint') return `${value}n`;

  try {
    return formatMongoDisplayJson(serializeMongoEjson(value), 0);
  } catch {
    return String(value);
  }
}
```

The only change from the source file is the import path: `~/components/modules/quick-query/mongodb/utils/mongoEjsonUtils` (the old, pre-quick-query-split location on `feat/support-mongodb-3`) becomes `~/components/modules/driver/mongodb/quick-query/utils/mongoEjsonUtils` (this branch's current location — already verified to exist and be byte-identical in content).

- [ ] **Step 3: Copy `resolveMongoScriptSource.ts` verbatim**

Create `components/modules/driver/mongodb/raw-query/utils/resolveMongoScriptSource.ts`:

```ts
import type { EditorView } from '@codemirror/view';

export function resolveMongoScriptSource(view: EditorView) {
  const text = view.state.doc.toString();
  return { text, from: 0, to: text.length };
}
```

- [ ] **Step 4: Copy `formatMongoScript.ts` verbatim**

Create `components/modules/driver/mongodb/raw-query/utils/formatMongoScript.ts`:

```ts
const mongoPrettierOptions = {
  parser: 'typescript',
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
} as const;

/** Formats a Mongo raw-query script with the project's TypeScript style. */
export async function formatMongoScript(source: string): Promise<string> {
  const [prettier, typescript, estree] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/typescript'),
    import('prettier/plugins/estree'),
  ]);

  return prettier.format(source, {
    ...mongoPrettierOptions,
    plugins: [typescript.default, estree.default],
  });
}
```

Verify `prettier` is a dependency (`grep '"prettier"' package.json`) — it already is, used by `bun run format`.

- [ ] **Step 5: Copy `mongoScriptCatalog.ts` and `createMongoSuggestionInfo.ts` verbatim**

Read `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/constants/mongoScriptCatalog.ts` in full (it is long — a catalog of `MongoScriptCatalogEntry[]` snippets grouped by category, plus `MONGO_SCRIPT_PLACEHOLDER` and `export const getMongoScriptPlaceholder = (databaseName?: string, collectionName?: string) => ...`). Copy it byte-for-byte to `components/modules/driver/mongodb/raw-query/constants/mongoScriptCatalog.ts` — it has no relative imports, only its own type declarations, so nothing needs rewriting.

Read `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/utils/createMongoSuggestionInfo.ts` in full and copy it byte-for-byte to `components/modules/driver/mongodb/raw-query/utils/createMongoSuggestionInfo.ts`. Its only relative import, `'../constants/mongoScriptCatalog'`, resolves unchanged because both files move into the same relative position under the new root.

Verify both:

```bash
diff /Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/constants/mongoScriptCatalog.ts \
     components/modules/driver/mongodb/raw-query/constants/mongoScriptCatalog.ts
diff /Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/utils/createMongoSuggestionInfo.ts \
     components/modules/driver/mongodb/raw-query/utils/createMongoSuggestionInfo.ts
```

Expected: no output for either.

- [ ] **Step 6: Copy `createMongoScriptCompletionSource.ts` verbatim**

Read `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/utils/createMongoScriptCompletionSource.ts` in full and copy it byte-for-byte to `components/modules/driver/mongodb/raw-query/utils/createMongoScriptCompletionSource.ts`. Its relative imports (`'../constants/mongoScriptCatalog'`, `'./createMongoSuggestionInfo'`) resolve unchanged.

Verify: `diff` against the source — expected no output.

- [ ] **Step 7: Write the barrels**

Create `components/modules/driver/mongodb/raw-query/utils/index.ts`:

```ts
export * from './resolveMongoScriptSource';
export * from './createMongoScriptCompletionSource';
export * from './createMongoSuggestionInfo';
export * from './formatMongoScript';
export * from './mongoEjson';
```

Create `components/modules/driver/mongodb/raw-query/constants/index.ts`:

```ts
export * from './mongoScriptCatalog';
```

- [ ] **Step 8: Run verification**

```bash
bun run typecheck
bun test:unit
```

Expected: both fully green.

- [ ] **Step 9: Report files for staging**

---

## Task 3: MongoDB-specific hooks — metadata, editor extensions, execution, approval

**Files:**

- Create: `components/modules/driver/mongodb/raw-query/hooks/useMongoScriptMetadata.ts`
- Create: `components/modules/driver/mongodb/raw-query/hooks/useMongoScriptEditorExtensions.ts`
- Create: `components/modules/driver/mongodb/raw-query/hooks/useMongoApproval.ts`
- Create: `components/modules/driver/mongodb/raw-query/hooks/useMongoScriptExecution.ts`
- Create: `components/modules/driver/mongodb/raw-query/hooks/index.ts`
- Test: `test/nuxt/components/modules/driver/mongodb/raw-query/useMongoApproval.test.ts`

**Interfaces:**

- Consumes: `executeMongoRawQuery`, `approveMongoRawQuery` (Task 2 `api/`); `parseMongoEjsonVariables` (Task 2 `utils/`); `getMongoScriptPlaceholder`, `createMongoScriptCompletionSource` (Task 2); `ViewMode`, `ExecutedResultItem` (Task 5 extends these — this task's `useMongoScriptExecution.ts` relies on the `metadata.resultKind`/`metadata.logs`/`metadata.mutationSummary`/`metadata.rawResult` fields Task 5 adds).
- Produces: `useMongoScriptMetadata(options): { metadata, metadataByDatabase, databases, isLoading, error, refresh, ensureDatabaseMetadata, metadataForDatabase }`; `useMongoScriptEditorExtensions(options): { extensions: Extension[], reloadMongoCompartment: () => undefined }`; `useMongoApproval(): MongoApprovalState` (module-level singleton state, matching the source); `useMongoScriptExecution(options): { execute, cancel, pendingApproval, confirmPendingWrite, cancelPendingWrite, queryProcessState, currentRawQueryResult, rawResponse }` — all consumed by Task 7's `MongoRawQuery.vue`.

- [ ] **Step 1: Copy `useMongoApproval.ts` verbatim**

Create `components/modules/driver/mongodb/raw-query/hooks/useMongoApproval.ts`:

```ts
import { ref, type Ref } from 'vue';
import type { MongoRawQueryOperation } from '~/core/types/mongodb-raw-query.types';

export interface MongoPendingApproval {
  challengeId: string;
  operations: MongoRawQueryOperation[];
}

export interface MongoApprovalHandlers {
  confirm: () => Promise<unknown>;
  cancel: () => void;
}

export interface MongoApprovalState {
  pendingApproval: Ref<MongoPendingApproval | null>;
  isConfirming: Ref<boolean>;
  setPendingApproval: (approval: MongoPendingApproval | null) => void;
  registerApprovalHandlers: (handlers: MongoApprovalHandlers) => void;
  confirmPendingWrite: () => Promise<unknown>;
  cancelPendingWrite: () => void;
  resetApproval: () => void;
}

const pendingApproval = ref<MongoPendingApproval | null>(null);
const isConfirming = ref(false);
let activeHandlers: MongoApprovalHandlers | null = null;

export function useMongoApproval(): MongoApprovalState {
  const setPendingApproval = (approval: MongoPendingApproval | null) => {
    pendingApproval.value = approval;
  };

  const registerApprovalHandlers = (handlers: MongoApprovalHandlers) => {
    activeHandlers = handlers;
  };

  const confirmPendingWrite = async () => {
    if (!activeHandlers || !pendingApproval.value) return;
    isConfirming.value = true;
    try {
      await activeHandlers.confirm();
    } finally {
      isConfirming.value = false;
    }
  };

  const cancelPendingWrite = () => {
    if (activeHandlers) {
      activeHandlers.cancel();
    } else {
      pendingApproval.value = null;
    }
  };

  const resetApproval = () => {
    pendingApproval.value = null;
    isConfirming.value = false;
    activeHandlers = null;
  };

  return {
    pendingApproval,
    isConfirming,
    setPendingApproval,
    registerApprovalHandlers,
    confirmPendingWrite,
    cancelPendingWrite,
    resetApproval,
  };
}
```

Note: `pendingApproval`, `isConfirming`, and `activeHandlers` are module-level (not created fresh per call) — this is intentional in the source and preserved here; every caller of `useMongoApproval()` shares the same pending-approval state, which is what lets `MongoRawQuery.vue`'s approval dialog and `useMongoScriptExecution`'s internal approval wiring agree on the same pending challenge without prop-drilling.

- [ ] **Step 2: Write a test pinning the module-level singleton behavior**

Create `test/nuxt/components/modules/driver/mongodb/raw-query/useMongoApproval.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { useMongoApproval } from '~/components/modules/driver/mongodb/raw-query/hooks';

describe('useMongoApproval', () => {
  it('shares pending-approval state across every call site', () => {
    const first = useMongoApproval();
    const second = useMongoApproval();

    first.setPendingApproval({ challengeId: 'c1', operations: [] });

    expect(second.pendingApproval.value).toEqual({
      challengeId: 'c1',
      operations: [],
    });

    first.resetApproval();
  });

  it('confirmPendingWrite calls the registered confirm handler', async () => {
    const state = useMongoApproval();
    const confirm = vi.fn().mockResolvedValue('ok');
    const cancel = vi.fn();
    state.registerApprovalHandlers({ confirm, cancel });
    state.setPendingApproval({ challengeId: 'c2', operations: [] });

    await state.confirmPendingWrite();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state.isConfirming.value).toBe(false);

    state.resetApproval();
  });

  it('cancelPendingWrite calls the registered cancel handler', () => {
    const state = useMongoApproval();
    const confirm = vi.fn();
    const cancel = vi.fn();
    state.registerApprovalHandlers({ confirm, cancel });
    state.setPendingApproval({ challengeId: 'c3', operations: [] });

    state.cancelPendingWrite();

    expect(cancel).toHaveBeenCalledTimes(1);

    state.resetApproval();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/useMongoApproval.test.ts`
Expected: FAIL — cannot resolve `~/components/modules/driver/mongodb/raw-query/hooks` (the barrel does not exist yet).

- [ ] **Step 4: Copy `useMongoScriptEditorExtensions.ts` verbatim**

Create `components/modules/driver/mongodb/raw-query/hooks/useMongoScriptEditorExtensions.ts`:

```ts
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { lintGutter, linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { keymap, placeholder } from '@codemirror/view';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { sqlAutoCompletion } from '~/components/base/code-editor/extensions';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';
import { getMongoScriptPlaceholder } from '../constants/mongoScriptCatalog';
import { createMongoScriptCompletionSource } from '../utils/createMongoScriptCompletionSource';

export function useMongoScriptEditorExtensions(options: {
  codeEditorRef: Ref<InstanceType<typeof BaseCodeEditor> | null>;
  fileVariables: Ref<string>;
  databaseName?: Ref<string | undefined>;
  collectionContext?: Ref<string | undefined>;
  metadata?: Ref<MongoRawQueryMetadata>;
  databases?: Ref<string[]>;
  metadataByDatabase?: Ref<Record<string, MongoRawQueryMetadata>>;
  ensureDatabaseMetadata?: (databaseName: string) => void | Promise<unknown>;
  onExecuteCurrent: () => void | Promise<void>;
  onFormat: () => void | Promise<void>;
}) {
  const completionSource = createMongoScriptCompletionSource({
    getMetadata: databaseName =>
      options.metadataByDatabase?.value[databaseName ?? ''] ??
      options.metadata?.value ?? {
        collections: [],
        fieldsByCollection: {},
      },
    databases: () => options.databases?.value ?? [],
    fileVariables: () => options.fileVariables.value,
    ensureDatabaseMetadata: options.ensureDatabaseMetadata,
  });

  const extensions: Extension[] = [
    javascript({ typescript: true }),
    placeholder(
      getMongoScriptPlaceholder(
        options.databaseName?.value,
        options.collectionContext?.value
      )
    ),
    ...sqlAutoCompletion({
      override: [completionSource],
    }),
    lintGutter(),
    linter(view =>
      view.state.doc.toString().includes('return')
        ? []
        : [
            {
              from: 0,
              to: 0,
              severity: 'info',
              message: 'Add a top-level return to publish a value.',
            },
          ]
    ),
    keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          void options.onExecuteCurrent();
          return true;
        },
      },
      {
        key: 'Mod-s',
        run: () => {
          void options.onFormat();
          return true;
        },
      },
      { key: 'Mod-i', run: startCompletion },
      { key: 'Tab', run: acceptCompletion },
    ]),
  ];
  return { extensions, reloadMongoCompartment: () => undefined };
}
```

No relative import changes needed — `../constants/mongoScriptCatalog` and `../utils/createMongoScriptCompletionSource` resolve identically in the new location. `Mod-Enter` is bound directly to `onExecuteCurrent` here — MongoDB's editor does not go through the shared `shortCutExecuteCurrentStatement` extension the SQL/Redis path uses, matching the "own pipeline" decision.

- [ ] **Step 5: Copy `useMongoScriptMetadata.ts` with the database-listing endpoint adapted**

Create `components/modules/driver/mongodb/raw-query/hooks/useMongoScriptMetadata.ts`:

```ts
import { computed, ref, watch, type Ref } from 'vue';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/types/entities/connection.entity';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';

const metadataCache = new Map<string, MongoRawQueryMetadata>();
const databaseCache = new Map<string, string[]>();
const pendingMetadataKeys = new Set<string>();
const pendingDatabaseKeys = new Set<string>();

export function useMongoScriptMetadata(options: {
  connection: Ref<Connection | undefined>;
  databaseName?: Ref<string | undefined>;
  collectionContext?: Ref<string | undefined>;
}) {
  const metadata = ref<MongoRawQueryMetadata>({
    collections: [],
    fieldsByCollection: {},
  });
  const metadataByDatabase = ref<Record<string, MongoRawQueryMetadata>>({});
  const databases = ref<string[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const connectionKey = computed(() => options.connection.value?.id ?? '');
  const databaseKey = (databaseName: string) =>
    `${connectionKey.value}:${databaseName}`;

  const fetchDatabaseNames = async () => {
    if (!connectionKey.value) return;
    const cached = databaseCache.get(connectionKey.value);
    if (cached) {
      databases.value = cached;
      return;
    }
    if (pendingDatabaseKeys.has(connectionKey.value)) return;
    pendingDatabaseKeys.add(connectionKey.value);
    try {
      const response = await $fetch<{
        databases: Array<{ database: string }>;
      }>('/api/mongodb/schemas', {
        method: 'POST',
        body: getConnectionParams(options.connection.value),
      });
      const names = [...response.databases.map(item => item.database)].sort(
        (a, b) => a.localeCompare(b)
      );
      databaseCache.set(connectionKey.value, names);
      databases.value = names;
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
    } finally {
      pendingDatabaseKeys.delete(connectionKey.value);
    }
  };

  const ensureDatabaseMetadata = async (databaseName: string) => {
    if (!connectionKey.value || !databaseName) return;
    const key = databaseKey(databaseName);
    const cached = metadataCache.get(key);
    if (cached) {
      metadataByDatabase.value = {
        ...metadataByDatabase.value,
        [databaseName]: cached,
      };
      return cached;
    }
    if (pendingMetadataKeys.has(key)) return;
    pendingMetadataKeys.add(key);
    isLoading.value = true;
    error.value = null;
    try {
      const value = await $fetch<MongoRawQueryMetadata>(
        '/api/mongodb/raw-query-metadata',
        {
          method: 'POST',
          body: {
            connectionId: options.connection.value!.id,
            ...getConnectionParams(options.connection.value),
            database: databaseName,
            collectionContext:
              options.databaseName?.value &&
              databaseName === options.databaseName.value
                ? options.collectionContext?.value
                : undefined,
          },
        }
      );
      metadataCache.set(key, value);
      metadataByDatabase.value = {
        ...metadataByDatabase.value,
        [databaseName]: value,
      };
      if (
        options.databaseName?.value &&
        databaseName === options.databaseName.value
      )
        metadata.value = value;
      return value;
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
    } finally {
      pendingMetadataKeys.delete(key);
      isLoading.value = false;
    }
  };

  const refresh = async () => {
    await fetchDatabaseNames();
    if (!options.databaseName?.value) return;
    const value = await ensureDatabaseMetadata(options.databaseName.value);
    if (value) metadata.value = value;
  };

  const metadataForDatabase = (databaseName?: string) => {
    if (!databaseName) return metadata.value;
    return (
      metadataByDatabase.value[databaseName] ?? {
        collections: [],
        fieldsByCollection: {},
      }
    );
  };

  watch(
    connectionKey,
    () => {
      metadataByDatabase.value = {};
      metadata.value = { collections: [], fieldsByCollection: {} };
      databases.value = [];
      void refresh();
    },
    { immediate: true }
  );

  watch(
    () => [options.databaseName?.value, options.collectionContext?.value],
    () => {
      void refresh();
    }
  );

  return {
    metadata,
    metadataByDatabase,
    databases,
    isLoading,
    error,
    refresh,
    ensureDatabaseMetadata,
    metadataForDatabase,
  };
}
```

**Deviation from the source, deliberate:** `fetchDatabaseNames` calls `/api/mongodb/schemas` (this branch's existing database-listing route, already used by `driver/mongodb/quick-query/hooks/useMongoServerDatabases.ts`, returning `{ databases: Array<{ database: string }> }`) instead of `/api/mongodb/databases` (a route `feat/support-mongodb-3` added specifically for this hook, returning `{ databases: string[] }`, which does not exist on this branch and would duplicate an endpoint this branch already has under a different name). The response is mapped (`response.databases.map(item => item.database)`) to produce the same `string[]` the rest of the hook expects — every other line is unchanged from the source.

- [ ] **Step 6: Copy `useMongoScriptExecution.ts` with debug logging removed and `as any` casts eliminated**

Create `components/modules/driver/mongodb/raw-query/hooks/useMongoScriptExecution.ts`:

```ts
import { reactive, ref, shallowRef, type Ref } from 'vue';
import type { FieldDef } from 'pg';
import type { ResultTabsReturn } from '~/components/modules/raw-query/hooks';
import {
  ViewMode,
  type ExecutedResultItem,
} from '~/components/modules/raw-query/interfaces';
import { uuidv4 } from '~/core/helpers';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import { approveMongoRawQuery, executeMongoRawQuery } from '../api';
import { useMongoApproval } from './useMongoApproval';

export function useMongoScriptExecution(options: {
  connection: Ref<Connection | undefined>;
  databaseName?: Ref<string | undefined>;
  collectionContext?: Ref<string | undefined>;
  documentText: Ref<string>;
  fileVariables: Ref<string>;
  fieldDefs?: Ref<FieldDef[]>;
  resultTabs: ResultTabsReturn;
  beforeExecute?: () => Promise<boolean>;
}) {
  const approval = useMongoApproval();
  const currentRawQueryResult = shallowRef<Record<string, unknown>[]>([]);
  const rawResponse = shallowRef<Record<string, unknown>>({});
  const activeExecution = shallowRef<ReturnType<
    typeof executeMongoRawQuery
  > | null>(null);
  const queryProcessState = reactive({
    isHaveOneExecute: false,
    executeLoading: false,
    isStreaming: false,
    streamingRowCount: 0,
    queryTime: 0,
    executeErrors: undefined as ExecutedResultItem['metadata']['executeErrors'],
    currentStatementQuery: '',
  });
  let sequence = 0;
  let pendingSource: { text: string; from: number; to: number } | null = null;

  const execute = async (
    source?: { text: string; from: number; to: number },
    approvalToken?: string
  ) => {
    if (!options.connection.value) return;

    if (options.beforeExecute) {
      const canExecute = await options.beforeExecute();
      if (!canExecute) return;
    }

    let params: Record<string, unknown> = {};
    try {
      params = parseMongoEjsonVariables(options.fileVariables.value);
    } catch {
      throw new Error('Mongo variables must be valid Extended JSON');
    }
    const resolvedSource = source ?? {
      text: options.documentText.value,
      from: 0,
      to: options.documentText.value.length,
    };

    pendingSource = resolvedSource;
    sequence += 1;
    const item: ExecutedResultItem = {
      id: uuidv4(),
      metadata: {
        queryTime: 0,
        statementQuery: resolvedSource.text,
        executedAt: new Date(),
        executeErrors: undefined,
        connection: options.connection.value,
        command: 'MONGODB',
        rowCount: 0,
        resultKind: 'cursor',
      },
      result: [],
      seqIndex: sequence,
      view: ViewMode.RESULT,
    };
    options.resultTabs.addResultTab(item);
    const rows: Record<string, unknown>[] = [];
    queryProcessState.executeLoading = true;
    const connParams = getConnectionParams(options.connection.value);
    activeExecution.value = executeMongoRawQuery({
      ...connParams,
      connectionId: options.connection.value.id,
      database: options.databaseName?.value,
      collectionContext: options.collectionContext?.value,
      script: resolvedSource.text,
      params,
      approvalToken,
      onMeta: message => {
        item.metadata.resultKind = message.resultKind;
        if (options.fieldDefs) {
          options.fieldDefs.value = message.fields as FieldDef[];
        }
        item.metadata.fieldDefs = message.fields as FieldDef[];
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onRows: (batch, total) => {
        rows.push(...batch);
        item.result = rows;
        item.metadata.rowCount = total;
        queryProcessState.streamingRowCount = total;
        currentRawQueryResult.value = rows;
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onLog: entry => {
        item.metadata.logs ??= [];
        item.metadata.logs.push(entry);
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onResult: message => {
        item.metadata.rawResult = message.data;
        item.result = Array.isArray(message.data)
          ? (message.data as Record<string, unknown>[])
          : [{ value: message.data }];
        rawResponse.value = message.data as Record<string, unknown>;
        if (message.mutationSummary)
          item.metadata.mutationSummary = message.mutationSummary;
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onApprovalRequired: message => {
        approval.setPendingApproval(message);
        queryProcessState.executeLoading = false;
      },
      onDone: message => {
        queryProcessState.executeLoading = false;
        queryProcessState.isStreaming = false;
        queryProcessState.queryTime = message.queryTime;
        item.metadata.queryTime = message.queryTime;
        item.metadata.truncated = message.truncated;
        item.metadata.rowCount = message.rowCount;
        options.resultTabs.refreshResultTab(item.id, item);
      },
      onError: error => {
        queryProcessState.executeLoading = false;
        item.metadata.executeErrors = {
          message: error.message,
          data: { message: error.message },
        };
        item.view = ViewMode.ERROR;
        options.resultTabs.refreshResultTab(item.id, item);
      },
    });
    await activeExecution.value.finished;
  };
  const confirmPendingWrite = async () => {
    if (!approval.pendingApproval.value || !pendingSource) return;
    const approvalRes = await approveMongoRawQuery(
      approval.pendingApproval.value.challengeId
    );
    const source = pendingSource;
    approval.setPendingApproval(null);
    await execute(source, approvalRes.approvalToken);
    return approvalRes;
  };
  const cancelPendingWrite = () => {
    approval.setPendingApproval(null);
    pendingSource = null;
  };

  approval.registerApprovalHandlers({
    confirm: confirmPendingWrite,
    cancel: cancelPendingWrite,
  });

  const cancel = () => {
    activeExecution.value?.abort();
    activeExecution.value = null;
    queryProcessState.executeLoading = false;
    queryProcessState.isStreaming = false;
    cancelPendingWrite();
  };
  return {
    execute,
    cancel,
    pendingApproval: approval.pendingApproval,
    confirmPendingWrite,
    cancelPendingWrite,
    queryProcessState,
    currentRawQueryResult,
    rawResponse,
  };
}
```

Note the missing `import { parseMongoEjsonVariables } from '../utils/mongoEjson';` in the block above — add it back explicitly alongside the other imports (it was omitted here only to keep the diff-against-source annotations legible below; the file must import it or `parseMongoEjsonVariables` will be undefined).

**Deviations from the source, deliberate:**

1. Every `console.log`/`console.warn` debug statement present in the source's `execute` function (six of them) is removed — they were development-time tracing left in by mistake, not intended behavior.
2. `as any` on the `metadata` object literal (source line `} as any,`) and on `message.fields as any` (two occurrences), `message.data as any`, and `message.data as any` in `rawResponse.value` are replaced with concrete types (`FieldDef[]`, `Record<string, unknown>[]`, `Record<string, unknown>`) — made possible by Task 5 extending `ExecutedResultItem['metadata']` with `resultKind`, `logs`, `mutationSummary`, `rawResult` as real optional fields instead of relying on an `any`-typed object literal to sidestep the interface.
3. `resultTabs: any` in the options type becomes `resultTabs: ResultTabsReturn`, imported from `~/components/modules/raw-query/hooks` (the same type `useResultTabs()` returns, which `MongoRawQuery.vue` will pass in).

Everything else — the execution flow, the approval retry path, the abort/cancel semantics — is unchanged.

- [ ] **Step 7: Add the missing import and write the barrel**

In the file from Step 6, add `import { parseMongoEjsonVariables } from '../utils/mongoEjson';` to the import block (after the `approveMongoRawQuery, executeMongoRawQuery` import).

Create `components/modules/driver/mongodb/raw-query/hooks/index.ts`:

```ts
export * from './useMongoScriptMetadata';
export * from './useMongoScriptEditorExtensions';
export * from './useMongoScriptExecution';
export * from './useMongoApproval';
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/useMongoApproval.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Run verification**

```bash
bun run typecheck
bun test:unit
```

Expected: both fully green. `bun run typecheck` is the meaningful check here for the `as any` removals in Step 6 — if `ExecutedResultItem['metadata']` does not yet have the fields this file assigns (`resultKind`, `logs`, `mutationSummary`, `rawResult`, `truncated`), it will fail. **This task depends on Task 5's core type extension being done first** — if you are executing tasks in numeric order, do Task 5 before Task 3's Step 6, or come back and re-run this verification after Task 5 lands.

- [ ] **Step 10: Report files for staging**

---

## Task 4: MongoDB-specific components — console, approval dialog, result view, guide popover

**Files:**

- Create: `components/modules/driver/mongodb/raw-query/components/MongoRawQueryConsole.vue`
- Create: `components/modules/driver/mongodb/raw-query/components/MongoRawQueryApprovalDialog.vue`
- Create: `components/modules/driver/mongodb/raw-query/components/MongoRawQueryResultView.vue`
- Create: `components/modules/driver/mongodb/raw-query/components/MongoRawQueryVariableUsageGuidePopover.vue`
- Create: `components/modules/driver/mongodb/raw-query/components/index.ts`
- Test: `test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQueryResultView.test.ts`

**Interfaces:**

- Consumes: `formatMongoEjsonConsoleValue` (Task 2); `MongoRawQueryLogEntry`, `MongoRawQueryOperation` (Task 1); `MongoPendingApproval` (Task 3's `useMongoApproval`); `MongoCollectionListView.vue` from `~/components/modules/driver/mongodb/quick-query/components/MongoCollectionListView.vue` (already exists on this branch).
- Produces: `MongoRawQueryConsole` (props `{ logs?: MongoRawQueryLogEntry[] }`), `MongoRawQueryApprovalDialog` (props `{ open: boolean; loading?: boolean; operations: MongoRawQueryOperation[] }`, emits `confirm`/`cancel`), `MongoRawQueryResultView` (props `{ documents: Record<string, unknown>[] }`), `MongoRawQueryVariableUsageGuidePopover` (no props) — all consumed by Task 7's `MongoRawQuery.vue`.

- [ ] **Step 1: Copy `MongoRawQueryConsole.vue` with one import-path fix**

First confirm `@tanstack/vue-virtual` is a dependency: `grep '"@tanstack/vue-virtual"' package.json` (it already is, version `^3.13.12`).

Create `components/modules/driver/mongodb/raw-query/components/MongoRawQueryConsole.vue` by reading `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue` in full and copying it byte-for-byte, changing only its one relative import from `'../utils/mongoEjson'` — this stays `'../utils/mongoEjson'` since the file's position relative to `utils/` is unchanged (`components/` and `utils/` are still siblings one level under the new `driver/mongodb/raw-query/` root, exactly as they were siblings under the old `raw-query/mongo/` root). No import text actually changes in this file; copy it verbatim.

Verify: `diff /Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue components/modules/driver/mongodb/raw-query/components/MongoRawQueryConsole.vue` — expected no output.

- [ ] **Step 2: Copy `MongoRawQueryApprovalDialog.vue` verbatim**

Create `components/modules/driver/mongodb/raw-query/components/MongoRawQueryApprovalDialog.vue`:

```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MongoRawQueryOperation } from '~/core/types/mongodb-raw-query.types';

defineProps<{
  open: boolean;
  loading?: boolean;
  operations: MongoRawQueryOperation[];
}>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <Dialog :open="open" @update:open="!$event && emit('cancel')" v-if="open">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"
          ><Icon name="hugeicons:alert-02" class="size-5 text-amber-500" />
          Confirm MongoDB write</DialogTitle
        >
        <DialogDescription
          >This script will perform the following
          operation(s).</DialogDescription
        >
      </DialogHeader>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="operation in operations"
          :key="operation.id"
          class="rounded border p-2 text-sm"
        >
          <div class="flex items-center gap-2">
            <code>{{ operation.method }}</code
            ><span v-if="operation.database" class="text-muted-foreground"
              >in {{ operation.database }}</span
            ><span v-if="operation.collection" class="text-muted-foreground"
              >on {{ operation.collection }}</span
            ><Badge variant="destructive">{{ operation.risk }}</Badge>
          </div>
          <div class="text-xs text-muted-foreground mt-1 break-words">
            {{ operation.summary }}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('cancel')">Cancel</Button>
        <Button
          data-testid="confirm-mongo-raw-write"
          :disabled="loading"
          @click="emit('confirm')"
          >Confirm and run</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

Verify: `diff` against the source — expected no output. Confirm `Badge` and `Icon` are globally auto-imported on this branch the same way (they are — used the same way throughout `components/modules/raw-query/`).

- [ ] **Step 3: Port a simplified `MongoRawQueryResultView.vue`**

The source (`.../OrcaQ-mongodb-3/components/modules/raw-query/mongo/components/MongoRawQueryResultView.vue`) takes a `context: RawQueryContext<MongoDialectState>` prop from the abandoned plugin architecture and embeds the approval dialog inside the result view itself. Neither is needed here: this design puts the approval dialog at the container level (`MongoRawQuery.vue`, Task 7), the same place `RawQueryConnectionConfirmDialog` sits today, and there is no `RawQueryContext` on this branch.

Create `components/modules/driver/mongodb/raw-query/components/MongoRawQueryResultView.vue`:

```vue
<script setup lang="ts">
import MongoCollectionListView from '~/components/modules/driver/mongodb/quick-query/components/MongoCollectionListView.vue';
import type { MongoDocument } from '~/components/modules/driver/mongodb/quick-query/types';

defineProps<{
  documents: MongoDocument[];
}>();
</script>

<template>
  <BaseEmpty
    v-if="!documents.length"
    title="No Results"
    desc="The script returned no documents."
    class="h-full"
  />

  <MongoCollectionListView v-else :documents="documents" class="h-full" />
</template>
```

Before finalizing this file, read `~/components/modules/driver/mongodb/quick-query/components/MongoCollectionListView.vue`'s full `defineProps` and `MongoDocument`'s definition (`~/components/modules/driver/mongodb/quick-query/types`) — its prop list has diverged from what `feat/support-mongodb-3` called it with (`is-read-only` and `get-document-label` do not appear in this branch's current props; only `documents`, `savingDocId`, `deletingDocId` were visible in a partial read during design). Adjust the props passed above to match exactly what the component takes today, and drop any prop this version does not support. If `MongoCollectionListView` requires `savingDocId`/`deletingDocId` (even as optional), leave them unset — Mongo raw-query results are read-only display, not edited in place.

- [ ] **Step 4: Write a test for the simplified result view**

Create `test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQueryResultView.test.ts`:

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import MongoRawQueryResultView from '~/components/modules/driver/mongodb/raw-query/components/MongoRawQueryResultView.vue';

describe('MongoRawQueryResultView', () => {
  it('shows the empty state when there are no documents', async () => {
    const wrapper = await mountSuspended(MongoRawQueryResultView, {
      props: { documents: [] },
    });

    expect(wrapper.text()).toContain('No Results');
  });

  it('renders the document list when there are documents', async () => {
    const wrapper = await mountSuspended(MongoRawQueryResultView, {
      props: { documents: [{ _id: '1', name: 'a' }] },
      global: {
        stubs: {
          MongoCollectionListView: {
            template: '<div data-testid="mongo-doc-list" />',
            props: ['documents'],
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="mongo-doc-list"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('No Results');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails, then implement, then pass**

Run: `bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQueryResultView.test.ts`
Expected first: FAIL (module not found). After Step 3's file exists: PASS, 2 tests.

- [ ] **Step 6: Copy `MongoRawQueryVariableUsageGuidePopover.vue` verbatim**

Read `/Volumes/Cinny/Cinny/Project/orca-q-projects/OrcaQ-mongodb-3/components/modules/raw-query/mongo/components/MongoRawQueryVariableUsageGuidePopover.vue` in full (a self-contained popover — Tooltip/Popover trigger plus static documentation content, no props, no external state) and copy it byte-for-byte to `components/modules/driver/mongodb/raw-query/components/MongoRawQueryVariableUsageGuidePopover.vue`. It has no relative imports to rewrite.

Verify: `diff` against the source — expected no output.

- [ ] **Step 7: Write the barrel**

Create `components/modules/driver/mongodb/raw-query/components/index.ts`:

```ts
export { default as MongoRawQueryApprovalDialog } from './MongoRawQueryApprovalDialog.vue';
export { default as MongoRawQueryConsole } from './MongoRawQueryConsole.vue';
export { default as MongoRawQueryResultView } from './MongoRawQueryResultView.vue';
export { default as MongoRawQueryVariableUsageGuidePopover } from './MongoRawQueryVariableUsageGuidePopover.vue';
```

Note what is intentionally **not** in this folder: `RawQueryMongoHeaderBadge.vue` (a `RawQueryContext.dialectState` demo component — "MongoDB Beta (clicks: N)" — with no product behavior, tied entirely to the abandoned plugin architecture), `RawQueryMongoExecuteAction.vue` (its Execute/Cancel buttons duplicate the shared `RawQueryEditorFooter`'s built-in Execute button and `onCancelQuery` emit, which Task 7 wires directly), and `RawQueryMongoFormatAction.vue` (its "Format script" button duplicates the shared footer's built-in Format button, which Task 7 enables via `isSupportFormat` and wires to `formatMongoScript`).

- [ ] **Step 8: Run verification**

```bash
bun run typecheck
bun test:unit
bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQueryResultView.test.ts
bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/useMongoApproval.test.ts
```

Expected: all green.

- [ ] **Step 9: Report files for staging**

---

## Task 5: Core additions — `ViewMode.CONSOLE` and extended `ExecutedResultItem` metadata

**Files:**

- Modify: `components/modules/raw-query/interfaces/index.ts`
- Test: `test/unit/components/modules/raw-query/interfaces/viewMode.spec.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `ViewMode.CONSOLE = 'console'`; `ExecutedResultItem['metadata']` gains `resultKind?: string`, `logs?: MongoRawQueryLogEntry[]`, `mutationSummary?: MongoRawQueryMutationSummary`, `rawResult?: unknown`, `truncated?: boolean` — all optional, consumed by Task 3's `useMongoScriptExecution.ts`.

This is the one core change with any real design content: it is purely additive (new enum member, new optional interface fields), and none of it is read by any conditional in the core — the guard test in `coreHasNoEngineKnowledge.spec.ts` checks for `DatabaseClientType` usage and driver imports, neither of which this task introduces.

- [ ] **Step 1: Write a failing test pinning the new members**

Create `test/unit/components/modules/raw-query/interfaces/viewMode.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ViewMode,
  type ExecutedResultItem,
} from '~/components/modules/raw-query/interfaces';

describe('ViewMode', () => {
  it('has a CONSOLE member for MongoDB script output', () => {
    expect(ViewMode.CONSOLE).toBe('console');
  });
});

describe('ExecutedResultItem metadata', () => {
  it('accepts the optional MongoDB-specific fields without a type error', () => {
    const item: ExecutedResultItem = {
      id: 'x',
      metadata: {
        queryTime: 0,
        statementQuery: '',
        executedAt: new Date(),
        executeErrors: undefined,
        resultKind: 'cursor',
        logs: [{ level: 'log', args: ['hi'] }],
        mutationSummary: { acknowledged: true, insertedCount: 1 },
        rawResult: { ok: 1 },
        truncated: false,
      },
      result: [],
      seqIndex: 0,
      view: ViewMode.CONSOLE,
    };

    expect(item.metadata.resultKind).toBe('cursor');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/raw-query/interfaces/viewMode.spec.ts`
Expected: FAIL — `ViewMode.CONSOLE` is `undefined` (assertion fails), and/or a TypeScript error on the object literal (extra properties not in the interface).

- [ ] **Step 3: Add `ViewMode.CONSOLE`**

In `components/modules/raw-query/interfaces/index.ts`, find:

```ts
export enum ViewMode {
  RESULT = 'result',
  ERROR = 'error',
  INFO = 'info',
  RAW = 'raw',
  EXPLAIN = 'explain',
  CHART = 'chart',
}
```

Change to:

```ts
export enum ViewMode {
  RESULT = 'result',
  ERROR = 'error',
  INFO = 'info',
  RAW = 'raw',
  EXPLAIN = 'explain',
  CHART = 'chart',
  /** MongoDB script execution log output. */
  CONSOLE = 'console',
}
```

- [ ] **Step 4: Extend `ExecutedResultItem['metadata']`**

In the same file, find the `ExecutedResultItem` interface and its `metadata` block (it currently ends with `rowCount?: number;`). Add the four new optional fields, importing the two MongoDB types this touches only as types (no runtime import, no engine knowledge — these are structural type references, same footing as the existing `FieldDef` import from `pg`):

```ts
import type {
  MongoRawQueryLogEntry,
  MongoRawQueryMutationSummary,
} from '~/core/types/mongodb-raw-query.types';
```

```ts
export interface ExecutedResultItem {
  id: string;
  metadata: {
    queryTime: number;
    statementQuery: string;
    executedAt: Date;
    executeErrors:
      | {
          message: string;
          data: Partial<DatabaseDriverError>;
        }
      | undefined;
    fieldDefs?: FieldDef[];
    connection?: Connection | undefined;
    command?: string;
    rowCount?: number;
    /** MongoDB: the shape of the script's return value (cursor, document, scalar, ...). */
    resultKind?: string;
    /** MongoDB: console.log/info/warn/error calls captured during script execution. */
    logs?: MongoRawQueryLogEntry[];
    /** MongoDB: summary of an insert/update/delete operation's effect. */
    mutationSummary?: MongoRawQueryMutationSummary;
    /** MongoDB: the raw (non-cursor) value the script returned. */
    rawResult?: unknown;
    /** MongoDB: whether the result set was truncated by the server-side row cap. */
    truncated?: boolean;
  };
  result: RowData[];
  seqIndex: number;
  view: ViewMode;
}
```

This introduces a type-only dependency from the core onto `~/core/types/mongodb-raw-query.types` (a plain data-shape file, not a driver module and not `DatabaseClientType`) — it does not violate the "core must not import driver modules" constraint, and it is intentionally generic-looking (any engine could add optional metadata fields the same way; nothing here branches on which engine is active).

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/raw-query/interfaces/viewMode.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Run the guard test and full verification**

```bash
bun test:unit test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts
bun run typecheck
bun test:unit
```

Expected: all green. The guard test must still pass — this task added no `DatabaseClientType` reference and no driver import to the core.

- [ ] **Step 7: Report files for staging**

---

## Task 6: MongoDB capabilities and registry entries

**Files:**

- Create: `components/modules/driver/mongodb/raw-query/capabilities/mongo.capabilities.ts`
- Create: `components/modules/driver/mongodb/raw-query/capabilities/index.ts`
- Create: `components/modules/driver/mongodb/raw-query/index.ts`
- Modify: `components/modules/raw-query/contracts/rawQueryCapabilities.ts`
- Modify: `components/modules/driver/shared/raw-query/resolveRawQueryDescriptor.ts`
- Test: `test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`

**Interfaces:**

- Consumes: `RawQueryCapabilities`, `RawQueryLanguage` (core contracts, this task extends the latter); `genericCommandResult` from `~/components/modules/driver/shared/raw-query/services` (already exists — the same factory PostgreSQL/Redis/every SQL driver's descriptor uses for engines without a bespoke summary handler).
- Produces: `MONGODB_RAW_QUERY_CAPABILITIES: RawQueryCapabilities`; `resolveRawQueryDescriptor(DatabaseClientType.MONGODB)` now returns `{ capabilities: MONGODB_RAW_QUERY_CAPABILITIES, commandResultHandler: genericCommandResult }` instead of `undefined` — consumed by `ResultTabResultView`'s per-tab summary resolution (Task 7's `MongoRawQuery.vue` supplies the same `resolveCommandResultHandler` every other entry uses).

- [ ] **Step 1: Write a failing test**

Create `test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts` additions — append this block to the existing file (read it first; do not remove any existing case):

```ts
import { MONGODB_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mongodb/raw-query/capabilities';

describe('MongoDB capabilities', () => {
  it('resolves a descriptor for MONGODB with the generic command result handler', () => {
    const descriptor = resolveRawQueryDescriptor(DatabaseClientType.MONGODB);

    expect(descriptor).toBeDefined();
    expect(descriptor?.capabilities).toBe(MONGODB_RAW_QUERY_CAPABILITIES);
    expect(
      descriptor?.commandResultHandler('MONGODB', 3).category
    ).toBeDefined();
  });
});
```

You will need `resolveRawQueryDescriptor` imported in that file already for other cases — reuse the existing import rather than adding a duplicate.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:unit test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`
Expected: FAIL — cannot resolve `~/components/modules/driver/mongodb/raw-query/capabilities`.

- [ ] **Step 3: Extend `RawQueryLanguage`**

In `components/modules/raw-query/contracts/rawQueryCapabilities.ts`, change:

```ts
export type RawQueryLanguage = 'sql' | 'redis';
```

to:

```ts
/**
 * 'mongo' exists only so a descriptor's `language` field is honest for
 * MongoDB in the shared driver registry (`resolveRawQueryDescriptor`). No
 * core code branches on it: MongoDB's own raw-query pipeline does not read
 * `RawQueryCapabilities` at all — it composes its own editor, execution, and
 * variable handling (see `components/modules/driver/mongodb/raw-query/`).
 */
export type RawQueryLanguage = 'sql' | 'redis' | 'mongo';
```

- [ ] **Step 4: Write the MongoDB capabilities object**

Create `components/modules/driver/mongodb/raw-query/capabilities/mongo.capabilities.ts`:

```ts
import type { RawQueryCapabilities } from '~/components/modules/raw-query/contracts';

/**
 * Descriptor-only: satisfies `RawQueryDriverDescriptor`'s shape for the
 * shared resolver map (`resolveRawQueryDescriptor`), which every entry needs
 * to resolve a per-tab command-result summary. MongoDB's own container does
 * not read this object — its editor, execution, and variable handling are
 * entirely its own (see `components/modules/driver/mongodb/raw-query/hooks`).
 */
export const MONGODB_RAW_QUERY_CAPABILITIES: RawQueryCapabilities = {
  language: 'mongo',
  supportsVariables: true,
  supportsFormat: true,
  parameterStyle: 'colon',
};
```

Create `components/modules/driver/mongodb/raw-query/capabilities/index.ts`:

```ts
export { MONGODB_RAW_QUERY_CAPABILITIES } from './mongo.capabilities';
```

Create `components/modules/driver/mongodb/raw-query/index.ts`:

```ts
export { MONGODB_RAW_QUERY_CAPABILITIES } from './capabilities';
```

(This root barrel does not export `containers/`, matching every other driver's convention and avoiding an import cycle with `driver/shared/raw-query`, which this task's Step 5 has import MongoDB's capabilities.)

- [ ] **Step 5: Register MongoDB in `resolveRawQueryDescriptor.ts`**

Read `components/modules/driver/shared/raw-query/resolveRawQueryDescriptor.ts` in full. Add the import:

```ts
import { MONGODB_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mongodb/raw-query/capabilities';
```

and add an entry to `RAW_QUERY_DESCRIPTORS` for `DatabaseClientType.MONGODB`:

```ts
[DatabaseClientType.MONGODB]: {
  capabilities: MONGODB_RAW_QUERY_CAPABILITIES,
  commandResultHandler: genericCommandResult,
},
```

`genericCommandResult` is already imported in this file (every SQL driver without a bespoke handler and Redis both use it) — reuse the existing import.

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test:unit test/unit/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts`
Expected: PASS, all cases including the new one.

- [ ] **Step 7: Run verification**

```bash
bun run typecheck
bun test:unit
bun test:unit test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts
```

Expected: all green.

- [ ] **Step 8: Report files for staging**

---

## Task 7: `MongoRawQuery.vue` container

**Files:**

- Create: `components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue`
- Create: `components/modules/driver/mongodb/raw-query/containers/index.ts`
- Modify: `components/modules/driver/mongodb/raw-query/index.ts`
- Test: `test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQuery.test.ts`

**Interfaces:**

- Consumes: `useRawQueryFileContentContext`, `useRawQueryResultTabsContext` (core `hooks/`, already used by `RawQueryShell.vue`); `RawQueryLayout`, `RawQueryEditorHeader`, `RawQueryEditorFooter`, `RawQueryResultTabs`, `RawQueryConnectionConfirmDialog`, `IntroRawQuery`, `VariableEditor` (core `components/`); `resolveCommandResultHandler` (`~/components/modules/driver/shared/raw-query`); `useMongoScriptMetadata`, `useMongoScriptEditorExtensions`, `useMongoScriptExecution`, `useMongoApproval` (Task 3); `MongoRawQueryConsole`, `MongoRawQueryApprovalDialog`, `MongoRawQueryResultView`, `MongoRawQueryVariableUsageGuidePopover` (Task 4); `formatMongoScript`, `resolveMongoScriptSource` (Task 2); `ViewMode` (Task 5).
- Produces: `MongoRawQuery.vue`, a Vue SFC with no props, registered by `resolveRawQueryComponent.ts` in Task 8.

- [ ] **Step 1: Write a failing mount test**

Create `test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQuery.test.ts`:

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import MongoRawQuery from '~/components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue';

const fileContentMock = {
  connection: ref({ id: 'conn-1', name: 'Mongo', type: 'mongodb' }),
  currentFile: ref(undefined),
  currentOpenedConnection: ref({ id: 'conn-1', name: 'Mongo', tagIds: [] }),
  fileContents: ref(''),
  fileVariables: ref('{}'),
  selectedConnectionId: ref('conn-1'),
  updateSelectedConnection: vi.fn(),
  updateFileContent: vi.fn(),
  updateFileVariables: vi.fn(),
  updateFileCursorPos: vi.fn(),
  connectionsByWsId: ref([{ id: 'conn-1', name: 'Mongo', type: 'mongodb' }]),
  fieldDefs: ref([]),
  isFromCache: true,
  loadFileContent: vi.fn().mockResolvedValue(undefined),
};

vi.mock('~/components/modules/raw-query/hooks', async importOriginal => {
  const actual =
    await importOriginal<
      typeof import('~/components/modules/raw-query/hooks')
    >();
  return {
    ...actual,
    useRawQueryFileContentContext: () => fileContentMock,
  };
});

vi.mock(
  '~/components/modules/driver/mongodb/raw-query/hooks',
  async importOriginal => {
    const actual =
      await importOriginal<
        typeof import('~/components/modules/driver/mongodb/raw-query/hooks')
      >();
    return {
      ...actual,
      useMongoScriptMetadata: () => ({
        metadata: ref({ collections: [], fieldsByCollection: {} }),
        metadataByDatabase: ref({}),
        databases: ref([]),
        isLoading: ref(false),
        error: ref(null),
        refresh: vi.fn(),
        ensureDatabaseMetadata: vi.fn(),
        metadataForDatabase: () => ({
          collections: [],
          fieldsByCollection: {},
        }),
      }),
    };
  }
);

async function mountEntry() {
  return mountSuspended(MongoRawQuery, {
    global: {
      stubs: {
        BaseCodeEditor: {
          template: '<div data-testid="mongo-code-editor" />',
        },
      },
    },
  });
}

describe('MongoRawQuery', () => {
  it('renders the MongoDB script editor', async () => {
    const wrapper = await mountEntry();

    expect(wrapper.find('[data-testid="mongo-code-editor"]').exists()).toBe(
      true
    );
  });

  it('shows the variables panel with the EJSON guide popover', async () => {
    const wrapper = await mountEntry();

    expect(wrapper.text()).toContain('Variables');
  });

  it('does not render the shared header/footer variable usage popover', async () => {
    const wrapper = await mountEntry();

    // The core's colon-`:param` popover would be wrong for EJSON scripts;
    // MongoDB supplies its own via footer-extra instead (Task 7 wiring).
    expect(
      wrapper
        .findComponent({ name: 'RawQueryVariableUsageGuidePopover' })
        .exists()
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQuery.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `MongoRawQuery.vue`**

Create `components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue`. This is adapted directly from `components/modules/raw-query/shell/RawQueryShell.vue` (read that file if you have not already — Task 7's design followed it line by line): the layout, header/footer wiring, connection-confirm dialog, hotkeys, and cursor/scroll restore are copied with only the execution/editor/variable pipeline swapped for MongoDB's own hooks, and there is no `promptMissingVariables`/`MissingVariablesDialog` (MongoDB parses its whole variables blob at once — see Task 3's `useMongoScriptExecution`).

```vue
<script setup lang="ts">
import { LoadingOverlay } from '#components';
import BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { resolveCommandResultHandler } from '~/components/modules/driver/shared/raw-query';
import IntroRawQuery from '~/components/modules/raw-query/components/IntroRawQuery.vue';
import RawQueryConnectionConfirmDialog from '~/components/modules/raw-query/components/RawQueryConnectionConfirmDialog.vue';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';
import RawQueryEditorHeader from '~/components/modules/raw-query/components/RawQueryEditorHeader.vue';
import RawQueryLayout from '~/components/modules/raw-query/components/RawQueryLayout.vue';
import RawQueryResultTabs from '~/components/modules/raw-query/components/RawQueryResultTabs.vue';
import VariableEditor from '~/components/modules/raw-query/components/VariableEditor.vue';
import {
  useRawQueryFileContentContext,
  useRawQueryResultTabsContext,
} from '~/components/modules/raw-query/hooks';
import { ViewMode } from '~/components/modules/raw-query/interfaces';
import { useHotkeys } from '~/core/composables/useHotKeys';
import { useEnvironmentTagStore } from '~/core/stores';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  MongoRawQueryApprovalDialog,
  MongoRawQueryConsole,
  MongoRawQueryResultView,
  MongoRawQueryVariableUsageGuidePopover,
} from '../components';
import {
  useMongoApproval,
  useMongoScriptEditorExtensions,
  useMongoScriptExecution,
  useMongoScriptMetadata,
} from '../hooks';
import { formatMongoScript, resolveMongoScriptSource } from '../utils';

const appConfigStore = useAppConfigStore();
const tagStore = useEnvironmentTagStore();
const rawQueryFileContent = useRawQueryFileContentContext();
const {
  connection,
  currentFile,
  currentOpenedConnection,
  fileContents,
  fileVariables,
  selectedConnectionId,
  updateSelectedConnection,
  updateFileContent,
  updateFileVariables,
  connectionsByWsId,
} = rawQueryFileContent;

const resultTabs = useRawQueryResultTabsContext();

const codeEditorRef = ref<InstanceType<typeof BaseCodeEditor> | null>(null);
const cursorInfo = ref({ line: 1, column: 1 });
const scrollTop = ref(0);
const showResultPanel = ref(true);

const metadataQuery = useMongoScriptMetadata({ connection });
const approval = useMongoApproval();

const isConnectionExecutionConfirmOpen = ref(false);
const executionConfirmTargetConnectionName = ref('');
const executionConfirmCurrentConnectionName = ref('');
let resolveConnectionExecutionConfirm: ((value: boolean) => void) | null = null;

const isCurrentConnectionStrictMode = computed(() => {
  if (!currentOpenedConnection.value) return false;
  return tagStore
    .getTagsByIds(currentOpenedConnection.value.tagIds ?? [])
    .some(tag => tag.strictMode);
});

const requestConnectionExecutionConfirm = () => {
  const selectedConnection = connection.value;
  const currentConnection = currentOpenedConnection.value;

  if (
    !selectedConnection ||
    !currentConnection ||
    selectedConnection.id === currentConnection.id
  ) {
    return Promise.resolve(true);
  }

  if (isConnectionExecutionConfirmOpen.value) {
    return Promise.resolve(false);
  }

  executionConfirmTargetConnectionName.value = selectedConnection.name;
  executionConfirmCurrentConnectionName.value = currentConnection.name;
  isConnectionExecutionConfirmOpen.value = true;

  return new Promise<boolean>(resolve => {
    resolveConnectionExecutionConfirm = resolve;
  });
};

const onConfirmConnectionExecution = () => {
  isConnectionExecutionConfirmOpen.value = false;
  resolveConnectionExecutionConfirm?.(true);
  resolveConnectionExecutionConfirm = null;
};

const onCancelConnectionExecution = () => {
  isConnectionExecutionConfirmOpen.value = false;
  resolveConnectionExecutionConfirm?.(false);
  resolveConnectionExecutionConfirm = null;
};

const mongoExecution = useMongoScriptExecution({
  connection,
  documentText: fileContents,
  fileVariables,
  resultTabs,
  beforeExecute: () => requestConnectionExecutionConfirm(),
});

const runScript = () => mongoExecution.execute();

const formatScript = async () => {
  const editorView = codeEditorRef.value?.editorView;
  if (!editorView) return;
  const formatted = await formatMongoScript(editorView.state.doc.toString());
  updateFileContent(formatted);
};

const editor = useMongoScriptEditorExtensions({
  codeEditorRef,
  fileVariables,
  databases: metadataQuery.databases,
  metadataByDatabase: metadataQuery.metadataByDatabase,
  ensureDatabaseMetadata: metadataQuery.ensureDatabaseMetadata,
  onExecuteCurrent: runScript,
  onFormat: formatScript,
});

useHotkeys([
  {
    key: 'mod+j',
    callback: () => {
      showResultPanel.value = !showResultPanel.value;
    },
  },
  {
    key: 'ctrl+j',
    callback: () => {
      showResultPanel.value = !showResultPanel.value;
    },
  },
]);

const onUpdateCursorInfo = ({
  column,
  from,
  line,
  to,
}: {
  line: number;
  column: number;
  from: number;
  to: number;
}) => {
  cursorInfo.value = { column, line };
  rawQueryFileContent.updateFileCursorPos({ from, to });
};

const restoreCursorPos = (allowScroll = true) => {
  if (!currentFile.value?.cursorPos || !codeEditorRef.value?.editorView) return;
  const from = currentFile.value.cursorPos.from ?? 0;
  const to = currentFile.value.cursorPos.to || 0;
  codeEditorRef.value.setCursorPosition({ from, to, allowScroll });
};

const isEditorLoading = ref(!rawQueryFileContent.isFromCache);

onMounted(async () => {
  if (isEditorLoading.value) {
    await rawQueryFileContent.loadFileContent();
    isEditorLoading.value = false;
    await nextTick();
  }
  restoreCursorPos();
});

onActivated(async () => {
  await nextTick();
  restoreCursorPos(false);
  if (codeEditorRef.value?.editorView) {
    codeEditorRef.value.editorView.scrollDOM.scrollTop = scrollTop.value;
  }
});

onBeforeUnmount(() => {
  if (resolveConnectionExecutionConfirm) {
    resolveConnectionExecutionConfirm(false);
    resolveConnectionExecutionConfirm = null;
  }
});
</script>

<template>
  <RawQueryConnectionConfirmDialog
    :open="isConnectionExecutionConfirmOpen"
    :target-connection-name="executionConfirmTargetConnectionName"
    :current-connection-name="executionConfirmCurrentConnectionName"
    @confirm="onConfirmConnectionExecution"
    @cancel="onCancelConnectionExecution"
  />

  <MongoRawQueryApprovalDialog
    :open="Boolean(approval.pendingApproval.value)"
    :loading="approval.isConfirming.value"
    :operations="approval.pendingApproval.value?.operations || []"
    @confirm="approval.confirmPendingWrite"
    @cancel="approval.cancelPendingWrite"
  />

  <RawQueryLayout
    :layout="appConfigStore.codeEditorLayout"
    :customLayout="appConfigStore.activeCustomLayout"
    :show-result-panel="showResultPanel"
  >
    <template #content>
      <div class="flex flex-col h-full p-1">
        <div class="flex flex-col h-full border rounded-md">
          <RawQueryEditorHeader
            @update:connectionId="updateSelectedConnection"
            :connections="connectionsByWsId"
            :connection="connection"
            :selected-connection-id="selectedConnectionId"
            :disable-connection-switch="isCurrentConnectionStrictMode"
            :workspaceId="rawQueryFileContent.workspaceId"
            :file-variables="fileVariables"
            :code-editor-layout="appConfigStore.codeEditorLayout"
            :currentFileInfo="currentFile"
            :is-support-variable="true"
            @update:update-file-variables="updateFileVariables"
          />
          <div class="h-full flex flex-col overflow-y-auto">
            <LoadingOverlay v-if="isEditorLoading" visible />

            <BaseCodeEditor
              v-else
              @update:modelValue="updateFileContent"
              @update:cursorInfo="onUpdateCursorInfo"
              @update:onScrollTop="scrollTop = $event"
              :modelValue="fileContents"
              :extensions="editor.extensions"
              ref="codeEditorRef"
            />
          </div>

          <RawQueryEditorFooter
            :cursor-info="cursorInfo"
            :execute-loading="mongoExecution.queryProcessState.executeLoading"
            :is-streaming="mongoExecution.queryProcessState.isStreaming"
            :is-support-format="true"
            :is-support-variable="false"
            @on-format-current-statement="formatScript"
            @on-format-all="formatScript"
            @on-execute-current="runScript"
            @on-cancel-query="mongoExecution.cancel"
          >
            <template #extra>
              <MongoRawQueryVariableUsageGuidePopover />
            </template>
          </RawQueryEditorFooter>
        </div>
      </div>
    </template>

    <template #variables>
      <div class="flex flex-col h-full border rounded-md bg-muted">
        <div class="flex items-center gap-1 font-normal text-sm px-2 py-1">
          <Icon name="hugeicons:absolute" />
          Variables
        </div>

        <div class="h-full flex flex-col overflow-y-auto">
          <VariableEditor
            :variables="fileVariables"
            @update:variables="updateFileVariables"
            @updateVariables="updateFileVariables"
            :file-variables="fileVariables"
          />
        </div>
      </div>
    </template>

    <template #result>
      <IntroRawQuery v-if="resultTabs.executedResults.value.size === 0" />

      <RawQueryResultTabs
        v-else
        :executed-results="resultTabs.executedResults.value"
        :active-tab-id="resultTabs.activeResultTabId.value"
        :execute-loading="mongoExecution.queryProcessState.executeLoading"
        :is-streaming="mongoExecution.queryProcessState.isStreaming"
        :resolve-command-result-handler="resolveCommandResultHandler"
        @update:active-tab="resultTabs.setActiveResultTab"
        @close-tab="resultTabs.closeResultTab"
        @close-other-tabs="resultTabs.closeOtherResultTabs"
        @close-tabs-to-right="resultTabs.closeResultTabsToRight"
        @update:view="resultTabs.updateResultTabView"
      >
        <template #result-view="{ tab, view }">
          <MongoRawQueryResultView
            v-if="view === ViewMode.CONSOLE ? false : true"
            v-show="view !== ViewMode.CONSOLE"
            :documents="tab.result"
          />
          <MongoRawQueryConsole
            v-if="view === ViewMode.CONSOLE"
            :logs="tab.metadata.logs"
          />
        </template>
      </RawQueryResultTabs>
    </template>
  </RawQueryLayout>
</template>
```

Before finalizing, resolve two things by reading the real files (do not guess):

1. `rawQueryFileContent.workspaceId` is referenced above as if it exists on the object `useRawQueryFileContentContext()` returns. Read `components/modules/raw-query/hooks/useRawQueryFileContent.ts` (the underlying hook) — `RawQueryShell.vue` computed `workspaceId` itself from the route rather than getting it from the file-content hook. If `workspaceId` is not part of what `useRawQueryFileContentContext()` returns, add the same `useRoute('workspaceId-connectionId-explorer-fileId')` + computed block `RawQueryShell.vue` uses (lines 45–49) to this file instead of reading it off `rawQueryFileContent`.
2. The `#result-view` slot logic above (`v-if="view === ViewMode.CONSOLE ? false : true" v-show="view !== ViewMode.CONSOLE"`) is deliberately redundant/defensive scaffolding, not a final answer — replace it with a plain `v-if`/`v-else` pair once you confirm `RawQueryResultTabs`'s `result-view` slot re-renders its content (rather than keeping a stale instance) when `view` changes for the same tab. Read `components/modules/raw-query/components/RawQueryResultTabs.vue`'s slot invocation (`RawQueryShell.vue:408` shows how the shell forwards it: `<template #result-view="slotProps"><slot name="result-view" v-bind="slotProps" /></template>`) to confirm `view` is part of `slotProps` and updates reactively, then simplify to:

```vue
<template #result-view="{ tab, view }">
  <MongoRawQueryConsole
    v-if="view === ViewMode.CONSOLE"
    :logs="tab.metadata.logs"
  />
  <MongoRawQueryResultView v-else :documents="tab.result" />
</template>
```

- [ ] **Step 4: Write the barrel and update the root barrel**

Create `components/modules/driver/mongodb/raw-query/containers/index.ts`:

```ts
export { default as MongoRawQuery } from './MongoRawQuery.vue';
```

Do **not** re-export this from `components/modules/driver/mongodb/raw-query/index.ts` — Task 8 imports the container by its full path, matching the existing convention for every other driver (documented in `components/modules/driver/shared/raw-query/docs/ADDING_AN_ENGINE.md`).

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQuery.test.ts`
Expected: PASS, 3 tests. If the mount fails on a missing store/plugin the test does not mock, extend the mocks the same way `test/nuxt/components/modules/raw-query/RawQueryShell.test.ts` does for its own mount test — read that file for the pattern before adding anything new.

- [ ] **Step 6: Run verification**

```bash
bun run typecheck
bun test:unit
bun test:unit test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts
```

Expected: all green.

- [ ] **Step 7: Report files for staging**

---

## Task 8: Register MongoDB in the resolver

**Files:**

- Modify: `components/modules/driver/shared/raw-query/resolver/resolveRawQueryComponent.ts`
- Test: `test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts`

**Interfaces:**

- Consumes: `MongoRawQuery` from `~/components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue` (Task 7, imported by full path).
- Produces: `resolveRawQueryComponent(DatabaseClientType.MONGODB)` now returns the MongoDB entry (built through the same `defineEngineEntry` factory every other entry uses — loading/error states, `suspensible: false`) instead of `UnsupportedRawQuery`.

- [ ] **Step 1: Read the existing test and add a case that will fail**

Read `test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts` in full — it already asserts `MONGODB` resolves to `UnsupportedRawQuery` alongside `SNOWFLAKE` and `undefined` (from the earlier resolver task). Replace that specific assertion:

```ts
it('falls back to the unsupported state for %s', type => {
  expect(resolveRawQueryComponent(type)).toBe(UnsupportedRawQuery);
});
```

Its `it.each` list currently includes `DatabaseClientType.MONGODB` — remove `DatabaseClientType.MONGODB` from that list (keep `DatabaseClientType.SNOWFLAKE` and `undefined`), and add a new, separate case:

```ts
it('resolves MONGODB to a real entry, not the unsupported state', () => {
  expect(resolveRawQueryComponent(DatabaseClientType.MONGODB)).not.toBe(
    UnsupportedRawQuery
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts`
Expected: FAIL — `resolveRawQueryComponent(DatabaseClientType.MONGODB)` still returns `UnsupportedRawQuery`.

- [ ] **Step 3: Register the entry**

In `components/modules/driver/shared/raw-query/resolver/resolveRawQueryComponent.ts`, find the `MONGODB` line (it currently has no entry, so it falls through to the `?? UnsupportedRawQuery` default) and add it using the same `defineEngineEntry` factory every other entry uses:

```ts
[DatabaseClientType.MONGODB]: defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue'
    )
),
```

Read the file's existing entries first to place this consistently (alphabetically or in whatever order the existing map uses) and to confirm `defineEngineEntry`'s exact call shape before writing this line — do not guess its signature.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts`
Expected: PASS, including the new case and the un-touched existing ones (`SNOWFLAKE` and `undefined` still resolve to `UnsupportedRawQuery`).

- [ ] **Step 5: Run verification**

```bash
bun run typecheck
bun test:unit
```

Expected: both fully green.

- [ ] **Step 6: Manual smoke test recommendation**

This step cannot be automated headlessly — note it for the user's manual verification: `bun run dev`, open a raw-query file on a MongoDB connection, confirm the editor loads (JS/TS highlighting, Mongo completion), run a simple read script (e.g. `return db.collection('x').find().toArray();`), confirm the document list renders, run a script with `console.log` and confirm the Console tab shows it, and run a destructive operation (e.g. `db.collection('x').deleteMany({})`) to confirm the approval dialog appears and blocks execution until confirmed.

- [ ] **Step 7: Report files for staging**

---

## Task 9: Documentation

**Files:**

- Modify: `components/modules/driver/shared/raw-query/docs/ADDING_AN_ENGINE.md`

**Interfaces:**

- Consumes: nothing new.
- Produces: an accurate, current description of two engine patterns instead of one.

- [ ] **Step 1: Add a second pattern to the guide**

Read `components/modules/driver/shared/raw-query/docs/ADDING_AN_ENGINE.md` in full. It currently documents only the "compose `RawQueryShell`" pattern (what Postgres, Redis, and every SQL driver use). Add a new section, after the existing walkthrough, titled something like "When an engine doesn't fit the shared pipeline" that:

- States the test: does the engine execute SQL-shaped statements with colon/at-style named parameters? If yes, use `RawQueryShell` (or `BaseSqlRawQuery` for the plain-SQL case). If the engine's editor language, statement model, or variable handling is fundamentally different (MongoDB's script + EJSON + approval-step shape is the example), compose a container directly from the shared primitives instead.
- Lists exactly which primitives are safe to reuse directly regardless of pattern: `RawQueryLayout`, `RawQueryEditorHeader`/`RawQueryEditorFooter` (via their `header-extra`/`footer-extra` slots), `RawQueryResultTabs` (via its `result-view` slot), `RawQueryConnectionConfirmDialog`, `useRawQueryFileContentContext`, `useRawQueryResultTabsContext`.
- Points at `components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue` as the worked example of this second pattern, the same way the existing section points at MariaDB for the first.
- Notes that a descriptor/capabilities object is still required either way, because `resolveRawQueryDescriptor` needs one for per-tab command-result summaries even when nothing else in the engine reads it (MongoDB's `mongo.capabilities.ts` is the example — see its comment).

Keep every existing sentence about the `RawQueryShell` pattern unchanged; this is an addition, not a rewrite.

- [ ] **Step 2: Verify no path/symbol in the addition is wrong**

For every backticked path or symbol you wrote in Step 1, confirm it exists:

```bash
test -f components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue && echo OK
test -f components/modules/driver/mongodb/raw-query/capabilities/mongo.capabilities.ts && echo OK
```

Expected: both print `OK`.

- [ ] **Step 3: Run final verification**

```bash
bun run typecheck
bun test:unit
bun test:unit test/unit/components/modules/raw-query/coreHasNoEngineKnowledge.spec.ts
```

Expected: all green. Then, individually (not the full suite):

```bash
bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/useMongoApproval.test.ts
bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQueryResultView.test.ts
bun test:nuxt test/nuxt/components/modules/driver/mongodb/raw-query/MongoRawQuery.test.ts
bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryComponent.test.ts
bun test:nuxt test/nuxt/components/modules/driver/shared/raw-query/resolveRawQueryCapabilities.spec.ts
```

Expected: all pass.

- [ ] **Step 4: Report files for staging, and summarize what remains manual**

List every file touched across all nine tasks. Restate Task 8's manual smoke-test steps for the user, since nothing in this plan exercises a real MongoDB connection end to end.

---

## Self-Review

**Spec coverage.** §2 goals: G1 (no engine knowledge in core) → Task 5's additions are inert, verified by the guard test in every task from 5 onward; G2/G3 (server + client logic ported) → Tasks 1–4; G4 (core additions are inert data) → Task 5; G5 (quick-query untouched) → no task modifies anything under `driver/mongodb/quick-query/`. §4 decisions: D1 (MongoDB composes its own container) → Task 7; D2 (reuse of shared primitives) → Task 7's file structure table; D3 (near-verbatim server + client port) → Tasks 1–4, each with a `diff`-based verification step; D4 (inert core additions) → Task 5; D5 (`genericCommandResult` reuse) → Task 6. §7 migration stages map onto Tasks 1–9 in the same order the spec lists them.

**Deviations from `feat/support-mongodb-3` recorded and justified in-line, not silent:** the `/api/mongodb/databases` → `/api/mongodb/schemas` endpoint swap (Task 3, Step 5); dropping three plugin-tied components (Task 4, Step 7); the `useMongoScriptExecution.ts` debug-log removal and `as any` elimination (Task 3, Step 6); `MongoRawQueryResultView.vue`'s simplification away from `RawQueryContext` (Task 4, Step 3).

**Placeholder scan.** No task step says "add appropriate handling" or leaves a signature unfilled. Two steps (Task 3 Step 6, Task 7 Step 3) explicitly flag something the plan could not fully resolve from static reading alone — a prop-shape mismatch on `MongoCollectionListView` and the `workspaceId`/slot-reactivity question — and tell the implementer exactly what to read and how to resolve it, rather than guessing. That is a deliberate "verify against the real file" instruction, not a placeholder.

**Type consistency.** `useMongoScriptExecution`'s return shape (`execute, cancel, pendingApproval, confirmPendingWrite, cancelPendingWrite, queryProcessState, currentRawQueryResult, rawResponse`) in Task 3 matches exactly how Task 7's `MongoRawQuery.vue` destructures `mongoExecution`. `ResultTabsReturn` (Task 3's `resultTabs` param type) matches what `useRawQueryResultTabsContext()` returns and what Task 7 passes in. `ViewMode.CONSOLE` (Task 5) is the same value Task 7's `#result-view` slot branches on. `MONGODB_RAW_QUERY_CAPABILITIES` (Task 6) is the exact object Task 6's `resolveRawQueryDescriptor` entry and Task 7's `resolveCommandResultHandler` call chain resolve to for `DatabaseClientType.MONGODB`.
