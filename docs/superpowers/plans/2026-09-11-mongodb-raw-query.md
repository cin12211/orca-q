# MongoDB Raw Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a MongoDB Raw Query mode that runs restricted TypeScript against the selected database, provides contextual CodeMirror suggestions, confirms writes before execution, and streams cursor results into the existing result tabs.

**Architecture:** The browser keeps the current Raw Query facade and query-file persistence, but selects a Mongo-specific editor and execution path for MongoDB connections. A Nitro endpoint validates and transpiles TypeScript, then runs it in a bounded worker-hosted SES compartment; the worker receives a capability facade while the parent process owns the native MongoDB driver and NDJSON stream. Write operations require a short-lived, single-use approval token bound to the exact script, parameters, connection target, database, and operation manifest.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript compiler API, CodeMirror 6, `@codemirror/lang-javascript`, `@jridgewell/trace-mapping`, SES, Node `worker_threads`, native `mongodb` driver, H3 NDJSON streaming, Vitest, Nuxt Test Utils, MongoDB fixture, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-mongodb-raw-query-design.md`

## Global Constraints

- Keep the current workspace query-file model; do not require or infer behavior from a `.mongo.ts` extension.
- Select SQL, Redis, or Mongo behavior from the active connection family; do not persist a connection ID on a query file.
- Mongo executes the non-empty editor selection, otherwise the complete file; SQL and Redis retain their existing execution-unit behavior.
- Require an explicit `return` to publish a value; scripts without a return may complete with metadata and console output.
- Expose only `db`, immutable `params`, bounded `console`, and the approved BSON helpers inside the sandbox.
- Keep the real `Db`, `MongoClient`, connection parameters, filesystem, network, module loader, process globals, and host objects outside the compartment.
- Restrict `db` to the selected database; do not expose database switching, sessions, transactions, GridFS, or change streams in V1.
- Stop before opening a database operation when static analysis identifies a write and no matching approval token is present.
- Recheck every operation in the native capability host; static analysis is not the security boundary.
- Default limits are 30 seconds, 128 MB worker heap, 10,000 streamed documents, 20 MB for a returned object or array, 1 MB source, 2 MB serialized parameters, 100 manifest operations, and 2,000 characters per redacted operation summary; the timeout may be configured up to five minutes.
- Preserve BSON values as Canonical Extended JSON at every worker, HTTP, and UI boundary.
- Reuse current Raw Query and base UI components. New components must be feature-specific and live under `components/modules/raw-query`.
- Reuse verified Hugeicons names. The planned `hugeicons:code`, `hugeicons:alert-02`, and `hugeicons:play` names already exist in the local Hugeicons collection.
- Do not change SQL or Redis request/result contracts except where shared types are extended compatibly.
- Every source-code task runs its narrow test first. Final verification must pass `bun run typecheck` and `bun test:unit` before the work is considered complete.

## File Structure

### Shared contracts

- Create `core/types/mongodb-raw-query.types.ts` for request, approval, operation-manifest, result, log, diagnostic, and NDJSON event contracts.
- Create `core/constants/mongodb-raw-query.ts` for execution limits and result defaults.
- Modify `core/types/index.ts` and `core/constants/index.ts` to export the new contracts.
- Modify `package.json` and `bun.lock` to declare `ses`, `@jridgewell/trace-mapping`, and `@codemirror/lang-javascript` directly.

### Server runtime

- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.ts` for TypeScript parsing, forbidden-syntax validation, return detection, write classification, and transpilation.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-operation-catalog.ts` for the single server allowlist used by the policy and runtime bridge.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.ts` for challenge and one-time token lifecycle.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.ts` for native driver calls, cursor handles, EJSON conversion, and runtime authorization.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-protocol.ts` for parent/worker messages.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-worker-source.ts` for the SES compartment bootstrap and native-like facade objects.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner.ts` for worker lifecycle, RPC dispatch, timeout, abort, and heap limits.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.ts` for preflight, approved execution, result normalization, and NDJSON streaming.
- Create `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.ts` for bounded collection/field discovery.
- Create `server/infrastructure/nosql/mongodb/raw-query/index.ts` as the feature export boundary.
- Create `server/api/mongodb/raw-query-stream.post.ts`, `server/api/mongodb/raw-query-approve.post.ts`, and `server/api/mongodb/raw-query-metadata.post.ts`.

### Client editor and execution

- Create `components/modules/raw-query/mongo/constants/mongoScriptCatalog.ts` for completion signatures, snippets, operators, and write badges.
- Create `components/modules/raw-query/mongo/utils/createMongoScriptCompletionSource.ts` for syntax-aware completions and simple alias tracking.
- Create `components/modules/raw-query/mongo/utils/resolveMongoScriptSource.ts` for selection-or-full-file execution.
- Create `components/modules/raw-query/mongo/hooks/useMongoScriptMetadata.ts` for cached metadata loading.
- Create `components/modules/raw-query/mongo/hooks/useMongoScriptEditorExtensions.ts` for TypeScript language mode, placeholder, linter, keymap, and completion wiring.
- Create `components/modules/raw-query/mongo/hooks/useMongoScriptExecution.ts` for approval-aware NDJSON execution and result-tab updates.
- Create `components/modules/raw-query/mongo/api/executeMongoRawQuery.ts` for stream parsing, approval requests, and abort.
- Create `components/modules/raw-query/mongo/components/MongoRawQueryApprovalDialog.vue` for the write manifest confirmation.
- Create `components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue` for bounded per-result logs.
- Create index files under `components/modules/raw-query/mongo/` so callers import through one feature boundary.
- Modify the Raw Query facade, editor extensions, result interfaces, result views, header, footer, context menu, and result tabs to select Mongo behavior without duplicating the page.

### Navigation and tests

- Modify `core/constants/connection-capabilities.ts`, `core/types/entities/tab-view.entity.ts`, `core/composables/useTabManagement.ts`, and `components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue` to create a context-aware Mongo query file.
- Add focused unit tests under `test/unit/server/infrastructure/nosql/mongodb/raw-query/`, `test/unit/components/modules/raw-query/mongo/`, and existing capability/API test directories.
- Add Nuxt component tests under `test/nuxt/components/modules/raw-query/`.
- Add Mongo integration coverage in `test/api/mongodb/mongodb-raw-query.test.ts`.
- Add a `mongodb` Playwright project and `test/playwright/mongodb/mongodb-raw-query.spec.ts`.

---

### Task 1: Shared Mongo Raw Query Contracts and Dependencies

**Files:**

- Create: `core/types/mongodb-raw-query.types.ts`
- Create: `core/constants/mongodb-raw-query.ts`
- Modify: `core/types/index.ts`
- Modify: `core/constants/index.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Test: `test/unit/core/types/mongodb-raw-query-contract.spec.ts`

**Interfaces:**

- Consumes: `DatabaseMetadataRequestParams` from `core/types/database-schemas.types.ts`.
- Produces: `MongoRawQueryRequest`, `MongoRawQueryMetadataRequest`, `MongoRawQueryMetadata`, `MongoRawQueryStreamMessage`, `MongoRawQueryOperation`, `MongoRawQueryLogEntry`, `MongoRawQueryDiagnostic`, `MongoRawQueryErrorPhase`, `MongoRawQueryResultKind`, `MongoRawQueryApprovalRequest`, `MongoRawQueryApprovalResponse`, `MONGO_RAW_QUERY_LIMITS`, and `isMongoRawQueryStreamMessage()`.

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from 'vitest';
import { MONGO_RAW_QUERY_LIMITS } from '~/core/constants/mongodb-raw-query';
import { isMongoRawQueryStreamMessage } from '~/core/types/mongodb-raw-query.types';

describe('Mongo raw query shared contract', () => {
  it('publishes the approved default limits', () => {
    expect(MONGO_RAW_QUERY_LIMITS).toEqual({
      defaultTimeoutMs: 30_000,
      maxTimeoutMs: 300_000,
      workerMemoryMb: 128,
      maxDocuments: 10_000,
      maxValueBytes: 20 * 1024 * 1024,
      maxScriptBytes: 1024 * 1024,
      maxParamsBytes: 2 * 1024 * 1024,
      maxOperations: 100,
      maxOperationSummaryChars: 2_000,
      maxLogEntries: 1_000,
      maxLogBytes: 1024 * 1024,
    });
  });

  it('accepts known NDJSON events and rejects unknown payloads', () => {
    expect(isMongoRawQueryStreamMessage({ type: 'rows', data: [] })).toBe(true);
    expect(isMongoRawQueryStreamMessage({ type: 'mystery' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `bun vitest --run test/unit/core/types/mongodb-raw-query-contract.spec.ts`

Expected: FAIL because the Mongo Raw Query constants and types do not exist.

- [ ] **Step 3: Install the direct runtime/editor dependencies**

Run:

```bash
bun add ses
bun add @jridgewell/trace-mapping
bun add --dev @codemirror/lang-javascript
```

Expected: `package.json` and `bun.lock` declare all three packages directly; the server runtime packages are in `dependencies` and the CodeMirror language package follows the existing CodeMirror placement in `devDependencies`.

- [ ] **Step 4: Add the shared contracts and defaults**

```ts
export type MongoRawQueryResultKind =
  | 'cursor'
  | 'documents'
  | 'document'
  | 'scalar'
  | 'mutation'
  | 'void';

export interface MongoRawQueryOperation {
  id: string;
  target: 'database' | 'collection';
  method: string;
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
  timeoutMs?: number;
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
  | { type: 'result'; data: unknown }
  | { type: 'log'; entry: MongoRawQueryLogEntry }
  | { type: 'done'; rowCount: number; queryTime: number; truncated: boolean }
  | {
      type: 'error';
      phase: MongoRawQueryErrorPhase;
      message: string;
      diagnostic?: MongoRawQueryDiagnostic;
    };
```

Also export the new files from the existing barrel modules and implement the event type guard with an explicit set of allowed `type` values.

- [ ] **Step 5: Run the contract test**

Run: `bun vitest --run test/unit/core/types/mongodb-raw-query-contract.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the shared contract**

```bash
git add package.json bun.lock core/types/mongodb-raw-query.types.ts core/types/index.ts core/constants/mongodb-raw-query.ts core/constants/index.ts test/unit/core/types/mongodb-raw-query-contract.spec.ts
git commit -m "feat(mongodb): add raw query contracts"
```

### Task 2: TypeScript Policy Analysis and Compilation

**Files:**

- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-operation-catalog.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.spec.ts`

**Interfaces:**

- Consumes: `MongoRawQueryOperation` from Task 1.
- Produces: `analyzeMongoScript(source)`, `compileMongoScript(source)`, `MongoScriptAnalysis`, and `CompiledMongoScript`.

- [ ] **Step 1: Write policy tests for reads, writes, and forbidden syntax**

```ts
it('classifies a collection update before execution', () => {
  const analysis = analyzeMongoScript(`
    return db.collection('users').updateMany({}, { $set: { active: true } })
  `);

  expect(analysis.operations).toEqual([
    expect.objectContaining({
      target: 'collection',
      collection: 'users',
      method: 'updateMany',
      risk: 'write',
    }),
  ]);
});

it.each([
  `import fs from 'node:fs'`,
  `return require('node:fs')`,
  `return import('node:fs')`,
  `return eval('1 + 1')`,
  `return Function('return process')()`,
  `return db.collection('users')['deleteMany']({})`,
])('rejects forbidden source: %s', source => {
  expect(() => analyzeMongoScript(source)).toThrow();
});

it('treats aggregation $merge as a write', () => {
  expect(
    analyzeMongoScript(
      `return db.collection('users').aggregate([{ $merge: 'archive' }])`
    ).operations
  ).toEqual([expect.objectContaining({ method: 'aggregate:$merge' })]);
});

it('redacts and bounds operation summaries', () => {
  const analysis = analyzeMongoScript(`
    return db.collection('users').updateOne(
      { email: 'ada@example.com' },
      { $set: { accessToken: 'super-secret' } }
    )
  `);

  expect(analysis.operations[0]?.summary).not.toContain('super-secret');
  expect(analysis.operations[0]?.summary.length).toBeLessThanOrEqual(2_000);
});
```

- [ ] **Step 2: Run the policy test and confirm failure**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.spec.ts`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Define one operation catalog for policy and runtime use**

```ts
export const MONGO_COLLECTION_READ_METHODS = [
  'findOne',
  'countDocuments',
  'estimatedDocumentCount',
  'distinct',
  'options',
  'isCapped',
  'indexExists',
  'indexInformation',
] as const;

export const MONGO_COLLECTION_CURSOR_SOURCE_METHODS = [
  'find',
  'aggregate',
  'listIndexes',
] as const;

export const MONGO_DATABASE_CURSOR_SOURCE_METHODS = [
  'listCollections',
] as const;

export const MONGO_DATABASE_METHODS = ['collection', 'command'] as const;

export const MONGO_COLLECTION_WRITE_METHODS = [
  'insertOne',
  'insertMany',
  'replaceOne',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'bulkWrite',
  'createIndex',
  'createIndexes',
  'dropIndex',
  'dropIndexes',
  'rename',
  'drop',
] as const;

export const MONGO_CURSOR_MODIFIERS_BY_SOURCE = {
  find: [
    'sort',
    'project',
    'skip',
    'limit',
    'batchSize',
    'hint',
    'collation',
    'maxTimeMS',
    'comment',
  ],
  aggregate: ['batchSize', 'maxTimeMS', 'allowDiskUse', 'comment'],
  listIndexes: ['batchSize', 'maxTimeMS'],
  listCollections: ['batchSize', 'maxTimeMS'],
} as const;

export const MONGO_READ_COMMANDS = [
  'ping',
  'dbStats',
  'collStats',
  'count',
  'distinct',
] as const;
export const MONGO_WRITE_COMMANDS = [
  'create',
  'drop',
  'createIndexes',
  'dropIndexes',
  'collMod',
] as const;
```

Add destructive classification for `deleteMany`, `drop`, `dropIndexes`, `rename`, collection-wide update/replace calls, and write commands.

- [ ] **Step 4: Implement wrapped-source parsing and analysis**

Use `typescript.createSourceFile()` on an async-function wrapper so top-level `return` is legal:

```ts
const prefix = `async ({ db, params, ObjectId, Decimal128, Binary, UUID, BSON, EJSON, console }) => {\n`;
const suffix = `\n}`;
const wrappedSource = `${prefix}${source}${suffix}`;
```

Reject source larger than 1 MB before parsing. Traverse the function body, track aliases initialized from `db.collection('literal')`, reject forbidden nodes/calls, and detect a reachable return. Normalize duplicate manifest entries by target, effective method, and literal collection (or `*` for a dynamic target), then derive stable display IDs from that normalized tuple. For `aggregate()` and `db.command()` inspect literal payloads, classify `$out`/`$merge` and write commands, and reject `$where`, `$function`, and map-reduce syntax. Redact values under credential-like keys, truncate every summary to 2,000 characters, and reject scripts producing more than 100 manifest entries. Runtime authorization must recompute classification from the actual RPC instead of trusting the display ID.

- [ ] **Step 5: Implement transpilation and source-map metadata**

```ts
export interface CompiledMongoScript {
  code: string;
  sourceMap: string;
  wrapperLineOffset: number;
  analysis: MongoScriptAnalysis;
}

export function compileMongoScript(source: string): CompiledMongoScript {
  const analysis = analyzeMongoScript(source);
  const output = ts.transpileModule(analysis.wrappedSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      sourceMap: true,
      inlineSources: true,
    },
    fileName: 'mongo-raw-query.ts',
    reportDiagnostics: true,
  });

  return {
    code: output.outputText,
    sourceMap: output.sourceMapText || '',
    wrapperLineOffset: 1,
    analysis,
  };
}
```

Convert TypeScript parse/transpile diagnostics to source-relative `MongoRawQueryDiagnostic` values.

- [ ] **Step 6: Run the policy tests**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.spec.ts`

Expected: PASS for read/write classification, aliases, return warning, diagnostics, and forbidden constructs.

- [ ] **Step 7: Commit the compiler and policy**

```bash
git add server/infrastructure/nosql/mongodb/raw-query/mongo-operation-catalog.ts server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-script-policy.spec.ts
git commit -m "feat(mongodb): validate raw query scripts"
```

### Task 3: Single-Use Write Approval Registry

**Files:**

- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.spec.ts`

**Interfaces:**

- Consumes: normalized operation manifests from Task 2.
- Produces: `createMongoApprovalBinding()`, `MongoApprovalRegistry`, and singleton `mongoApprovalRegistry`.

- [ ] **Step 1: Write expiry, mismatch, and replay tests**

```ts
it('consumes an approval token exactly once', () => {
  const registry = new MongoApprovalRegistry({
    now: () => 1_000,
    ttlMs: 60_000,
  });
  const binding = createMongoApprovalBinding(fixtureRequest, fixtureOperations);
  const challenge = registry.createChallenge(binding);
  const approval = registry.approveChallenge(challenge.challengeId);

  expect(registry.consumeApproval(approval.approvalToken, binding)).toBe(true);
  expect(registry.consumeApproval(approval.approvalToken, binding)).toBe(false);
});

it('rejects a token when script or parameters change', () => {
  const registry = new MongoApprovalRegistry({
    now: () => 1_000,
    ttlMs: 60_000,
  });
  const binding = createMongoApprovalBinding(fixtureRequest, fixtureOperations);
  const challenge = registry.createChallenge(binding);
  const approval = registry.approveChallenge(challenge.challengeId);
  const changed = { ...binding, scriptHash: 'different' };

  expect(registry.consumeApproval(approval.approvalToken, changed)).toBe(false);
});
```

- [ ] **Step 2: Run the registry test and confirm failure**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.spec.ts`

Expected: FAIL because the registry module does not exist.

- [ ] **Step 3: Implement deterministic binding hashes**

```ts
export interface MongoApprovalBinding {
  scriptHash: string;
  paramsHash: string;
  targetHash: string;
  database: string;
  manifestHash: string;
}

export function createMongoApprovalBinding(
  request: MongoRawQueryRequest,
  operations: MongoRawQueryOperation[]
): MongoApprovalBinding;
```

Use SHA-256 over stable key-sorted JSON. Include connection ID plus normalized transport target in `targetHash`, but never return or log the unhashed connection string or password.

- [ ] **Step 4: Implement the two-stage TTL registry**

```ts
export class MongoApprovalRegistry {
  createChallenge(binding: MongoApprovalBinding): {
    challengeId: string;
    expiresAt: string;
  };
  approveChallenge(challengeId: string): {
    approvalToken: string;
    expiresAt: string;
  };
  consumeApproval(token: string, binding: MongoApprovalBinding): boolean;
  pruneExpired(): void;
}
```

Creating an approval token consumes the unapproved challenge. Consuming an approval token deletes it before returning success. Process restart naturally invalidates every outstanding record.

- [ ] **Step 5: Run the registry tests**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the approval registry**

```bash
git add server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-approval-registry.spec.ts
git commit -m "feat(mongodb): add raw query approvals"
```

### Task 4: Native Mongo Capability Host and Cursor Handles

**Files:**

- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-protocol.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.spec.ts`

**Interfaces:**

- Consumes: operation catalog and approved operation manifests from Tasks 2-3.
- Produces: `MongoSandboxRpcRequest`, `MongoSandboxRpcResponse`, `MongoCursorDescriptor`, `MongoCapabilityHost`, and `createMongoCapabilityHost()`.

- [ ] **Step 1: Write fake-driver tests for reads, writes, and cursor cleanup**

```ts
it('opens and advances a bounded cursor', async () => {
  const host = createMongoCapabilityHost(fakeDatabase, {
    approvedOperations: [],
    maxDocuments: 10,
  });

  const opened = await host.execute({
    id: 'rpc-1',
    kind: 'cursor-open',
    descriptor: {
      source: {
        target: 'collection',
        collection: 'users',
        method: 'find',
        args: [{ active: true }],
      },
      modifiers: [{ method: 'limit', args: [5] }],
    },
  });

  expect(opened).toMatchObject({ ok: true, cursorId: expect.any(String) });
  await host.closeAll();
  expect(fakeCursor.close).toHaveBeenCalledOnce();
});

it('rejects an unapproved write at runtime', async () => {
  await expect(host.execute(updateRequest)).rejects.toThrow(
    'Write operation is not approved'
  );
});
```

- [ ] **Step 2: Run the capability-host test and confirm failure**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.spec.ts`

Expected: FAIL because the capability host does not exist.

- [ ] **Step 3: Define the RPC protocol**

```ts
export type MongoSandboxRpcRequest =
  | { id: string; kind: 'database-call'; method: string; args: unknown[] }
  | {
      id: string;
      kind: 'collection-call';
      collection: string;
      method: string;
      args: unknown[];
    }
  | { id: string; kind: 'cursor-open'; descriptor: MongoCursorDescriptor }
  | { id: string; kind: 'cursor-next'; cursorId: string; batchSize: number }
  | { id: string; kind: 'cursor-close'; cursorId: string };

export interface MongoCursorDescriptor {
  source:
    | {
        target: 'collection';
        collection: string;
        method: 'find' | 'aggregate' | 'listIndexes';
        args: unknown[];
      }
    | {
        target: 'database';
        method: 'listCollections';
        args: unknown[];
      };
  modifiers: { method: string; args: unknown[] }[];
}
```

All `args` and responses are Canonical EJSON-safe values. The protocol never carries connection credentials or native driver objects.

- [ ] **Step 4: Implement database and collection dispatch**

Validate every method against `mongo-operation-catalog.ts`, deserialize EJSON arguments, independently classify the actual method/collection/command/pipeline, and serialize the result. Support database cursor creation only for `listCollections`; collection cursors remain limited to `find`, `aggregate`, and `listIndexes`. A runtime write is allowed only when its target, normalized method, and collection match an approved manifest entry; a statically dynamic collection entry may match any collection inside the already-selected database. Never authorize from a worker-provided operation ID.

```ts
export class MongoCapabilityHost {
  execute(request: MongoSandboxRpcRequest): Promise<MongoSandboxRpcResponse>;
  streamDescriptor(
    descriptor: MongoCursorDescriptor,
    onBatch: (rows: Record<string, unknown>[]) => Promise<void> | void
  ): Promise<{ rowCount: number; truncated: boolean }>;
  closeAll(): Promise<void>;
}
```

- [ ] **Step 5: Enforce cursor and payload limits**

Apply only the modifier list for the descriptor's exact cursor source, clamp driver batch size, stop at `maxDocuments`, close cursor handles on completion/error/cancel, and reject serialized immediate values larger than `maxValueBytes`.

- [ ] **Step 6: Run the capability-host tests**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.spec.ts`

Expected: PASS for reads, runtime write enforcement, EJSON fidelity, cursor chaining, truncation, and cleanup.

- [ ] **Step 7: Commit the native capability layer**

```bash
git add server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.ts server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-protocol.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-capability-host.spec.ts
git commit -m "feat(mongodb): add sandbox capability host"
```

### Task 5: SES Worker Runtime

**Files:**

- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-worker-source.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner.spec.ts`

**Interfaces:**

- Consumes: `CompiledMongoScript`, RPC protocol, and execution limits.
- Produces: `createMongoSandboxExecution(options): MongoSandboxExecution`.

- [ ] **Step 1: Write worker isolation and lifecycle tests**

```ts
it('does not expose Node globals', async () => {
  const execution = createMongoSandboxExecution({
    compiled: createCompiledWorkerFixture(`async () => typeof process`),
    params: {},
    timeoutMs: 1_000,
    onRpc: vi.fn(),
    onLog: vi.fn(),
  });

  await expect(execution.result).resolves.toEqual({
    kind: 'value',
    value: 'undefined',
  });
});

it('terminates an infinite loop', async () => {
  const execution = createMongoSandboxExecution({
    compiled: compileMongoScript(`while (true) {}`),
    params: {},
    timeoutMs: 50,
    onRpc: vi.fn(),
    onLog: vi.fn(),
  });

  await expect(execution.result).rejects.toMatchObject({ phase: 'timeout' });
});

it('returns a cursor descriptor without transferring a native cursor', async () => {
  const execution = createMongoSandboxExecution({
    compiled: compileMongoScript(
      `return db.collection('users').find({}).limit(10)`
    ),
    params: {},
    timeoutMs: 1_000,
    onRpc: vi.fn(),
    onLog: vi.fn(),
  });

  await expect(execution.result).resolves.toMatchObject({ kind: 'cursor' });
});
```

`createCompiledWorkerFixture()` is a test-only helper that constructs a `CompiledMongoScript` without running the policy layer. The policy tests already prove that user-authored `process` references are rejected; this worker test independently proves the runtime compartment also has no Node global.

- [ ] **Step 2: Run the sandbox test and confirm failure**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner.spec.ts`

Expected: FAIL because the worker runner does not exist.

- [ ] **Step 3: Build the SES worker bootstrap**

The worker source dynamically imports host dependencies before creating the compartment, calls `lockdown()`, and evaluates only the already-transpiled async function inside a `Compartment`.

```ts
const decodedParams = BSON.EJSON.deserialize(workerData.params);

const endowments = harden({
  db: createDatabaseFacade(sendRpc),
  params: decodedParams,
  console: createBoundedConsole(postLog),
  ObjectId,
  Decimal128,
  Binary,
  UUID,
  BSON,
  EJSON: BSON.EJSON,
});

const compartment = new Compartment(endowments);
const run = compartment.evaluate(workerData.compiledCode);
const value = await run(endowments);
```

Do not endow `process`, `require`, `module`, `fetch`, timers, `WebSocket`, or a native database object. The facade implements database, collection, and cursor proxy objects entirely inside the compartment and emits only the RPC protocol from Task 4. Serialize every RPC argument and final returned value with Canonical EJSON before `postMessage`; deserialize only inside the receiving worker/host boundary so structured cloning never silently strips BSON prototypes.

- [ ] **Step 4: Implement the parent worker controller**

```ts
export interface MongoSandboxExecution {
  result: Promise<MongoSandboxResult>;
  cancel(reason?: 'user' | 'timeout'): Promise<void>;
}

export function createMongoSandboxExecution(
  options: MongoSandboxExecutionOptions
): MongoSandboxExecution;
```

Create the worker with `resourceLimits.maxOldGenerationSizeMb = 128`, route RPC messages through `options.onRpc`, forward bounded logs, terminate on timeout/abort, and remove listeners in one finalizer.

- [ ] **Step 5: Run the sandbox tests**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner.spec.ts`

Expected: PASS for return values, cursor descriptors, logs, immutable params, missing host globals, timeout, cancellation, and cleanup.

- [ ] **Step 6: Commit the worker runtime**

```bash
git add server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-worker-source.ts server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-sandbox-runner.spec.ts
git commit -m "feat(mongodb): run raw queries in SES worker"
```

### Task 6: Streaming Service and Approval Endpoints

**Files:**

- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.ts`
- Create: `server/infrastructure/nosql/mongodb/raw-query/index.ts`
- Create: `server/api/mongodb/raw-query-stream.post.ts`
- Create: `server/api/mongodb/raw-query-approve.post.ts`
- Test: `test/unit/server/api/mongodb/mongodb-raw-query-routes.spec.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.spec.ts`

**Interfaces:**

- Consumes: Tasks 1-5 and `withMongoDatabase()`.
- Produces: `streamMongoRawQuery(event, request)` and `approveMongoRawQuery(challengeId)`.

- [ ] **Step 1: Write service tests for read execution and preflight writes**

```ts
it('emits approval-required before opening MongoDB for a write', async () => {
  analyzeMongoScriptMock.mockReturnValue({ operations: [updateOperation] });

  await streamMongoRawQuery(fakeEvent, updateRequest);

  expect(withMongoDatabaseMock).not.toHaveBeenCalled();
  expect(readMessages(fakeResponse)).toContainEqual(
    expect.objectContaining({
      type: 'approval-required',
      operations: [updateOperation],
    })
  );
});

it('streams a returned cursor and closes its resources', async () => {
  sandboxResultMock.mockResolvedValue({
    kind: 'cursor',
    descriptor: findDescriptor,
  });

  await streamMongoRawQuery(fakeEvent, readRequest);

  expect(readMessages(fakeResponse)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: 'meta', resultKind: 'cursor' }),
      expect.objectContaining({ type: 'rows' }),
      expect.objectContaining({ type: 'done', truncated: false }),
    ])
  );
  expect(capabilityHost.closeAll).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the service test and confirm failure**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.spec.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement preflight and approved execution**

`streamMongoRawQuery()` must:

1. Validate request shape, reject source over 1 MB or serialized params over 2 MB, and clamp timeout.
2. Analyze source before connecting.
3. Emit `approval-required` and end when writes exist without a valid token.
4. Consume a matching approval token before opening MongoDB.
5. Open only the selected database with `withMongoDatabase()`.
6. Create the capability host and worker execution.
7. Normalize returned cursor/value/void results into NDJSON events.
8. Map worker and driver errors to phase-aware diagnostics.
9. Abort on `event.node.req` close and release every cursor/worker/client resource.

Use `TraceMap` and `originalPositionFor` from `@jridgewell/trace-mapping` to convert worker stack locations through `CompiledMongoScript.sourceMap`, subtract the wrapper offset, and emit a source-relative diagnostic only when the mapped line and column are valid.

- [ ] **Step 4: Implement the two H3 route handlers**

```ts
export default defineEventHandler(async event => {
  const body = await readBody<MongoRawQueryRequest>(event);
  return streamMongoRawQuery(event, body);
});
```

```ts
export default defineEventHandler(async event => {
  const { challengeId } = await readBody<MongoRawQueryApprovalRequest>(event);
  return approveMongoRawQuery(challengeId);
});
```

Use status 400 for malformed input, 404/410 for missing or expired challenges, and NDJSON `error` events after response streaming has started.

- [ ] **Step 5: Write and run route delegation tests**

Run: `bun vitest --run test/unit/server/api/mongodb/mongodb-raw-query-routes.spec.ts`

Expected: PASS with mocked `readBody`, `streamMongoRawQuery`, and `approveMongoRawQuery` calls.

- [ ] **Step 6: Run all new server unit tests together**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query test/unit/server/api/mongodb/mongodb-raw-query-routes.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit the streaming API**

```bash
git add server/infrastructure/nosql/mongodb/raw-query server/api/mongodb/raw-query-stream.post.ts server/api/mongodb/raw-query-approve.post.ts test/unit/server/api/mongodb/mongodb-raw-query-routes.spec.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query.service.spec.ts
git commit -m "feat(mongodb): stream sandboxed raw queries"
```

### Task 7: Mongo Metadata Endpoint for Contextual Suggestions

**Files:**

- Create: `server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.ts`
- Create: `server/api/mongodb/raw-query-metadata.post.ts`
- Test: `test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.spec.ts`
- Test: `test/unit/server/api/mongodb/mongodb-raw-query-metadata-route.spec.ts`

**Interfaces:**

- Consumes: `withMongoDatabase()` and existing collection-list helpers.
- Produces: `extractMongoJsonSchemaFieldPaths(schema, maxDepth)`, `inferMongoFieldPaths(documents, maxDepth)`, and `getMongoRawQueryMetadata(request: MongoRawQueryMetadataRequest): Promise<MongoRawQueryMetadata>`.

- [ ] **Step 1: Write field inference tests**

```ts
it('infers sorted dotted field paths with bounded depth', () => {
  expect(
    inferMongoFieldPaths(
      [
        {
          _id: { $oid: 'abc' },
          profile: { name: 'Ada', address: { city: 'HN' } },
        },
        { profile: { name: 'Lin' }, active: true },
      ],
      2
    )
  ).toEqual(['_id', 'active', 'profile', 'profile.address', 'profile.name']);
});

it('extracts fields from a collection JSON Schema validator', () => {
  expect(
    extractMongoJsonSchemaFieldPaths(
      {
        bsonType: 'object',
        properties: {
          profile: {
            bsonType: 'object',
            properties: { name: { bsonType: 'string' } },
          },
          active: { bsonType: 'bool' },
        },
      },
      2
    )
  ).toEqual(['active', 'profile', 'profile.name']);
});
```

- [ ] **Step 2: Run the metadata test and confirm failure**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.spec.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement bounded metadata discovery**

List collection names once. When `collectionContext` is present and valid, read that collection's `$jsonSchema` validator when available, sample at most 20 documents, serialize samples through existing Canonical EJSON helpers, and merge unique field paths from validation metadata and samples to depth two. Do not sample every collection.

- [ ] **Step 4: Add the metadata route**

The route validates the optional collection name, opens only the request database, and returns sorted collection and field names.

- [ ] **Step 5: Run helper and route tests**

Run: `bun vitest --run test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.spec.ts test/unit/server/api/mongodb/mongodb-raw-query-metadata-route.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit metadata discovery**

```bash
git add server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.ts server/api/mongodb/raw-query-metadata.post.ts test/unit/server/infrastructure/nosql/mongodb/raw-query/mongo-raw-query-metadata.spec.ts test/unit/server/api/mongodb/mongodb-raw-query-metadata-route.spec.ts
git commit -m "feat(mongodb): expose raw query metadata"
```

### Task 8: Client NDJSON Transport and Approval Client

**Files:**

- Create: `components/modules/raw-query/mongo/api/executeMongoRawQuery.ts`
- Create: `components/modules/raw-query/mongo/api/index.ts`
- Test: `test/unit/components/modules/raw-query/mongo/executeMongoRawQuery.spec.ts`

**Interfaces:**

- Consumes: shared Task 1 messages and existing `getConnectionParams()` output.
- Produces: `executeMongoRawQuery(options)` and `approveMongoRawQuery(challengeId)`.

- [ ] **Step 1: Write stream parsing tests with a fake ReadableStream**

```ts
it('dispatches rows, logs, approval, and completion events', async () => {
  fetchMock.mockResolvedValue(
    ndjsonResponse([
      {
        type: 'meta',
        resultKind: 'cursor',
        fields: [{ name: 'name' }],
        command: 'MONGODB',
      },
      { type: 'rows', data: [{ name: 'Alice' }] },
      { type: 'log', entry: { level: 'log', args: ['loaded'] } },
      { type: 'done', rowCount: 1, queryTime: 4, truncated: false },
    ])
  );

  const execution = executeMongoRawQuery(options);
  await execution.finished;

  expect(options.onRows).toHaveBeenCalledWith([{ name: 'Alice' }], 1);
  expect(options.onLog).toHaveBeenCalled();
  expect(options.onDone).toHaveBeenCalledWith(
    expect.objectContaining({ rowCount: 1 })
  );
});
```

- [ ] **Step 2: Run the transport test and confirm failure**

Run: `bun vitest --run test/unit/components/modules/raw-query/mongo/executeMongoRawQuery.spec.ts`

Expected: FAIL because the client API module does not exist.

- [ ] **Step 3: Implement the typed stream parser**

```ts
export interface MongoRawQueryExecution {
  finished: Promise<void>;
  abort(): void;
}

export function executeMongoRawQuery(
  options: MongoRawQueryRequest & MongoRawQueryCallbacks
): MongoRawQueryExecution;

export function approveMongoRawQuery(
  challengeId: string
): Promise<MongoRawQueryApprovalResponse>;
```

Use one `TextDecoder` buffer, validate parsed objects with `isMongoRawQueryStreamMessage()`, count rows client-side, report malformed lines through `onError`, and treat `AbortError` as cancellation rather than a driver error.

- [ ] **Step 4: Run the transport tests**

Run: `bun vitest --run test/unit/components/modules/raw-query/mongo/executeMongoRawQuery.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the client transport**

```bash
git add components/modules/raw-query/mongo/api test/unit/components/modules/raw-query/mongo/executeMongoRawQuery.spec.ts
git commit -m "feat(mongodb): add raw query stream client"
```

### Task 9: Mongo TypeScript Editor, Metadata Cache, and Completions

**Files:**

- Create: `components/modules/raw-query/mongo/constants/mongoScriptCatalog.ts`
- Create: `components/modules/raw-query/mongo/utils/createMongoScriptCompletionSource.ts`
- Create: `components/modules/raw-query/mongo/utils/resolveMongoScriptSource.ts`
- Create: `components/modules/raw-query/mongo/hooks/useMongoScriptMetadata.ts`
- Create: `components/modules/raw-query/mongo/hooks/useMongoScriptEditorExtensions.ts`
- Create: `components/modules/raw-query/mongo/constants/index.ts`
- Create: `components/modules/raw-query/mongo/utils/index.ts`
- Create: `components/modules/raw-query/mongo/hooks/index.ts`
- Test: `test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts`
- Test: `test/unit/components/modules/raw-query/mongo/resolveMongoScriptSource.spec.ts`

**Interfaces:**

- Consumes: `@codemirror/lang-javascript`, current autocomplete UI, connection params, Task 7 metadata endpoint, and Task 2 operation names mirrored as browser-safe catalog data.
- Produces: `useMongoScriptEditorExtensions()`, `useMongoScriptMetadata()`, `createMongoScriptCompletionSource()`, and `resolveMongoScriptSource()`.

- [ ] **Step 1: Write execution-source tests**

```ts
it('uses selected text when the selection is non-empty', () => {
  const view = createEditorView('const a = 1\nreturn a', { from: 12, to: 20 });
  expect(resolveMongoScriptSource(view)).toMatchObject({
    text: 'return a',
    from: 12,
    to: 20,
  });
});

it('uses the full file when there is no selection', () => {
  const source = 'const a = 1\nreturn a';
  expect(resolveMongoScriptSource(createEditorView(source))).toEqual({
    text: source,
    from: 0,
    to: source.length,
  });
});
```

- [ ] **Step 2: Write contextual completion tests**

```ts
it('suggests collections inside db.collection()', async () => {
  const labels = await completionLabels(`return db.collection('us|')`, {
    collections: ['users', 'orders'],
    fieldsByCollection: {},
  });
  expect(labels).toContain('users');
});

it('tracks a simple collection alias', async () => {
  const labels = await completionLabels(
    `const users = db.collection('users')\nusers.|`,
    metadata
  );
  expect(labels).toEqual(
    expect.arrayContaining(['find', 'updateMany', 'aggregate'])
  );
});

it('marks write methods as requiring confirmation', async () => {
  expect(await completionDetail(`db.collection('users').updateM|`)).toContain(
    'Requires confirmation'
  );
});
```

- [ ] **Step 3: Run the editor tests and confirm failure**

Run: `bun vitest --run test/unit/components/modules/raw-query/mongo/resolveMongoScriptSource.spec.ts test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts`

Expected: FAIL because the Mongo editor modules do not exist.

- [ ] **Step 4: Implement the static catalog and syntax-aware completion source**

Define database, collection, cursor, BSON, filter, aggregation, and update entries with CodeMirror `type`, `detail`, `info`, and snippet `apply` functions. Use the JavaScript Lezer tree plus bounded source inspection to identify:

- `db.` database context.
- `db.collection('...')` collection-name context.
- Collection/cursor method chains.
- Filter, projection, update, and aggregation object positions.
- Simple aliases assigned directly from `db.collection()` or a cursor-producing call.

- [ ] **Step 5: Implement lazy metadata caching**

```ts
const metadataCache = new Map<string, MongoRawQueryMetadata>();

export function useMongoScriptMetadata(options: {
  connection: Ref<Connection | undefined>;
  databaseName: Ref<string | undefined>;
  collectionContext: Ref<string | undefined>;
}) {
  return { metadata, isLoading, error, refresh };
}
```

Key cache entries by connection ID, database, and collection context. Clear/reload when any key part changes; do not fetch on each completion invocation.

- [ ] **Step 6: Assemble Mongo editor extensions**

Use `javascript({ typescript: true })`, the existing custom autocomplete UI, `placeholder()` from CodeMirror view, `lintGutter()`, execute keymap, and a warning linter when the full script has no top-level return. The ghost text is:

```ts
return db.collection('COLLECTION').find({}).limit(100)
```

Replace `COLLECTION` with the tab collection context only for display; never write the placeholder into the model value.

```ts
export function useMongoScriptEditorExtensions(options: {
  codeEditorRef: Ref<InstanceType<typeof BaseCodeEditor> | null>;
  fileVariables: Ref<string>;
  databaseName: Ref<string | undefined>;
  collectionContext: Ref<string | undefined>;
  onExecuteCurrent: () => void | Promise<void>;
}) {
  return {
    extensions,
    reloadMongoCompartment,
  };
}
```

The Mongo extension group owns its `Mod-Enter` keymap. It must call `options.onExecuteCurrent()` directly and must not call `getCurrentStatement()` or install SQL current-statement gutters/parser state.

- [ ] **Step 7: Run the editor tests**

Run: `bun vitest --run test/unit/components/modules/raw-query/mongo/resolveMongoScriptSource.spec.ts test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts`

Expected: PASS.

- [ ] **Step 8: Commit the Mongo editor**

```bash
git add components/modules/raw-query/mongo/constants components/modules/raw-query/mongo/utils components/modules/raw-query/mongo/hooks test/unit/components/modules/raw-query/mongo/resolveMongoScriptSource.spec.ts test/unit/components/modules/raw-query/mongo/mongoScriptCompletion.spec.ts
git commit -m "feat(mongodb): add raw query editor suggestions"
```

### Task 10: Raw Query Execution Facade Integration

**Files:**

- Create: `components/modules/raw-query/mongo/hooks/useMongoScriptExecution.ts`
- Create: `components/modules/raw-query/mongo/index.ts`
- Modify: `components/modules/raw-query/hooks/useRawQueryEditor.ts`
- Modify: `components/modules/raw-query/RawQuery.vue`
- Modify: `components/modules/raw-query/interfaces/index.ts`
- Test: `test/unit/components/modules/raw-query/mongo/useMongoScriptExecution.spec.ts`
- Test: `test/nuxt/components/modules/raw-query/useRawQueryEditorMongoDispatch.test.ts`
- Test: `test/nuxt/components/modules/raw-query/RawQueryMongoMode.test.ts`

**Interfaces:**

- Consumes: Tasks 8-9 and existing `ResultTabsReturn`.
- Produces: Mongo branch through the existing `useRawQueryEditor()` public API plus `pendingMongoApproval`, `confirmMongoWrite()`, `cancelMongoWrite()`, and `reloadLanguageCompartment()`.

- [ ] **Step 1: Write the Mongo execution-hook test**

```ts
it('creates one result tab and streams cursor batches into it', async () => {
  const hook = useMongoScriptExecution(fixtureOptions);
  const source = `return db.collection('users').find({})`;
  await hook.execute({ text: source, from: 0, to: source.length });

  streamCallbacks.onMeta?.({
    resultKind: 'cursor',
    fields: [{ name: 'name' }],
    command: 'MONGODB',
  });
  streamCallbacks.onRows?.([{ name: 'Alice' }], 1);
  streamCallbacks.onDone?.({ rowCount: 1, queryTime: 5, truncated: false });

  expect(resultTabs.addResultTab).toHaveBeenCalledOnce();
  expect(resultTabs.refreshResultTab).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({ result: [{ name: 'Alice' }] })
  );
});
```

- [ ] **Step 2: Write the Raw Query Mongo-mode component test**

Mount `RawQuery.vue` with a selected Mongo connection and a CodeQuery tab whose metadata contains `{ queryContext: { kind: 'mongodb', databaseName: 'orcaq_fixture', collectionName: 'users' } }`. Assert that SQL format/explain controls are hidden, variables remain visible, and the editor receives Mongo extensions.

- [ ] **Step 3: Write facade dispatch and shortcut tests**

```ts
it('executes the selection for Mongo and keeps SQL statement execution unchanged', async () => {
  const editor = mountRawQueryEditorFacade({
    connectionType: DatabaseClientType.MONGODB,
  });
  editor.setDocument(
    'const users = db.collection("users")\nreturn users.find({})'
  );
  editor.setSelection(37, 58);

  await editor.facade.onExecuteCurrent();

  expect(executeMongoMock).toHaveBeenCalledWith({
    text: 'return users.find({})',
    from: 37,
    to: 58,
  });
  expect(executeSqlMock).not.toHaveBeenCalled();

  editor.setConnectionType(DatabaseClientType.POSTGRES);
  await editor.facade.onExecuteCurrent();
  expect(executeSqlMock).toHaveBeenCalledOnce();
});

it('routes Mod-Enter through the active editor-mode keymap', async () => {
  const editor = mountRawQueryEditorFacade({
    connectionType: DatabaseClientType.MONGODB,
  });
  await editor.pressModEnter();

  expect(executeMongoMock).toHaveBeenCalledOnce();
  expect(executeSqlMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Run the focused tests and confirm failure**

Run: `bun vitest --run test/unit/components/modules/raw-query/mongo/useMongoScriptExecution.spec.ts test/nuxt/components/modules/raw-query/useRawQueryEditorMongoDispatch.test.ts test/nuxt/components/modules/raw-query/RawQueryMongoMode.test.ts`

Expected: FAIL because Raw Query has no Mongo execution branch.

- [ ] **Step 5: Implement `useMongoScriptExecution()`**

```ts
export function useMongoScriptExecution(options: {
  connection: Ref<Connection | undefined>;
  databaseName: Ref<string | undefined>;
  collectionContext: Ref<string | undefined>;
  documentText: Ref<string>;
  fileVariables: Ref<string>;
  resultTabs: ResultTabsReturn;
  fieldDefs: Ref<FieldDef[]>;
  beforeExecute?: () => Promise<boolean>;
}) {
  return {
    execute,
    cancel,
    pendingApproval,
    confirmPendingWrite,
    cancelPendingWrite,
    queryProcessState,
    currentRawQueryResult,
    rawResponse,
  };
}
```

Parse file variables strictly for Mongo, require a selected database, and build the request from `getConnectionParams(connection.value)` plus `connectionId`, `database: databaseName.value`, and `collectionContext`. Create the result tab before starting the stream, append rows in a non-reactive accumulator, record logs/raw results/mutation summaries/truncation, and reuse the same result tab when a confirmed write reruns. Watch connection ID, database, collection context, `documentText`, and variables; changing any of them clears a pending challenge so confirmation can never execute stale editor content.

- [ ] **Step 6: Dispatch execution in `useRawQueryEditor()` without changing SQL/Redis execution**

Extend the `useRawQueryEditor()` options object with `databaseName: Ref<string | undefined>`, `collectionContext: Ref<string | undefined>`, and `documentText: Ref<string>`. Keep `useQueryExecution()` unchanged as the SQL/Redis implementation. Instantiate both execution hooks with the same `resultTabs`, then expose one facade:

```ts
const isMongoConnection = computed(
  () => connection.value?.type === DatabaseClientType.MONGODB
);

const sqlExecution = useQueryExecution({
  getEditorView,
  connection,
  redisDatabaseIndex,
  fileVariables,
  fieldDefs,
  resultTabs,
  buildExplainAnalyzePrefix,
  beforeExecute,
  promptMissingVariables,
  onUpdateVariables,
});

const mongoExecution = useMongoScriptExecution({
  connection,
  databaseName,
  collectionContext,
  documentText,
  fileVariables,
  fieldDefs,
  resultTabs,
  beforeExecute,
});

const onExecuteCurrent = async () => {
  const editorView = getEditorView();
  if (!editorView) return;

  if (isMongoConnection.value) {
    await mongoExecution.execute(resolveMongoScriptSource(editorView));
    return;
  }

  await sqlExecution.onExecuteCurrent();
};

const cancelStreamingQuery = () => {
  if (isMongoConnection.value) mongoExecution.cancel();
  else sqlExecution.cancelStreamingQuery();
};
```

Return computed facades for `currentRawQueryResult`, `rawResponse`, and `queryProcessState` that select the active execution hook. Route Explain Analyze directly to `sqlExecution`; Mongo UI never exposes that action.

```ts
return {
  // existing editor and result-tab facade fields stay available
  onExecuteCurrent,
  cancelStreamingQuery,
  currentRawQueryResult: computed(() =>
    isMongoConnection.value
      ? mongoExecution.currentRawQueryResult.value
      : sqlExecution.currentRawQueryResult.value
  ),
  rawResponse: computed(() =>
    isMongoConnection.value
      ? mongoExecution.rawResponse.value
      : sqlExecution.rawResponse.value
  ),
  queryProcessState: computed(() =>
    isMongoConnection.value
      ? mongoExecution.queryProcessState
      : sqlExecution.queryProcessState
  ),
  pendingMongoApproval: mongoExecution.pendingApproval,
  confirmMongoWrite: mongoExecution.confirmPendingWrite,
  cancelMongoWrite: mongoExecution.cancelPendingWrite,
};
```

- [ ] **Step 7: Switch complete CodeMirror mode groups through one compartment**

`BaseCodeEditor.vue` snapshots `props.extensions` when it mounts, so do not rely on a computed extensions array. Keep the existing SQL/Redis extension hook intact, let the Mongo hook own its `Mod-Enter` keymap, and install exactly one active mode group in an outer compartment:

```ts
const sqlEditor = useSqlEditorExtensions({
  codeEditorRef,
  fileVariables,
  connection,
  onExecuteStatement: sqlExecution.executeCurrentStatement,
  onExplainAnalyzeCurrent: sqlExecution.onExplainAnalyzeCurrent,
});

const mongoEditor = useMongoScriptEditorExtensions({
  codeEditorRef,
  fileVariables,
  databaseName,
  collectionContext,
  onExecuteCurrent,
});

const editorModeCompartment = new Compartment();
const activeModeExtensions = () =>
  isMongoConnection.value ? mongoEditor.extensions : sqlEditor.extensions;
const extensions = [editorModeCompartment.of(activeModeExtensions())];

const reloadLanguageCompartment = () => {
  const editorView = getEditorView();
  if (!editorView) return;

  editorView.dispatch({
    effects: editorModeCompartment.reconfigure(activeModeExtensions()),
  });
};

watch(
  [
    () => codeEditorRef.value?.editorView,
    () => connection.value?.type,
    () => databaseName.value,
    () => collectionContext.value,
  ],
  reloadLanguageCompartment,
  { flush: 'post', immediate: true }
);
```

Only the SQL group contains `shortCutExecuteCurrentStatement()`, current-statement highlighting, SQL parser state, format keys, and Explain. Only the Mongo group contains `javascript({ typescript: true })`, Mongo completion/lint/placeholder, and a `Mod-Enter` keymap that invokes the facade `onExecuteCurrent()`. Keep `reloadSqlCompartment` as a compatibility alias: it calls `reloadLanguageCompartment()` in Mongo mode and `sqlEditor.reloadSqlCompartment()` otherwise.

Add `extensions`, `reloadLanguageCompartment`, and the compatibility `reloadSqlCompartment` alias to the final `useRawQueryEditor()` return object.

- [ ] **Step 8: Pass typed tab query context through `RawQuery.vue`**

Read `useTabViewsStore().activeTab` and narrow its metadata to `CodeQueryMetadata`. Derive `mongoDatabaseName` from `queryContext.databaseName`, falling back to `connection.value.database` for an existing/manual query file, and derive `mongoCollectionContext` only from Mongo tab metadata. Pass both refs and `fileContents` as `documentText` into `useRawQueryEditor()`. Set `isFormatSupported` to false for Mongo and Redis, keep Mongo variables enabled, and hide SQL-only format/explain actions. Task 11 consumes the pending-approval facade state to render the dialog.

- [ ] **Step 9: Run hook and Nuxt tests**

Run: `bun vitest --run test/unit/components/modules/raw-query/mongo/useMongoScriptExecution.spec.ts test/nuxt/components/modules/raw-query/useRawQueryEditorMongoDispatch.test.ts test/nuxt/components/modules/raw-query/RawQueryMongoMode.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit the Raw Query facade integration**

```bash
git add components/modules/raw-query/mongo components/modules/raw-query/hooks/useRawQueryEditor.ts components/modules/raw-query/RawQuery.vue components/modules/raw-query/interfaces/index.ts test/unit/components/modules/raw-query/mongo/useMongoScriptExecution.spec.ts test/nuxt/components/modules/raw-query/useRawQueryEditorMongoDispatch.test.ts test/nuxt/components/modules/raw-query/RawQueryMongoMode.test.ts
git commit -m "feat(mongodb): integrate raw query execution"
```

### Task 11: Write Confirmation and Mongo Result Presentation

**Files:**

- Create: `components/modules/raw-query/mongo/components/MongoRawQueryApprovalDialog.vue`
- Create: `components/modules/raw-query/mongo/components/MongoRawQueryConsole.vue`
- Create: `components/modules/raw-query/mongo/components/index.ts`
- Modify: `components/modules/raw-query/RawQuery.vue`
- Modify: `components/modules/raw-query/components/RawQueryEditorHeader.vue`
- Modify: `components/modules/raw-query/components/RawQueryEditorFooter.vue`
- Modify: `components/modules/raw-query/components/RawQueryResultTabs.vue`
- Modify: `components/modules/raw-query/components/result-tab/ResultTabInfoView.vue`
- Modify: `components/modules/raw-query/components/result-tab/ResultTabRawView.vue`
- Test: `test/nuxt/components/modules/raw-query/MongoRawQueryApprovalDialog.test.ts`
- Test: `test/nuxt/components/modules/raw-query/MongoRawQueryResults.test.ts`

**Interfaces:**

- Consumes: pending approval/result metadata from Task 10.
- Produces: confirmation UI and result rendering for Mongo cursor/value/mutation/log output.

- [ ] **Step 1: Write the approval dialog test**

```ts
it('renders the operation manifest and emits an explicit confirmation', async () => {
  const wrapper = mount(MongoRawQueryApprovalDialog, {
    props: {
      open: true,
      loading: false,
      operations: [
        {
          id: 'update:12',
          target: 'collection',
          collection: 'users',
          method: 'updateMany',
          dynamicTarget: false,
          risk: 'write',
          summary: `{ $set: { active: true } }`,
        },
      ],
    },
  });

  expect(wrapper.text()).toContain('updateMany');
  expect(wrapper.text()).toContain('users');
  await wrapper.get('[data-testid="confirm-mongo-raw-write"]').trigger('click');
  expect(wrapper.emitted('confirm')).toHaveLength(1);
});
```

- [ ] **Step 2: Write result-view tests**

```ts
it('renders mutation counts and console output', () => {
  const wrapper = mount(ResultTabInfoView, {
    props: {
      activeTab: mongoExecutedResult({
        resultKind: 'mutation',
        mutationSummary: {
          acknowledged: true,
          matchedCount: 2,
          modifiedCount: 2,
        },
        logs: [{ level: 'log', args: ['updated', 2] }],
      }),
    },
  });

  expect(wrapper.text()).toContain('Modified');
  expect(wrapper.text()).toContain('2');
  expect(wrapper.text()).toContain('updated');
});

it('renders cursor truncation metadata', () => {
  const wrapper = mount(ResultTabInfoView, {
    props: {
      activeTab: mongoExecutedResult({
        resultKind: 'cursor',
        truncated: true,
        rowCount: 10_000,
      }),
    },
  });

  expect(wrapper.text()).toContain('Truncated at 10,000 documents');
});

it('renders Canonical Extended JSON without coercing BSON values', () => {
  const rawData = { _id: { $oid: '507f1f77bcf86cd799439011' } };
  const wrapper = mount(ResultTabRawView, { props: { rawData } });

  expect(wrapper.text()).toContain('507f1f77bcf86cd799439011');
  expect(wrapper.text()).toContain('$oid');
});
```

- [ ] **Step 3: Run the Nuxt tests and confirm failure**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/raw-query/MongoRawQueryApprovalDialog.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryResults.test.ts`

Expected: FAIL because the components and metadata rendering do not exist.

- [ ] **Step 4: Implement the confirmation dialog**

Reuse the existing Dialog, Button, and Badge components. Show operation, collection, risk, and redacted summary; use `data-testid="mongo-raw-query-approval-dialog"` and `data-testid="confirm-mongo-raw-write"`. The primary action text is `Confirm and run`; cancel leaves the result tab in Info with `Execution cancelled before write`.

- [ ] **Step 5: Extend result metadata and views**

Add optional `resultKind`, `rawResult`, `logs`, `mutationSummary`, and `truncated` fields to `ExecutedResultItem.metadata`. `ResultTabRawView` accepts `rawData: unknown`; `ResultTabInfoView` renders mutation summary and `MongoRawQueryConsole`; `RawQueryResultTabs` skips SQL schema metadata loading for Mongo connections and disables Explain/Chart where the result kind is not tabular.

- [ ] **Step 6: Update Raw Query header/footer copy**

Show the selected Mongo database and a `Beta` badge in the header. Change the footer button label to `Execute script` in Mongo mode while retaining `Execute current` for SQL/Redis. Keep Run/Cancel and `Cmd/Ctrl+Enter` behavior unchanged.

- [ ] **Step 7: Run the Nuxt tests**

Run: `bun vitest --run --project nuxt test/nuxt/components/modules/raw-query/MongoRawQueryApprovalDialog.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryResults.test.ts test/nuxt/components/modules/raw-query/RawQueryResultTabs.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the write/result UI**

```bash
git add components/modules/raw-query/mongo/components components/modules/raw-query/RawQuery.vue components/modules/raw-query/components/RawQueryEditorHeader.vue components/modules/raw-query/components/RawQueryEditorFooter.vue components/modules/raw-query/components/RawQueryResultTabs.vue components/modules/raw-query/components/result-tab/ResultTabInfoView.vue components/modules/raw-query/components/result-tab/ResultTabRawView.vue components/modules/raw-query/interfaces/index.ts test/nuxt/components/modules/raw-query/MongoRawQueryApprovalDialog.test.ts test/nuxt/components/modules/raw-query/MongoRawQueryResults.test.ts
git commit -m "feat(mongodb): confirm and render raw query writes"
```

### Task 12: Mongo Query-File Entry Point and Capability Gating

**Files:**

- Modify: `core/constants/connection-capabilities.ts`
- Modify: `core/types/entities/tab-view.entity.ts`
- Modify: `core/composables/useTabManagement.ts`
- Modify: `components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue`
- Test: `test/unit/core/constants/connection-capabilities.spec.ts`
- Test: `test/unit/core/composables/useTabManagement.spec.ts`
- Test: `test/nuxt/components/modules/management/schemas/mongodb/ManagementMongoSchemas.test.ts`

**Interfaces:**

- Consumes: current query-file store and `openCodeQueryTab()`.
- Produces: `MongoCodeQueryContext`, `WorkspaceTabOpenAction.MongoCollectionRawQuery`, and `openNewMongoQueryTab({ databaseName, collectionName? })`.

- [ ] **Step 1: Extend the capability test**

```ts
it('allows MongoDB query files without enabling raw SQL', () => {
  const profile = getConnectionCapabilityProfile(mongoConnection);
  expect(profile.allowedTabTypes).toContain(TabViewType.CodeQuery);
  expect(profile.supportsQueryFiles).toBe(true);
  expect(profile.supportsRawSql).toBe(false);
  expect(profile.primaryQuerySurface).toBe('raw-query');
});
```

- [ ] **Step 2: Write extensionless tab-creation and Mongo schema action tests**

```ts
it('creates an extensionless query file and keeps Mongo context on the tab', async () => {
  createNextQueryFileMock.mockResolvedValue({
    id: 'query-1',
    title: 'new-file',
    icon: 'lucide:file',
  });

  await useTabManagement().openNewMongoQueryTab({
    databaseName: 'orcaq_fixture',
    collectionName: 'users',
  });

  expect(createNextQueryFileMock).toHaveBeenCalledWith(
    expect.objectContaining({
      newFileBaseName: 'new-file',
      extension: undefined,
    })
  );
  expect(openCodeQueryTabMock).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'new-file',
      metadata: expect.objectContaining({
        queryContext: {
          kind: 'mongodb',
          databaseName: 'orcaq_fixture',
          collectionName: 'users',
        },
      }),
    })
  );
});

it('opens a raw query from the collection menu', async () => {
  const wrapper = mountMongoSchemasWithCollection('orcaq_fixture', 'users');
  await wrapper
    .get('[data-testid="mongo-collection-menu-users"]')
    .trigger('click');
  await wrapper
    .get('[data-testid="new-mongo-raw-query-users"]')
    .trigger('click');

  expect(openNewMongoQueryTabMock).toHaveBeenCalledWith({
    databaseName: 'orcaq_fixture',
    collectionName: 'users',
  });
});
```

- [ ] **Step 3: Run the tests and confirm failure**

Run: `bun vitest --run test/unit/core/constants/connection-capabilities.spec.ts test/unit/core/composables/useTabManagement.spec.ts test/nuxt/components/modules/management/schemas/mongodb/ManagementMongoSchemas.test.ts`

Expected: FAIL because Mongo CodeQuery and the action are not available.

- [ ] **Step 4: Add typed CodeQuery context and tab creation**

```ts
export interface MongoCodeQueryContext {
  kind: 'mongodb';
  databaseName: string;
  collectionName?: string;
}

export enum WorkspaceTabOpenAction {
  SqlShortcut = 'sql-shortcut',
  NewSqlFile = 'new-sql-file',
  InstanceInsights = 'instance-insights',
  MongoCollectionRawQuery = 'mongo-collection-raw-query',
}

export interface CodeQueryMetadata extends BaseTabMetadata {
  type: TabViewType.CodeQuery;
  queryId?: string;
  fileSource?: WorkspaceSqlFileSource;
  queryContext?: MongoCodeQueryContext;
}
```

`openNewMongoQueryTab()` uses the store's existing generic `createNextQueryFile()` path with an extensionless naming config, then calls `openCodeQueryTab()` with `queryContext`:

```ts
const MONGO_QUERY_FILE_CONFIG = {
  starterFileName: 'sample',
  newFileBaseName: 'new-file',
  extension: undefined,
} satisfies QueryFileNamingConfig;

const openNewMongoQueryTab = async (params: {
  databaseName: string;
  collectionName?: string;
}) => {
  const file = await explorerFileStore.createNextQueryFile(
    MONGO_QUERY_FILE_CONFIG
  );
  if (!file) return;

  await openCodeQueryTab({
    id: file.id,
    name: file.title,
    icon: file.icon,
    metadata: {
      fileSource: WorkspaceSqlFileSource.ManualCreate,
      openAction: WorkspaceTabOpenAction.MongoCollectionRawQuery,
      queryContext: {
        kind: 'mongodb',
        databaseName: params.databaseName,
        collectionName: params.collectionName,
      },
    },
  });
};
```

Do not store the context in `RowQueryFile`; it belongs to the tab/opening context. Do not add `.mongo.ts`, `.ts`, or `.sql` to files created by this Mongo action.

- [ ] **Step 5: Add the collection action in both menus**

Add `New Raw Query` with verified `hugeicons:code` to the collection context menu and collection dropdown menu. Give the dropdown trigger `data-testid="mongo-collection-menu-${node.name}"` and the action `data-testid="new-mongo-raw-query-${node.name}"` for the focused component and Playwright tests. Database folders do not receive the action in V1 because the approved placeholder and field suggestions are collection-contextual.

- [ ] **Step 6: Enable Mongo CodeQuery capability**

Add `TabViewType.CodeQuery` to `MONGODB_TAB_TYPES`, set `supportsQueryFiles: true`, and set `primaryQuerySurface: 'raw-query'`. Keep `supportsRawSql: false`.

- [ ] **Step 7: Run capability and component tests**

Run: `bun vitest --run test/unit/core/constants/connection-capabilities.spec.ts test/unit/core/composables/useTabManagement.spec.ts test/nuxt/components/modules/management/schemas/mongodb/ManagementMongoSchemas.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the entry point**

```bash
git add core/constants/connection-capabilities.ts core/types/entities/tab-view.entity.ts core/composables/useTabManagement.ts components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue test/unit/core/constants/connection-capabilities.spec.ts test/unit/core/composables/useTabManagement.spec.ts test/nuxt/components/modules/management/schemas/mongodb/ManagementMongoSchemas.test.ts
git commit -m "feat(mongodb): open raw query files from collections"
```

### Task 13: MongoDB Integration Coverage

**Files:**

- Create: `test/api/mongodb/mongodb-raw-query.test.ts`
- Modify: `test/api/support/mongo-connection.ts`

**Interfaces:**

- Consumes: completed server endpoints and the existing Mongo fixture.
- Produces: fixture-backed proof of read streaming, approval safety, writes, BSON fidelity, limits, and database isolation.

- [ ] **Step 1: Add an NDJSON integration helper**

```ts
async function executeScript(body: Record<string, unknown>) {
  const response = await fetch(url('/api/mongodb/raw-query-stream'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mongoRawQueryBody(body)),
  });
  const messages = (await response.text())
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as MongoRawQueryStreamMessage);
  return { response, messages };
}
```

Extend support with `mongoRawQueryBody()` that supplies `type: 'mongodb'`, a stable fixture `connectionId`, and existing host/port/database values.

- [ ] **Step 2: Write a cursor streaming test**

Execute:

```ts
return db.collection('users').find({ active: true }).sort({ name: 1 })
```

Assert `meta`, at least one `rows` batch, names `Alice` and `Bob`, and `done.truncated === false`.

- [ ] **Step 3: Write the write-confirmation round trip**

Execute an `updateOne` script without a token, assert `approval-required`, query the fixture directly to prove no change, approve the challenge, rerun with the token, assert `modifiedCount === 1`, and restore the document in `finally`.

- [ ] **Step 4: Add security and fidelity cases**

Cover `ObjectId` parameters, Decimal128 return values, forbidden `process`, rejected `$function`, token replay, changed parameters, timeout with a test-only 100 ms request, and a rejected attempt to access a different database.

- [ ] **Step 5: Run only the Mongo integration file with the Mongo fixture**

Run:

```bash
bash scripts/test-services/run-tests.sh --fixtures=mongodb -- bun vitest --run --project integration test/api/mongodb/mongodb-raw-query.test.ts
```

Expected: PASS; the wrapper starts and stops only MongoDB.

- [ ] **Step 6: Commit the integration tests**

```bash
git add test/api/mongodb/mongodb-raw-query.test.ts test/api/support/mongo-connection.ts
git commit -m "test(mongodb): cover raw query integration"
```

### Task 14: MongoDB Playwright Flow and Documentation

**Files:**

- Modify: `playwright.config.ts`
- Modify: `test/playwright/global-setup.ts`
- Create: `test/playwright/mongodb/mongodb-raw-query.spec.ts`
- Modify: `docs/TESTING_GUIDE.md`
- Modify: `components/modules/raw-query/docs/01-architecture.md`
- Modify: `components/modules/raw-query/docs/02-query-execution.md`
- Modify: `components/modules/raw-query/docs/04-features.md`

**Interfaces:**

- Consumes: completed feature and existing Mongo fixture/connection wizard.
- Produces: an isolated `mongodb` Playwright project and updated durable documentation.

- [ ] **Step 1: Register the Mongo Playwright project and fixture metadata**

Add:

```ts
createDbProject('mongodb', 'mongodb');
```

to `playwright.config.ts`. Add a sanitized Mongo fixture entry containing only host, port, database, and source to `test/playwright/global-setup.ts`; do not persist credentials or source code.

- [ ] **Step 2: Write the end-to-end flow**

The test must:

1. Create a workspace and MongoDB fixture connection.
2. Connect and switch the activity bar to Schemas.
3. Open the `users` collection menu and choose `New Raw Query`.
4. Assert the editor is empty while its placeholder references `users`.
5. Enter `return db.collection('users').find({ active: true }).sort({ name: 1 })`.
6. Execute and assert streamed rows include Alice and Bob.
7. Replace the script with an `updateOne` statement.
8. Assert the write dialog appears before the document changes.
9. Click `Confirm and run`, assert the mutation summary, and restore the fixture document through the Mongo driver in test cleanup.
10. Reload the page and assert the query file content reopens in Mongo mode.

- [ ] **Step 3: Run the Mongo Playwright project**

Run:

```bash
bash scripts/test-services/run-tests.sh --fixtures=mongodb -- bunx playwright test --project mongodb
```

Expected: PASS.

- [ ] **Step 4: Update feature and testing documentation**

Document connection-driven Mongo TypeScript mode, the Beta label, selection-or-full-file execution, injected capabilities, approval flow, NDJSON event additions, limits, unsupported V1 APIs, the `mongodb` Playwright project, and the Mongo-only fixture command.

- [ ] **Step 5: Run final verification**

Run in this order:

```bash
bun run typecheck
bun test:unit
bun test:nuxt
bash scripts/test-services/run-tests.sh --fixtures=mongodb -- bun vitest --run --project integration test/api/mongodb/mongodb-raw-query.test.ts
bash scripts/test-services/run-tests.sh --fixtures=mongodb -- bunx playwright test --project mongodb
bun run format:check
git diff --check
graphify update .
git status --short
```

Expected: every command passes. `git status --short` may show the intended source, test, documentation, lockfile, and regenerated `graphify-out/` changes only.

- [ ] **Step 6: Commit documentation and final verification changes**

```bash
git add playwright.config.ts test/playwright/global-setup.ts test/playwright/mongodb/mongodb-raw-query.spec.ts docs/TESTING_GUIDE.md components/modules/raw-query/docs/01-architecture.md components/modules/raw-query/docs/02-query-execution.md components/modules/raw-query/docs/04-features.md graphify-out
git commit -m "test(mongodb): verify raw query workflow"
```

## Completion Criteria

- MongoDB collection menus create an extensionless workspace query file and open it in Mongo TypeScript mode.
- CodeMirror provides collection, field, API, BSON, operator, cursor, and snippet suggestions without loading metadata on every keystroke.
- Selected text or the full script runs inside a bounded SES worker with no Node, filesystem, network, or credential capability.
- Every native Mongo operation is allowlisted and re-authorized by the parent capability host.
- Writes do not touch MongoDB until a matching one-time approval is confirmed.
- Cursor results stream, cancel, truncate, and preserve BSON fidelity in existing result tabs.
- SQL and Redis behavior and tests remain unchanged.
- Typecheck, unit, Nuxt, Mongo integration, Mongo Playwright, formatting, diff checks, and graph update all pass.
