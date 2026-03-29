# Migration Guide

> **System:** Schema-version migration for OrcaQ persist collections
> **Location:** `core/persist/adapters/migration/`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [When to Write a Migration](#3-when-to-write-a-migration)
4. [Step-by-Step: Writing a Migration](#4-step-by-step-writing-a-migration)
5. [Registering the Migration](#5-registering-the-migration)
6. [Testing the Migration](#6-testing-the-migration)
7. [How the Loading Screen Works](#7-how-the-loading-screen-works)
8. [Production Rollout Checklist](#8-production-rollout-checklist)
9. [Rules and Invariants](#9-rules-and-invariants)
10. [Reference: Available Collections](#10-reference-available-collections)
11. [Reference: File Map](#11-reference-file-map)

---

## 1. Overview

OrcaQ stores domain data in a local-first database — IndexedDB on web, native KV on Tauri/Electron. When the on-disk document shape changes between releases, a **schema migration** transforms the old documents to the new shape before the app reads them.

There are **two separate migration systems** in this codebase:

| System | What it does | Entry point |
|---|---|---|
| **Schema migration** ← this doc | Upgrades document shapes when fields are added, removed, or renamed | `runSchemaMigrations()` |
| Platform migration | One-time copy of IDB data into the Tauri native store | `runPlatformMigration()` |

This guide covers **schema migrations only**.

---

## 2. Architecture

```
core/persist/adapters/migration/
├── types.ts                 ← VersionedMigration interface
├── migrationRunner.ts       ← runSchemaMigrations() — groups, sorts, applies
├── schemaVersionStore.ts    ← reads/writes per-collection version in KV
├── versions/
│   ├── index.ts             ← ALL_MIGRATIONS list (edit to add steps)
│   ├── workspaces/
│   │   ├── types.ts         ← historical WorkspaceV1, WorkspaceV2, … shapes
│   │   └── v002-*.ts        ← one file per migration step
│   └── connections/
│       ├── types.ts
│       └── v002-*.ts
└── platform/
    ├── platformMigrationFlag.ts
    └── platformMigrationService.ts

plugins/01.migration.client.ts   ← runs migrations at app boot; drives MigrationScreen
components/base/MigrationScreen.vue  ← full-page blocking overlay during migration
core/composables/useMigrationState.ts  ← reactive state shared between plugin and screen
```

### Data flow at boot

```
SPA loading template (static HTML)
  │
  ▼
01.migration.client.ts (Nuxt plugin)
  ├── initPlatformStorage()          — warm KV cache
  ├── useMigrationState().start()    — set phase = 'running'
  ├── runSchemaMigrations(ALL_MIGRATIONS, { onStep })
  │     ├── groups migrations by collection
  │     ├── skips collections already at latest version (fast path, < 5 ms)
  │     └── for each pending step: reads all docs → transforms → writes back
  └── useMigrationState().done()     — phase = 'done'
  │
  ▼
02.app-initialization.client.ts
  ├── initPersist()                  — create window.*Api
  └── hydrate stores
  │
  ▼
Vue renders — MigrationScreen fades out (if it was ever shown)
```

Because Nuxt awaits all plugins before rendering, the SPA loading template covers any migration time. The Vue `MigrationScreen` overlay acts as a real-time progress indicator for — and graceful degradation of — longer migrations if the pattern ever becomes deferred.

---

## 3. When to Write a Migration

Write a migration when a **breaking field change** ships to production:

| Change | Migration needed? |
|---|---|
| Add a new optional field with a default value | **Yes** — backfill existing docs so queries/types work |
| Rename a field | **Yes** |
| Remove a field (and stop reading it) | Optional — stale fields are harmless, but migration is clean |
| Change a field's type (e.g., string → number) | **Yes** |
| Add a new collection from scratch | **No** — new collection starts at version 0 |
| Change server-side API response shape | **No** — not local storage |

### Version numbering

Each collection tracks its own integer version, starting at `0` (no migrations applied).

- `v1` = first migration ever written for that collection
- `v2` = second migration, and so on
- **No gaps allowed.** If the stored version is `2` and you define `v4`, step `v3` is skipped and data is silently left at version `2` until `v3` is also defined.

---

## 4. Step-by-Step: Writing a Migration

### Step 1 — Create the step file

Create `versions/{collection}/v{NNN}-{short-slug}.ts`, using three-digit zero-padded version numbers.

**Example: rename `desc` → `description` in workspaces**

```
core/persist/adapters/migration/versions/workspaces/v002-rename-desc.ts
```

```ts
// versions/workspaces/v002-rename-desc.ts
import type { VersionedMigration } from '../../types';
import type { WorkspaceV1 } from './types';

// The shape this step PRODUCES (define inline or in ./types.ts if reused)
interface WorkspaceV2 extends Omit<WorkspaceV1, 'desc'> {
  description?: string;
}

export default {
  collection: 'workspaces',
  version: 2,
  description: 'Rename desc → description for API consistency',

  up(doc: WorkspaceV1): WorkspaceV2 {
    const { desc, ...rest } = doc;
    return { ...rest, description: desc };
  },
} satisfies VersionedMigration<WorkspaceV1, WorkspaceV2>;
```

**Key rules for the step file:**

- `collection` must be a valid `PersistCollection` (see [§10](#10-reference-available-collections))
- `version` must be exactly 1 higher than the previous step for that collection
- `description` should be a one-line summary shown in the console and loading screen
- `up()` is a **pure function** — no network calls, no side effects, no `console.log` in production
- Define old shapes (`WorkspaceV1`) in `versions/{collection}/types.ts` (see step 2)
- Define the new shape inline or in `types.ts` if it will also be used as an `OldShape` in a future step

### Step 2 — Record the old shape in `types.ts`

Open `versions/{collection}/types.ts` and add the shape that existed **before** this migration:

```ts
// versions/workspaces/types.ts

/** v1 — initial shape */
export interface WorkspaceV1 {
  id: string;
  icon: string;
  name: string;
  desc?: string;          // ← the field being renamed in v2
  lastOpened?: string;
  createdAt: string;
  updatedAt?: string;
}

// Add WorkspaceV2 here when v3 is written, so v003-*.ts can import it
```

**Never delete or modify existing interfaces** — they document what was on disk for every user who hasn't migrated yet.

---

## 5. Registering the Migration

Open `versions/index.ts` and add the import + entry to `ALL_MIGRATIONS`:

```ts
// versions/index.ts
import type { VersionedMigration } from '../types';

import workspaceV2 from './workspaces/v002-rename-desc';   // ← add this
// import connectionV2 from './connections/v002-add-color'; // ← (future)

export const ALL_MIGRATIONS: VersionedMigration[] = [
  workspaceV2,   // ← add this
];
```

**That is the only file you need to edit** after creating the step file. The runner automatically:
- Groups steps by `collection`
- Sorts them by `version` within each group
- Applies only pending steps (those with `version > stored version`)

Order inside `ALL_MIGRATIONS` does **not** matter.

---

## 6. Testing the Migration

Create (or add to) `test/unit/core/persist/` a spec file:

```ts
// test/unit/core/persist/migrationRunner.spec.ts
import { describe, expect, it } from 'vitest';
import workspaceV2 from '~/core/persist/adapters/migration/versions/workspaces/v002-rename-desc';

describe('workspaceV2 up()', () => {
  it('renames desc to description', () => {
    const input = { id: 'ws-1', name: 'Foo', desc: 'Old desc', createdAt: '2024-01-01' };
    const output = workspaceV2.up(input);
    expect(output).toMatchObject({ id: 'ws-1', description: 'Old desc' });
    expect((output as Record<string, unknown>).desc).toBeUndefined();
  });

  it('handles a doc with no desc (optional field)', () => {
    const input = { id: 'ws-2', name: 'Bar', createdAt: '2024-01-01' };
    const output = workspaceV2.up(input);
    expect((output as Record<string, unknown>).description).toBeUndefined();
  });
});
```

Test the `up()` function in isolation — it's a pure function, no mocks needed.

For runner-level tests (correct version gating, onStep callbacks, multi-collection), see `test/unit/core/persist/migrationRunner.spec.ts`.

---

## 7. How the Loading Screen Works

`MigrationScreen.vue` is mounted in `app.vue` and remains invisible until `isBlocking === true`.

```
useMigrationState().isBlocking
  = state.phase === 'pending' || state.phase === 'running'
```

**Phase transitions:**

```
pending  →  running  →  done
                    ↘
                      error
```

| Phase | When | MigrationScreen |
|---|---|---|
| `pending` | App just booted (initial state) | Shown (safety net) |
| `running` | Plugin is actively migrating | Shown with progress |
| `done` | All steps applied | Fades out (`opacity 0.4s`) |
| `error` | Runner threw | Screen shown; error logged to console |

In the `error` phase, the app still mounts — the screen does not remain blocking. The error is logged and the app attempts to run with whatever data is present. This prevents a migration bug from hard-locking the app.

**Customizing the screen:** Edit `components/base/MigrationScreen.vue`. The `state.currentStep` object provides `collection`, `version`, and `description` for live progress text.

---

## 8. Production Rollout Checklist

Before shipping a release that includes a schema migration:

```
□ Step file created: versions/{collection}/v{NNN}-{slug}.ts
□ Historical shape added to versions/{collection}/types.ts
□ Step imported + added to ALL_MIGRATIONS in versions/index.ts
□ up() is a pure function (no side effects, no external calls)
□ Version is exactly prev + 1 for that collection (no gaps)
□ Unit test for up() written and passing
□ bun vitest run passes (all 9 migration runner tests + new unit tests)
□ Tested locally: clear localStorage/IDB, reload – migration runs once then skips
□ CHANGELOG.md updated with a note about the schema change
```

---

## 9. Rules and Invariants

### Must follow

| Rule | Why |
|---|---|
| No gaps in version numbers | The runner compares `currentVersion >= latestVersion`. A gap causes the gap step to never run and all later steps to be skipped until the gap is filled. |
| Never modify an existing `up()` | Users who have already applied v2 will not re-run it. If you change it, they keep the old result. |
| `up()` must be a pure function | No `fetch`, no store access, no `Date.now()` unless deterministic. The runner may batch-call `up()` for thousands of documents. |
| Each step has a unique `(collection, version)` pair | Duplicates cause the runner to apply both, producing incorrect data. |
| Historic shapes stay in `types.ts` | They document exact on-disk layouts for future migrations and for debugging production issues. |

### Good practices

- Keep `up()` small and focused. If a migration is complex, comment it thoroughly.
- Add the target shape (`WorkspaceV2`) to `types.ts` **after** writing V3, so the next developer can import it.
- Write the simplest possible test for `up()` — edge cases like `undefined` optional fields matter.
- Log migration steps with meaningful messages (the runner does this automatically via `description`).

---

## 10. Reference: Available Collections

Defined in `core/persist/adapters/tauri/primitives.ts`:

| Collection | Description |
|---|---|
| `workspaces` | Workspace records |
| `workspaceState` | Per-workspace UI state |
| `connections` | Database connection configs |
| `tabViews` | Open tab definitions |
| `quickQueryLogs` | Query execution history |
| `rowQueryFiles` | Row query file metadata |
| `rowQueryFileContents` | Row query file content blobs |

---

## 11. Reference: File Map

| File | Role |
|---|---|
| `migration/types.ts` | `VersionedMigration<From,To>` and `MigrationStepInfo` interfaces |
| `migration/migrationRunner.ts` | `runSchemaMigrations(migrations, options?)` — the runner |
| `migration/schemaVersionStore.ts` | `getSchemaVersion(collection)` / `setSchemaVersion(collection, v)` |
| `migration/index.ts` | Public re-exports for all migration utilities |
| `migration/versions/index.ts` | **Edit here** to register a new step |
| `migration/versions/{col}/v{NNN}-{slug}.ts` | One migration step (create per step) |
| `migration/versions/{col}/types.ts` | Historic document shapes for that collection |
| `plugins/01.migration.client.ts` | Nuxt plugin that runs migrations at boot |
| `core/composables/useMigrationState.ts` | Reactive migration phase state |
| `components/base/MigrationScreen.vue` | Full-page loading overlay during migration |
