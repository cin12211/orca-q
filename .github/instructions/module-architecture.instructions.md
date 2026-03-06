---
applyTo: '*'
description: 'Module Architecture Guide: A comprehensive guide to structuring frontend modules with low coupling and high cohesion. Covers folder structure, core principles, dependency rules, layer details, and best practices for scalable and maintainable code.'
---

## Module Architecture Guide

> **Goal:** Low Coupling · High Cohesion · Readable · Testable · Scalable
>
> Applies to: Developers · AI Agents · Code Reviewers

---

## Folder Structure Overview

```
modules/
└── user/                        ← Module name (domain-driven)
    ├── components/              ← Pure UI, no heavy logic
    ├── containers/              ← Orchestration layer (entry point)
    ├── hooks/                   ← Business logic + state
    ├── services/                ← Pure API layer
    ├── types/                   ← Shared types, interfaces, enums
    ├── constants/               ← Config, options, default values
    ├── utils/                   ← Pure functions
    ├── schemas/                 ← Form validation schemas
    ├── docs/                    ← Business notes, flow docs
    ├── __tests__/               ← Unit / Integration tests
    └── index.ts                 ← Public API of the module
```

---

## Core Principles

### Low Coupling (Reduce Dependencies)

- Each layer **only imports from permitted layers** (see dependency table below)
- Sub-modules **must never cross-import** — if something is shared, move it to `shared/`
- Exports go **only through `index.ts`** — never import directly into internal files from outside

### High Cohesion (Group by Meaning)

- One file does **one thing clearly**
- Name by domain, not generic: `useUserList.ts` ✅ — `useList.ts` ❌
- Related logic stays **in one place**, never scattered

---

## Dependency Rules

| Layer         | Can import from                                           | Must NOT import                      |
| ------------- | --------------------------------------------------------- | ------------------------------------ |
| `components/` | `types/` (shared props, enums), `constants/`              | `services/`, `hooks/`, `containers/` |
| `containers/` | `components/`, `hooks/`, `types/`, `constants/`           | `services/` directly                 |
| `hooks/`      | `services/`, `types/`, `constants/`, `utils/`, `schemas/` | `components/`, `containers/`         |
| `services/`   | `types/` (API response types)                             | All other layers                     |
| `utils/`      | `types/`, `constants/`                                    | `hooks/`, `services/`, `components/` |
| `schemas/`    | `types/` (enums)                                          | `hooks/`, `services/`, `components/` |
| `constants/`  | `types/` (enums)                                          | All other layers                     |

> **Golden rule:** Dependencies only flow **downward**, never **sideways** or **upward**.
>
> `containers → hooks → services → types`

---

## Layer Details

---

### 1. `components/`

**What it is:** Pure UI components. Receives data via props, emits events outward.

**Must NOT:** Call APIs, hold complex state, import business logic hooks.

**Allowed:** Local UI state (`isOpen`, `isHovered`), import from `types/` and `constants/`.

```
components/
├── UserCard.vue
├── UserTable.vue
├── UserStatusBadge.vue
└── UserFilterBar.vue
```

**Correct example:**

```vue
<!-- UserCard.vue -->
<script setup lang="ts">
import { USER_STATUS_CONFIG } from '../constants/USER_STATUS';
import type { UserCardProps } from '../types/user.types';

defineProps<{ user: UserCardProps }>();
defineEmits<{ edit: [id: string]; delete: [id: string] }>();
</script>
```

**Red flag:**

```ts
// ❌ Component calls service directly
import { userService } from '../services/user.service';
```

---

### 2. `containers/`

**What it is:** Orchestration layer. Connects `components/` with `hooks/`. This is the UI entry point of the module.

**Must NOT:** Contain business logic — logic belongs in `hooks/`.

**Allowed:** Compose multiple components, pass data from hooks down to components, handle routing.

```
containers/
├── UserListContainer.vue        ← List page
├── UserFormContainer.vue        ← Create/edit page
└── UserDetailContainer.vue      ← Detail page
```

**Correct example:**

```vue
<!-- UserListContainer.vue -->
<script setup lang="ts">
import UserFilterBar from '../components/UserFilterBar.vue';
import UserTable from '../components/UserTable.vue';
import { useUserList } from '../hooks/useUserList';

const { users, isLoading, filters, setFilter, deleteUser } = useUserList();
</script>

<template>
  <UserFilterBar :filters="filters" @change="setFilter" />
  <UserTable :users="users" :loading="isLoading" @delete="deleteUser" />
</template>
```

**Red flag:**

```ts
// ❌ Container calls service directly, bypassing hooks
import { userService } from '../services/user.service';

const users = await userService.getList();
```

---

### 3. `hooks/`

**What it is:** Business logic + state management. The "brain" of the module.

**Must NOT:** Import components or containers.

**Allowed:** Call services, manage state, handle business logic, use utils/schemas.

```
hooks/
├── useUserList.ts               ← State + logic for list
├── useUserForm.ts               ← State + validation for form
└── useUserPermission.ts         ← Permission logic
```

**Correct example:**

```ts
// useUserList.ts
import { ref } from 'vue';
import { USER_DEFAULT_FILTER } from '../constants/USER_DEFAULT_FILTER';
import { userService } from '../services/user.service';
import type { UserFilterParams } from '../types/user.types';
import { mapUserResponse } from '../utils/mapUserResponse';

export function useUserList() {
  const users = ref([]);
  const filters = ref<UserFilterParams>({ ...USER_DEFAULT_FILTER });
  const isLoading = ref(false);

  const fetchUsers = async () => {
    isLoading.value = true;
    const data = await userService.getList(filters.value);
    users.value = data.map(mapUserResponse);
    isLoading.value = false;
  };

  return { users, isLoading, filters, fetchUsers };
}
```

**Hook naming convention:**

| Type             | Pattern                | Example             |
| ---------------- | ---------------------- | ------------------- |
| List management  | `use[Entity]List`      | `useUserList`       |
| Form management  | `use[Entity]Form`      | `useUserForm`       |
| Feature-specific | `use[Entity][Feature]` | `useUserPermission` |

---

### 4. `services/`

**What it is:** Pure API layer. Only makes HTTP calls — no state, no Vue.

**Must NOT:** Import composables, import components, hold state.

**Allowed:** Call axios/fetch, basic request/response shaping, handle HTTP errors.

```
services/
└── user.service.ts
```

**Correct example:**

```ts
// user.service.ts
import { apiClient } from '@/shared/api/client';
import type {
  UserResponse,
  UserFilterParams,
  CreateUserPayload,
} from '../types/user.types';

export const userService = {
  getList: (filters: UserFilterParams): Promise<UserResponse[]> =>
    apiClient.get('/users', { params: filters }),

  getById: (id: string): Promise<UserResponse> => apiClient.get(`/users/${id}`),

  create: (payload: CreateUserPayload): Promise<UserResponse> =>
    apiClient.post('/users', payload),

  update: (
    id: string,
    payload: Partial<CreateUserPayload>
  ): Promise<UserResponse> => apiClient.put(`/users/${id}`, payload),

  delete: (id: string): Promise<void> => apiClient.delete(`/users/${id}`),
};
```

**Red flag:**

```ts
// ❌ Service imports a composable
import { useAuthStore } from '@/modules/auth';

// ❌ Service holds state
const cachedUsers = ref([]);
```

---

### 5. `types/`

**What it is:** All types/interfaces shared across the module. Not layered like a backend — just ask: _"Is this type used in more than one file?"_ → If yes, put it here.

**Contains:**

| Kind                 | Example                                         |
| -------------------- | ----------------------------------------------- |
| API response types   | Shape of data returned by the server            |
| Enums                | `UserRole`, `UserStatus`                        |
| Shared props types   | Interfaces shared across multiple components    |
| Generic shared types | Types used in multiple places within the module |

**Does NOT contain:** Types used in only one file → define them inline in that file.

```
types/
├── user.types.ts        ← Main interfaces: API response, shared props
└── user.enums.ts        ← Enums (typically imported in many places)
```

**Example:**

```ts
// user.types.ts
export interface UserResponse {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserFilterParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
}

// Shared props type used across multiple components
export interface UserCardProps {
  id: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}
```

```ts
// user.enums.ts
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
```

> **Simple rule:**
> Type used in 1 place → define it there.
> Type used in 2+ places → move it to `types/`.

---

### 6. `constants/`

**What it is:** Static values — dropdown options, default values, label mappings.

**Why it exists:** Avoids hardcoded strings/numbers scattered across components and hooks.

```
constants/
├── USER_ROLE_OPTIONS.ts         ← Options for role <Select>
├── USER_STATUS.ts               ← Status → label/color mapping
└── USER_DEFAULT_FILTER.ts       ← Default filter values
```

**Correct example:**

```ts
// USER_STATUS.ts
import { UserStatus } from '../types/user.enums';
// USER_DEFAULT_FILTER.ts
import type { UserFilterParams } from '../types/user.types';

export const USER_STATUS_CONFIG: Record<
  UserStatus,
  { label: string; color: string }
> = {
  [UserStatus.ACTIVE]: { label: 'Active', color: 'green' },
  [UserStatus.INACTIVE]: { label: 'Suspended', color: 'gray' },
};

export const USER_DEFAULT_FILTER: UserFilterParams = {
  page: 1,
  pageSize: 20,
  search: '',
  role: undefined,
};
```

**Red flag:**

```vue
<!-- ❌ Hardcoded options inside a component -->
<option value="admin">Admin</option>
<option value="user">User</option>
```

---

### 7. `utils/`

**What it is:** Pure functions. No side effects, no framework dependency.

**Must NOT:** Import composables, services, or components.

**Allowed:** Import from `types/` and `constants/`.

```
utils/
├── formatUserName.ts            ← Format display name
├── mapUserResponse.ts           ← API response → usable shape
└── isUserActive.ts              ← Status check
```

**Correct example:**

```ts
// mapUserResponse.ts
import { UserStatus } from '../types/user.enums';
import type { UserResponse } from '../types/user.types';

export function mapUserResponse(res: UserResponse) {
  return {
    id: res.id,
    fullName: `${res.first_name} ${res.last_name}`.trim(),
    isActive: res.is_active,
    status: res.is_active ? UserStatus.ACTIVE : UserStatus.INACTIVE,
    createdAt: new Date(res.created_at),
  };
}
```

**Utils are trivial to test** because they are pure functions — no mocking needed:

```ts
expect(mapUserResponse(mockResponse).fullName).toBe('John Doe');
```

---

### 8. `schemas/`

**What it is:** Validation schemas for forms. Kept separate so hooks and components stay lean.

**Use when:** The module has forms (Zod / Yup / Valibot).

```
schemas/
└── user.schema.ts
```

**Correct example (Zod):**

```ts
// user.schema.ts
import { z } from 'zod';
import { UserRole } from '../types/user.enums';

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(UserRole),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
```

Used inside a hook:

```ts
// useUserForm.ts
import { createUserSchema } from '../schemas/user.schema';

const result = createUserSchema.safeParse(formValues);
```

---

### 9. `__tests__/`

**What it is:** Unit and integration tests for the module.

**Test priority:** `hooks/` and `utils/` — this is where all the logic lives.

```
__tests__/
├── useUserList.spec.ts
├── useUserForm.spec.ts
├── user.service.spec.ts
└── mapUserResponse.spec.ts
```

**Example:**

```ts
// useUserList.spec.ts
import { vi } from 'vitest';
import { useUserList } from '../hooks/useUserList';
import { userService } from '../services/user.service';

vi.mock('../services/user.service');

it('fetches and maps users on mount', async () => {
  vi.mocked(userService.getList).mockResolvedValue([mockUserResponse]);

  const { users, fetchUsers } = useUserList();
  await fetchUsers();

  expect(users.value[0].fullName).toBe('John Doe');
});
```

---

### 10. `docs/`

**What it is:** Business documentation — not technical docs.

**Write when:** The module has complex logic, special business rules, or multi-step flows.

```
docs/
├── permission-flow.md           ← Permission flow description
└── role-matrix.md               ← Role vs permission matrix
```

**Suggested template for `permission-flow.md`:**

```markdown
# Permission Flow

## Overview

[Brief description of what this flow does]

## Conditions

- User must have role X
- Resource must be in state Y

## Main Flow

1. ...
2. ...

## Edge Cases

- If ... then ...

## Related Files

- `hooks/useUserPermission.ts`
- `constants/USER_ROLE_OPTIONS.ts`
```

---

### `index.ts` — Public API

**What it is:** The only gateway for external modules to import from. Controls what gets exposed.

**Rule:** Only export what other modules **actually need**.

```ts
// modules/user/index.ts

// Containers (entry points)
export { default as UserListContainer } from './containers/UserListContainer.vue';
export { default as UserFormContainer } from './containers/UserFormContainer.vue';

// Hooks (only if other modules need them)
export { useUserPermission } from './hooks/useUserPermission';

// Types (always export)
export type { UserResponse, UserCardProps } from './types/user.types';
export { UserRole, UserStatus } from './types/user.enums';
```

**Importing from another module:**

```ts
// ✅ Correct — import through index
import { UserListContainer, UserRole } from '@/modules/user'

// ❌ Wrong — importing directly into an internal file
import { UserListContainer } from '@/modules/user/containers/UserListContainer.vue'
```

---

## Checklist When Creating a New Module

```
□ All 10 folders created (skip schemas/ if no forms)
□ Folder named after the domain (user/, order/, product/...)
□ types/ only contains types used in 2+ places — inline the rest
□ No hardcoded strings in components — use constants/
□ utils/ contains pure functions only
□ services/ has no Vue imports, holds no state
□ containers/ never calls services directly
□ index.ts only exports what is necessary
□ Each hook has at least 1 basic test
□ Complex flows → write docs/
```

---

## Full Structure Example — `user` Module

```
modules/user/
├── components/
│   ├── UserCard.vue
│   ├── UserTable.vue
│   ├── UserStatusBadge.vue
│   └── UserFilterBar.vue
│
├── containers/
│   ├── UserListContainer.vue
│   ├── UserFormContainer.vue
│   └── UserDetailContainer.vue
│
├── hooks/
│   ├── useUserList.ts
│   ├── useUserForm.ts
│   └── useUserPermission.ts
│
├── services/
│   └── user.service.ts
│
├── types/
│   ├── user.types.ts
│   └── user.enums.ts
│
├── constants/
│   ├── USER_ROLE_OPTIONS.ts
│   ├── USER_STATUS.ts
│   └── USER_DEFAULT_FILTER.ts
│
├── utils/
│   ├── formatUserName.ts
│   ├── mapUserResponse.ts
│   └── isUserActive.ts
│
├── schemas/
│   └── user.schema.ts
│
├── docs/
│   ├── permission-flow.md
│   └── role-matrix.md
│
├── __tests__/
│   ├── useUserList.spec.ts
│   ├── user.service.spec.ts
│   └── mapUserResponse.spec.ts
│
└── index.ts
```

---

## When a Module Gets Too Large — Flat Sub-modules

**Signs you need to split:** Any folder has 7+ files, or there are 2+ clearly independent features.

### Structure

```
quick-query/
├── shared/                          ← Shared across the entire module
│   ├── components/
│   │   └── QueryStatusBadge.vue
│   ├── hooks/
│   │   └── useQueryConnection.ts
│   ├── services/
│   │   └── query.service.ts
│   ├── types/
│   │   └── query.types.ts
│   └── constants/
│       └── QUERY_DEFAULTS.ts
│
├── table-detail/                    ← Self-contained sub-module, knows NOTHING about other sub-modules
│   ├── components/
│   │   ├── StructureTable.vue
│   │   ├── ColumnTypeBadge.vue
│   │   ├── ErdCanvas.vue
│   │   └── ErdRelationLine.vue
│   ├── hooks/
│   │   ├── useTableStructure.ts
│   │   └── useTableErd.ts
│   ├── services/
│   │   └── table.service.ts
│   ├── types/
│   │   └── table.types.ts
│   ├── constants/
│   ├── utils/
│   └── index.ts
│
├── query-editor/                    ← Self-contained sub-module, knows NOTHING about other sub-modules
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── index.ts
│
├── containers/                      ← Orchestration layer — the ONLY place allowed to compose sub-modules
│   └── QuickQueryContainer.vue      ← Imports from table-detail + query-editor + shared
│
└── index.ts                         ← Public API of the entire QuickQuery module
```

### How Low Coupling & High Cohesion Apply Here

**High Cohesion:**

- Each sub-module only contains logic related to itself — `table-detail` knows nothing about `query-editor`
- `shared/` only holds things **genuinely** used in 2+ sub-modules — it is not a dumping ground

**Low Coupling:**

- Sub-modules **never import from each other** — coupling between sub-modules = 0
- `containers/` at the parent level is the **only** layer allowed to know about multiple sub-modules at once
- A sub-module has only 2 valid import sources: **itself** and **`shared/`**

```
# ✅ Sub-module uses parent shared
table-detail/hooks/useTableStructure.ts  →  ../shared/services/query.service.ts

# ✅ Parent containers/ composes everything
containers/QuickQueryContainer.vue       →  ../table-detail
containers/QuickQueryContainer.vue       →  ../query-editor
containers/QuickQueryContainer.vue       →  ../shared

# ❌ Cross-import between sub-modules — VIOLATES Low Coupling
table-detail/  →  query-editor/
query-editor/  →  table-detail/
```

> **Golden rule:** If sub-module A needs something from sub-module B → that thing belongs in `shared/`, not in B.

### What the Parent containers/ Looks Like

```vue
<!-- containers/QuickQueryContainer.vue -->
<script setup lang="ts">
// Import from sub-modules via their index.ts — never directly into internal files
import { QueryEditorPanel } from '../query-editor';
import { useQueryConnection } from '../shared/hooks/useQueryConnection';
import { TableDetailPanel } from '../table-detail';

const { connection, isConnected } = useQueryConnection();
</script>

<template>
  <QueryEditorPanel :connection="connection" />
  <TableDetailPanel v-if="isConnected" />
</template>
```

### Decision Table

| Situation                                        | Action                                                     |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Module has 1–6 files per folder                  | Keep flat, no split needed yet                             |
| 2+ independent features, folders getting crowded | Split into Flat Sub-modules                                |
| A sub-module grows too large again               | **Do NOT nest further** — promote it to a top-level module |
| 2 sub-modules need shared logic                  | Push it up to `shared/`, never cross-import                |

### Sub-module index.ts

Each sub-module has its own `index.ts` — **only export what the parent `containers/` needs**:

```ts
// table-detail/index.ts
export { default as TableDetailPanel } from './components/TableDetailPanel.vue';
export type { TableStructure, ErdNode } from './types/table.types';
// Do NOT export hooks, services, utils — those are internal
```

```ts
// quick-query/index.ts — Public API exposed to the rest of the app
export { default as QuickQueryContainer } from './containers/QuickQueryContainer.vue';
```

---

_Update this guide whenever the architecture changes. Any exceptions must be explained with a comment in the code._
