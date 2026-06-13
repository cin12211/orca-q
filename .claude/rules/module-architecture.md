---
trigger: always_on
---

# Module Architecture Guide

> **Goal:** Low Coupling · High Cohesion · Readable · Testable · Scalable

---

## Folder Structure

```
modules/
└── user/
    ├── components/       ← Pure UI, receives data via props
    ├── containers/       ← Orchestration layer, module entry point
    ├── hooks/            ← Business logic + state
    ├── services/         ← Pure API layer
    ├── types/            ← Shared types, interfaces, enums
    ├── constants/        ← Config, options, default values
    ├── utils/            ← Pure functions
    ├── schemas/          ← Form validation (Zod/Yup)
    ├── docs/             ← Business notes, flow docs
    ├── __tests__/        ← Unit / Integration tests
    └── index.ts          ← Public API of the module
```

---

## Core Principles

- **Low Coupling** — Each layer only imports from permitted layers. Sub-modules must never cross-import.
- **High Cohesion** — One file does one thing. Name by domain: `useUserList.ts` ✅ `useList.ts` ❌
- **index.ts in every folder** — Every folder must have an `index.ts` to control what gets exported. Never import directly into internal files from outside.

---

## Rule: Every Folder Must Have an `index.ts`

This is a mandatory rule. Every folder inside a module — including `components/`, `hooks/`, `services/`, `utils/`, `constants/`, `types/`, and `schemas/` — must have an `index.ts` file to control what is exposed to the outside.

```
components/
├── UserCard.vue
├── UserTable.vue
└── index.ts          ← REQUIRED

hooks/
├── useUserList.ts
├── useUserForm.ts
└── index.ts          ← REQUIRED

services/
├── user.service.ts
└── index.ts          ← REQUIRED
```

**Examples:**

```ts
// components/index.ts
export { default as UserCard } from './UserCard.vue';
export { default as UserTable } from './UserTable.vue';
export { default as UserStatusBadge } from './UserStatusBadge.vue';

// hooks/index.ts
export { useUserList } from './useUserList';
export { useUserForm } from './useUserForm';

// services/index.ts
export { userService } from './user.service';
```

**Correct imports:**

```ts
// ✅ Always import through the folder's index.ts
import { UserCard, UserTable } from '../components'
import { useUserList } from '../hooks'
import { userService } from '../services'

// ❌ Never import directly into internal files
import UserCard from '../components/UserCard.vue'
import { useUserList } from '../hooks/useUserList'
```

> **Rule:** If a folder has no `index.ts` → treat it as if it doesn't exist.

---

## Dependency Rules

| Layer         | Can import from                                           | Must NOT import                      |
| ------------- | --------------------------------------------------------- | ------------------------------------ |
| `components/` | `types/`, `constants/`                                    | `services/`, `hooks/`, `containers/` |
| `containers/` | `components/`, `hooks/`, `types/`, `constants/`           | `services/` directly                 |
| `hooks/`      | `services/`, `types/`, `constants/`, `utils/`, `schemas/` | `components/`, `containers/`         |
| `services/`   | `types/`                                                  | All other layers                     |
| `utils/`      | `types/`, `constants/`                                    | `hooks/`, `services/`, `components/` |
| `schemas/`    | `types/`                                                  | `hooks/`, `services/`, `components/` |
| `constants/`  | `types/` (enums)                                          | All other layers                     |

> **Golden rule:** Dependencies only flow **downward** — never **sideways** or **upward**.
>
> `containers → hooks → services → types`

---

## Layer Details

### `components/` — Pure UI

- Receives data via props, emits events outward
- **Must NOT** call APIs, hold business logic, or import hooks
- Local UI state (`isOpen`, `isHovered`) is allowed

```vue
<!-- UserCard.vue -->
<script setup lang="ts">
import { USER_STATUS_CONFIG } from '../constants';
import type { UserCardProps } from '../types';

defineProps<{ user: UserCardProps }>();
defineEmits<{ edit: [id: string]; delete: [id: string] }>();
</script>
```

---

### `containers/` — Orchestration

- Connects `components/` with `hooks/`, acts as the UI entry point
- **Must NOT** contain business logic
- Passes data from hooks down to components

```vue
<!-- UserListContainer.vue -->
<script setup lang="ts">
import { UserTable, UserFilterBar } from '../components';
import { useUserList } from '../hooks';

const { users, isLoading, filters, setFilter, deleteUser } = useUserList();
</script>
```

---

### `hooks/` — Business Logic

- The "brain" of the module: state + logic
- **Must NOT** import components or containers

```ts
// useUserList.ts
import { USER_DEFAULT_FILTER } from '../constants';
import { userService } from '../services';
import type { UserFilterParams } from '../types';
import { mapUserResponse } from '../utils';

export function useUserList() {
  const users = ref([]);
  const isLoading = ref(false);
  const filters = ref<UserFilterParams>({ ...USER_DEFAULT_FILTER });

  const fetchUsers = async () => {
    isLoading.value = true;
    const data = await userService.getList(filters.value);
    users.value = data.map(mapUserResponse);
    isLoading.value = false;
  };

  return { users, isLoading, filters, fetchUsers };
}
```

---

### `services/` — Pure API

- Only makes HTTP calls — no state, no Vue

```ts
// user.service.ts
import { apiClient } from '@/shared/api/client';
import type { UserResponse, UserFilterParams } from '../types';

export const userService = {
  getList: (filters: UserFilterParams): Promise<UserResponse[]> =>
    apiClient.get('/users', { params: filters }),
  getById: (id: string): Promise<UserResponse> => apiClient.get(`/users/${id}`),
  create: (payload: CreateUserPayload): Promise<UserResponse> =>
    apiClient.post('/users', payload),
  delete: (id: string): Promise<void> => apiClient.delete(`/users/${id}`),
};
```

---

### `types/` — Shared Types

- Only contains types used in **2+ files**. Types used in one place → define them inline there.

```ts
// types/user.types.ts
export interface UserResponse {
  id: string;
  first_name: string;
  role: UserRole;
}
export interface UserFilterParams {
  page: number;
  pageSize: number;
  search?: string;
}

// types/user.enums.ts
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// types/index.ts
export * from './user.types';
export * from './user.enums';
```

---

### `constants/` — Static Values

- Avoids hardcoded strings/numbers scattered across components

```ts
// USER_STATUS.ts
export const USER_STATUS_CONFIG: Record<
  UserStatus,
  { label: string; color: string }
> = {
  [UserStatus.ACTIVE]: { label: 'Active', color: 'green' },
  [UserStatus.INACTIVE]: { label: 'Suspended', color: 'gray' },
};
```

---

### `utils/` — Pure Functions

- No side effects, no framework dependency
- Trivial to test — no mocking needed

```ts
// mapUserResponse.ts
export function mapUserResponse(res: UserResponse) {
  return {
    id: res.id,
    fullName: `${res.first_name} ${res.last_name}`.trim(),
    isActive: res.is_active,
    createdAt: new Date(res.created_at),
  };
}
```

---

### `schemas/` — Validation

```ts
// user.schema.ts
export const createUserSchema = z.object({
  firstName: z.string().min(1).max(50),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;
```

---

### `index.ts` — Module Public API

Only export what other modules **actually need**.

```ts
// modules/user/index.ts
export { default as UserListContainer } from './containers/UserListContainer.vue';
export { useUserPermission } from './hooks';
export type { UserResponse } from './types';
export { UserRole, UserStatus } from './types';
```

---

## Checklist — Creating a New Module

```
□ All 10 folders created (skip schemas/ if no forms)
□ Folder named after the domain
□ Every folder has an index.ts
□ types/ only contains types used in 2+ places — inline the rest
□ No hardcoded strings in components — use constants/
□ utils/ contains pure functions only
□ services/ has no Vue imports, holds no state
□ containers/ never calls services directly
□ module index.ts only exports what is necessary
□ Each hook has at least 1 basic test
□ Complex flows → write docs/
```

---

## When a Module Gets Too Large — Flat Sub-modules

**Signs you need to split:** Any folder has 7+ files, or there are 2+ clearly independent features.

```
quick-query/
├── shared/                   ← Shared across the entire module
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── constants/
│
├── table-detail/             ← Self-contained sub-module
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── index.ts              ← REQUIRED
│
├── query-editor/             ← Self-contained sub-module
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── index.ts              ← REQUIRED
│
├── containers/               ← The ONLY place allowed to compose sub-modules
│   └── QuickQueryContainer.vue
│
└── index.ts
```

**Sub-module rules:**

```ts
// ✅ Sub-module uses parent shared
import { queryService } from '../../shared/services'

// ✅ containers/ composes everything
import { TableDetailPanel } from '../table-detail'
import { QueryEditorPanel } from '../query-editor'

// ❌ Sub-modules importing each other — VIOLATES Low Coupling
import { ... } from '../query-editor'  // inside table-detail
```

> **Golden rule:** If sub-module A needs something from sub-module B → that thing belongs in `shared/`, not in B.

| Situation                                        | Action                           |
| ------------------------------------------------ | -------------------------------- |
| 1–6 files per folder                             | Keep flat, no split needed       |
| 2+ independent features, folders getting crowded | Split into Flat Sub-modules      |
| A sub-module grows too large again               | Promote it to a top-level module |
| 2 sub-modules need shared logic                  | Push it up to `shared/`          |

---

_Update this guide whenever the architecture changes. Any exceptions must be explained with a comment in the code._
