# Data Model: Connection Environment Tags

**Feature**: 013-connection-env-tags  
**Phase**: 1 — Design & Contracts  
**Date**: 2026-04-11

---

## Entities

### 1. `EnvironmentTag` _(new entity)_

Represents a named label that can be assigned to connections to communicate which environment they target.

| Field        | Type              | Constraints                                   | Notes                                                |
| ------------ | ----------------- | --------------------------------------------- | ---------------------------------------------------- |
| `id`         | `string`          | Required, unique (UUID v4)                    | Generated at creation time                           |
| `name`       | `string`          | Required, unique case-insensitive, 1–30 chars | Display label (e.g. "prod", "staging")               |
| `color`      | `TagColor` (enum) | Required                                      | One of the predefined palette values                 |
| `strictMode` | `boolean`         | Required, default `false`                     | When `true`, connecting requires phrase confirmation |
| `createdAt`  | `string`          | Required                                      | ISO 8601 timestamp                                   |

**Persistence collection**: `environment-tags`  
**Scope**: Global (not workspace-scoped)  
**Initial seeded records**: 5 defaults (see below)

```ts
export interface EnvironmentTag {
  id: string;
  name: string;
  color: TagColor;
  strictMode: boolean;
  createdAt: string;
}
```

**Default seeds (created on first launch if collection is empty)**:

| id              | name    | color    | strictMode |
| --------------- | ------- | -------- | ---------- |
| `env-tag-prod`  | `prod`  | `red`    | `true`     |
| `env-tag-uat`   | `uat`   | `orange` | `false`    |
| `env-tag-test`  | `test`  | `yellow` | `false`    |
| `env-tag-dev`   | `dev`   | `blue`   | `false`    |
| `env-tag-local` | `local` | `green`  | `false`    |

---

### 2. `TagColor` _(new enum)_

Predefined palette of semantic color names that map to design-system tokens. Stored as a string enum value.

```ts
export enum TagColor {
  Red = 'red',
  Orange = 'orange',
  Amber = 'amber',
  Yellow = 'yellow',
  Lime = 'lime',
  Green = 'green',
  Teal = 'teal',
  Cyan = 'cyan',
  Blue = 'blue',
  Indigo = 'indigo',
  Violet = 'violet',
  Purple = 'purple',
  Pink = 'pink',
  Rose = 'rose',
}
```

UI rendering: each value maps to a Tailwind CSS class pair for light + dark mode (e.g., `green` → `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`).

---

### 3. `Connection` _(existing entity — extended)_

The existing `Connection` interface (defined in `core/stores/managementConnectionStore.ts`) gains one new field.

**New field added**:

| Field    | Type       | Constraints                                            | Notes                                   |
| -------- | ---------- | ------------------------------------------------------ | --------------------------------------- |
| `tagIds` | `string[]` | Optional, max length 3, each is an `EnvironmentTag.id` | IDs of assigned environment tags; max 3 |

```ts
// Before (v1):
export interface Connection {
  workspaceId: string;
  id: string;
  name: string;
  // ...existing fields
  createdAt: string;
  updatedAt?: string;
}

// After (v2):
export interface Connection {
  workspaceId: string;
  id: string;
  name: string;
  // ...existing fields
  tagIds?: string[]; // ← NEW: IDs of assigned EnvironmentTag records
  createdAt: string;
  updatedAt?: string;
}
```

**Relationship**: `Connection.tagIds[]` → `EnvironmentTag.id` (logical foreign key reference; no referential integrity at DB level — orphaned IDs are silently ignored in display).

---

## Validation Rules

### EnvironmentTag creation

| Rule                  | Detail                                                          |
| --------------------- | --------------------------------------------------------------- |
| `name` required       | Minimum 1 character                                             |
| `name` max length     | 30 characters                                                   |
| `name` unique         | Case-insensitive check against existing tag names before insert |
| `color` required      | Must be one of the `TagColor` enum values                       |
| `strictMode` required | Boolean; defaults to `false` in the form                        |

### Connection tag assignment

| Rule       | Detail                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Max 3 tags | `tagIds.length <= 3` enforced in picker UI and Zod schema                                                          |
| Valid IDs  | Each ID must reference an existing `EnvironmentTag`; invalid/orphaned IDs are filtered from display at render time |

---

## State Transitions

### Tag lifecycle

```
[not exists]
    ↓  create (name, color, strictMode)
[exists in library]
    ↓  assign to connection(s)          ← tagId added to Connection.tagIds
[assigned]
    ↓  unassign from connection         ← tagId removed from Connection.tagIds
[exists in library]
    ↓  delete tag (confirm first if assigned to one or more connections)
[not exists]  ←  all connections that referenced this tagId have it silently removed
```

### Strict mode connection flow

```
user clicks Connect
    ↓
check connection.tagIds
    → resolve EnvironmentTag objects for those IDs
        ↓
    any tag has strictMode = true?
        → NO  → proceed with connection (normal flow)
        → YES → show StrictModeConfirmDialog
                    user types "this is production" exactly
                        → matches  → proceed with connection
                        → no match → Confirm button stays disabled
                    user cancels / dismisses
                        → abort connection attempt
```

---

## Persistence Contract (new)

```ts
// core/persist/types.ts — new interface to add
export interface EnvironmentTagPersistApi {
  getAll(): Promise<EnvironmentTag[]>;
  getOne(id: string): Promise<EnvironmentTag | null>;
  create(tag: EnvironmentTag): Promise<EnvironmentTag>;
  update(tag: EnvironmentTag): Promise<EnvironmentTag | null>;
  delete(id: string): Promise<void>;
}
```

---

## Migration

### `v002-add-tag-ids` — connections collection

Adds the `tagIds` field to all existing `Connection` documents.

```ts
// core/persist/adapters/migration/versions/connections/v002-add-tag-ids.ts
interface ConnectionV2 extends ConnectionV1 {
  tagIds: string[];
}

export default {
  collection: 'connections',
  version: 2,
  description: 'Add tagIds array to connections for environment tag support',
  up(doc: ConnectionV1): ConnectionV2 {
    return { ...doc, tagIds: [] };
  },
} satisfies VersionedMigration<ConnectionV1, ConnectionV2>;
```

### Default tag seeding

Not a migration — handled in `useEnvironmentTagStore.loadTags()`:

```
if (await environmentTagService.getAll()).length === 0:
    → create each of the 5 DEFAULT_ENV_TAGS
```

---

## Historical Type Record

```ts
// core/persist/adapters/migration/versions/connections/types.ts
// Add to existing file:

export interface ConnectionV2 extends ConnectionV1 {
  tagIds: string[];
}
```
