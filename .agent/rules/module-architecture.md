---
trigger: always_on
---

# Module Architecture Guide

> **Mục tiêu:** Low Coupling · High Cohesion · Dễ đọc · Dễ test · Dễ scale
>
> Áp dụng cho: Developer · AI Agent · Code Reviewer

---

## Tổng quan cấu trúc

```
modules/
└── user/                        ← Tên module (domain-driven)
    ├── components/              ← UI thuần, không logic nặng
    ├── containers/              ← Orchestration layer (entry point)
    ├── hooks/                   ← Business logic + state
    ├── services/                ← API layer thuần
    ├── types/                   ← DTO / Model / ViewModel / Enums
    ├── constants/               ← Config, options, default values
    ├── utils/                   ← Pure functions
    ├── schemas/                 ← Form validation schema
    ├── docs/                    ← Business notes, flow docs
    ├── __tests__/               ← Unit / Integration tests
    └── index.ts                 ← Public API của module
```

---

## Nguyên tắc cốt lõi

### Low Coupling (Giảm phụ thuộc)
- Mỗi layer **chỉ import từ layer được phép** (xem bảng phụ thuộc bên dưới)
- Module con **không được import chéo nhau** — nếu cần dùng chung thì đẩy lên `shared/`
- Export ra ngoài **chỉ qua `index.ts`** — không import thẳng vào file nội bộ

### High Cohesion (Gom nhóm có ý nghĩa)
- Một file chỉ làm **một việc rõ ràng**
- Đặt tên theo domain, không đặt tên generic: `useUserList.ts` ✅ — `useList.ts` ❌
- Logic liên quan đến nhau thì ở **cùng một chỗ**, không rải rác

---

## Bảng phụ thuộc (Dependency Rules)

| Layer | Được import từ | KHÔNG được import |
|---|---|---|
| `components/` | `types/` (shared props, enums), `constants/` | `services/`, `hooks/`, `containers/` |
| `containers/` | `components/`, `hooks/`, `types/`, `constants/` | `services/` trực tiếp |
| `hooks/` | `services/`, `types/`, `constants/`, `utils/`, `schemas/` | `components/`, `containers/` |
| `services/` | `types/` (API response types) | Tất cả các layer khác |
| `utils/` | `types/`, `constants/` | `hooks/`, `services/`, `components/` |
| `schemas/` | `types/` (enums) | `hooks/`, `services/`, `components/` |
| `constants/` | `types/` (enums) | Tất cả các layer khác |

> **Rule vàng:** Dependency chỉ đi **xuống**, không đi **ngang** hoặc **lên trên**.
>
> `containers → hooks → services → types`

---

## Chi tiết từng layer

---

### 1. `components/`

**Là gì:** UI component thuần. Nhận data qua props, emit event ra ngoài.

**Không được:** Gọi API, giữ state phức tạp, import hooks business logic.

**Được phép:** Local UI state (`isOpen`, `isHovered`), import từ `types/` và `constants/`.

```
components/
├── UserCard.vue
├── UserTable.vue
├── UserStatusBadge.vue
└── UserFilterBar.vue
```

**Ví dụ đúng:**
```vue
<!-- UserCard.vue -->
<script setup lang="ts">
import type { UserViewModel } from '../types/user.view-model'
import { USER_STATUS_LABEL } from '../constants/USER_STATUS'

defineProps<{ user: UserViewModel }>()
defineEmits<{ edit: [id: string]; delete: [id: string] }>()
</script>
```

**Dấu hiệu sai:**
```ts
// ❌ Component gọi service trực tiếp
import { userService } from '../services/user.service'
```

---

### 2. `containers/`

**Là gì:** Orchestration layer. Kết nối `components/` với `hooks/`. Đây là entry point UI của module.

**Không được:** Chứa business logic — logic phải nằm trong `hooks/`.

**Được phép:** Compose nhiều component, truyền data từ hook xuống component, xử lý routing.

```
containers/
├── UserListContainer.vue        ← Trang danh sách
├── UserFormContainer.vue        ← Trang tạo/sửa
└── UserDetailContainer.vue      ← Trang chi tiết
```

**Ví dụ đúng:**
```vue
<!-- UserListContainer.vue -->
<script setup lang="ts">
import { useUserList } from '../hooks/useUserList'
import UserTable from '../components/UserTable.vue'
import UserFilterBar from '../components/UserFilterBar.vue'

const { users, isLoading, filters, setFilter, deleteUser } = useUserList()
</script>

<template>
  <UserFilterBar :filters="filters" @change="setFilter" />
  <UserTable :users="users" :loading="isLoading" @delete="deleteUser" />
</template>
```

**Dấu hiệu sai:**
```ts
// ❌ Container gọi service trực tiếp, bỏ qua hooks
import { userService } from '../services/user.service'
const users = await userService.getList()
```

---

### 3. `hooks/`

**Là gì:** Business logic + state management. Đây là nơi "não" của module.

**Không được:** Import component, import container.

**Được phép:** Gọi service, quản lý state, xử lý logic nghiệp vụ, dùng utils/schemas.

```
hooks/
├── useUserList.ts               ← State + logic cho danh sách
├── useUserForm.ts               ← State + validation cho form
└── useUserPermission.ts         ← Logic phân quyền
```

**Ví dụ đúng:**
```ts
// useUserList.ts
import { ref, computed } from 'vue'
import { userService } from '../services/user.service'
import { mapUserDtoToViewModel } from '../utils/mapUserDto'
import type { UserFilter } from '../types/user.dto'
import { USER_DEFAULT_FILTER } from '../constants/USER_DEFAULT_FILTER'

export function useUserList() {
  const users = ref([])
  const filters = ref<UserFilter>({ ...USER_DEFAULT_FILTER })
  const isLoading = ref(false)

  const fetchUsers = async () => {
    isLoading.value = true
    const data = await userService.getList(filters.value)
    users.value = data.map(mapUserDtoToViewModel)
    isLoading.value = false
  }

  return { users, isLoading, filters, fetchUsers }
}
```

**Nguyên tắc đặt tên hook:**

| Loại | Pattern | Ví dụ |
|---|---|---|
| Quản lý danh sách | `use[Entity]List` | `useUserList` |
| Quản lý form | `use[Entity]Form` | `useUserForm` |
| Logic đặc thù | `use[Entity][Feature]` | `useUserPermission` |

---

### 4. `services/`

**Là gì:** API layer thuần. Chỉ gọi HTTP, không giữ state, không import Vue.

**Không được:** Import composable, import component, giữ state.

**Được phép:** Gọi axios/fetch, transform request/response shape cơ bản, handle HTTP error.

```
services/
└── user.service.ts
```

**Ví dụ đúng:**
```ts
// user.service.ts
import type { UserDto, UserFilter, CreateUserDto } from '../types/user.dto'
import { apiClient } from '@/shared/api/client'

export const userService = {
  getList: (filters: UserFilter): Promise<UserDto[]> =>
    apiClient.get('/users', { params: filters }),

  getById: (id: string): Promise<UserDto> =>
    apiClient.get(`/users/${id}`),

  create: (payload: CreateUserDto): Promise<UserDto> =>
    apiClient.post('/users', payload),

  update: (id: string, payload: Partial<CreateUserDto>): Promise<UserDto> =>
    apiClient.put(`/users/${id}`, payload),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/users/${id}`),
}
```

**Dấu hiệu sai:**
```ts
// ❌ Service giữ state
const cachedUsers = ref([])

// ❌ Service import composable
import { useAuthStore } from '@/modules/auth'
```

---

### 5. `types/`

**Là gì:** Tập hợp các type/interface **dùng chung trong module**. Không phân tầng như BE — chỉ cần hỏi: *"Type này có nhiều hơn 1 file cần dùng không?"* → Nếu có thì để vào đây.

**Chứa gì:**

| Loại | Ví dụ |
|---|---|
| API response type | Shape của data server trả về |
| Enums | `UserRole`, `UserStatus` |
| Shared props type | Interface dùng chung cho nhiều component |
| Generic shared types | Type dùng ở nhiều nơi trong module |

**Không chứa:** Type chỉ dùng trong 1 file duy nhất → define thẳng trong file đó.

```
types/
├── user.types.ts        ← Interfaces chính: API response, shared props
└── user.enums.ts        ← Enums riêng (thường được import nhiều nơi)
```

**Ví dụ:**
```ts
// user.types.ts
export interface UserResponse {
  id: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface UserFilterParams {
  page: number
  pageSize: number
  search?: string
  role?: UserRole
}

// Shared props type dùng cho nhiều component
export interface UserCardProps {
  id: string
  fullName: string
  role: UserRole
  isActive: boolean
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

> **Rule đơn giản:**
> Type chỉ dùng ở 1 chỗ → define tại chỗ.
> Type dùng ở 2+ chỗ → đưa vào `types/`.

---

### 6. `constants/`

**Là gì:** Các giá trị tĩnh: options cho dropdown, default values, label mapping.

**Lý do tồn tại:** Tránh hardcode string/number rải rác trong component và hook.

```
constants/
├── USER_ROLE_OPTIONS.ts         ← Options cho <Select> role
├── USER_STATUS.ts               ← Mapping status → label/color
└── USER_DEFAULT_FILTER.ts       ← Giá trị filter mặc định
```

**Ví dụ đúng:**
```ts
// USER_STATUS.ts
import { UserStatus } from '../types/user.enums'

export const USER_STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  [UserStatus.ACTIVE]:   { label: 'Hoạt động', color: 'green' },
  [UserStatus.INACTIVE]: { label: 'Tạm khóa',  color: 'gray'  },
  [UserStatus.BANNED]:   { label: 'Bị cấm',    color: 'red'   },
}

// USER_DEFAULT_FILTER.ts
import type { UserFilter } from '../types/user.dto'

export const USER_DEFAULT_FILTER: UserFilter = {
  page: 1,
  pageSize: 20,
  status: null,
  role: null,
  search: '',
}
```

**Dấu hiệu sai:**
```vue
<!-- ❌ Hardcode options trong component -->
<option value="admin">Admin</option>
<option value="user">User</option>
```

---

### 7. `utils/`

**Là gì:** Pure functions. Không có side effect, không phụ thuộc framework.

**Không được:** Import composable, import service, import component.

**Được phép:** Import từ `types/` và `constants/`.

```
utils/
├── formatUserName.ts            ← Format tên hiển thị
├── mapUserDto.ts                ← DTO → ViewModel
└── isUserActive.ts              ← Kiểm tra trạng thái
```

**Ví dụ đúng:**
```ts
// mapUserDto.ts
import type { UserDto } from '../types/user.dto'
import type { UserViewModel } from '../types/user.view-model'
import { USER_STATUS_CONFIG } from '../constants/USER_STATUS'
import { UserStatus } from '../types/user.enums'

export function mapUserDtoToViewModel(dto: UserDto): UserViewModel {
  return {
    id: dto.id,
    fullName: `${dto.first_name} ${dto.last_name}`.trim(),
    roleLabel: dto.role_id === 1 ? 'Admin' : 'User',
    statusBadge: dto.is_active ? 'success' : 'warning',
    createdAt: new Date(dto.created_at),
  }
}
```

**Test utils rất dễ** vì là pure function — không cần mock:
```ts
expect(mapUserDtoToViewModel(mockDto).fullName).toBe('Nguyen Van A')
```

---

### 8. `schemas/`

**Là gì:** Validation schema cho form. Tách ra để hook và component không bị phình to.

**Dùng khi:** Module có form (Zod / Yup / Valibot).

```
schemas/
└── user.schema.ts
```

**Ví dụ đúng (Zod):**
```ts
// user.schema.ts
import { z } from 'zod'
import { UserRole } from '../types/user.enums'

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'Họ không được trống').max(50),
  lastName:  z.string().min(1, 'Tên không được trống').max(50),
  email:     z.string().email('Email không hợp lệ'),
  role:      z.nativeEnum(UserRole),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>
```

Dùng trong hook:
```ts
// useUserForm.ts
import { createUserSchema } from '../schemas/user.schema'

const result = createUserSchema.safeParse(formValues)
```

---

### 9. `__tests__/`

**Là gì:** Unit test và integration test của module.

**Ưu tiên test:** `hooks/` và `utils/` — đây là nơi chứa toàn bộ logic.

```
__tests__/
├── useUserList.spec.ts
├── useUserForm.spec.ts
├── user.service.spec.ts
└── mapUserDto.spec.ts
```

**Ví dụ:**
```ts
// useUserList.spec.ts
import { useUserList } from '../hooks/useUserList'
import { userService } from '../services/user.service'
import { vi } from 'vitest'

vi.mock('../services/user.service')

it('fetches and maps users on mount', async () => {
  vi.mocked(userService.getList).mockResolvedValue([mockUserDto])

  const { users, fetchUsers } = useUserList()
  await fetchUsers()

  expect(users.value[0].fullName).toBe('Nguyen Van A')
})
```

---

### 10. `docs/`

**Là gì:** Business documentation — không phải technical doc.

**Viết khi:** Module có logic phức tạp, rule nghiệp vụ đặc thù, flow nhiều bước.

```
docs/
├── permission-flow.md           ← Mô tả luồng phân quyền
└── role-matrix.md               ← Bảng role vs permission
```

**Template gợi ý cho `permission-flow.md`:**
```markdown
# Permission Flow

## Mô tả
[Mô tả ngắn gọn luồng này làm gì]

## Điều kiện
- User phải có role X
- Resource phải ở trạng thái Y

## Luồng chính
1. ...
2. ...

## Edge cases
- Nếu ... thì ...

## File liên quan
- `hooks/useUserPermission.ts`
- `constants/USER_ROLE_OPTIONS.ts`
```

---

### `index.ts` — Public API

**Là gì:** Cổng duy nhất để module ngoài import vào. Kiểm soát những gì được export.

**Nguyên tắc:** Chỉ export những gì module khác **thực sự cần dùng**.

```ts
// modules/user/index.ts

// Containers (entry points)
export { default as UserListContainer } from './containers/UserListContainer.vue'
export { default as UserFormContainer } from './containers/UserFormContainer.vue'

// Hooks (nếu module khác cần dùng)
export { useUserPermission } from './hooks/useUserPermission'

// Types (luôn export)
export type { UserViewModel } from './types/user.view-model'
export type { UserDto } from './types/user.dto'
export { UserRole, UserStatus } from './types/user.enums'
```

**Import từ module khác:**
```ts
// ✅ Đúng — import qua index
import { UserListContainer, UserRole } from '@/modules/user'

// ❌ Sai — import trực tiếp vào internal file
import { UserListContainer } from '@/modules/user/containers/UserListContainer.vue'
```

---

## Checklist khi tạo module mới

```
□ Tạo đủ 10 folder (bỏ qua schemas/ nếu không có form)
□ Đặt tên folder đúng theo domain (user/, order/, product/...)
□ types/ chỉ chứa type dùng ở 2+ nơi trong module — type 1 chỗ thì define tại chỗ
□ Không hardcode string trong component — dùng constants/
□ utils/ chỉ chứa pure function
□ services/ không import Vue, không giữ state
□ containers/ không gọi service trực tiếp
□ index.ts chỉ export những gì cần thiết
□ Mỗi hook có ít nhất 1 test cơ bản
□ Nếu có luồng phức tạp → viết docs/
```

---

## Ví dụ cấu trúc hoàn chỉnh — Module `user`

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
│   ├── mapUserDto.ts
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
│   └── mapUserDto.spec.ts
│
└── index.ts
```

---

## Khi module quá lớn — Flat Sub-modules

**Dấu hiệu cần tách:** Một trong các folder (`hooks/`, `components/`) có 7+ file, hoặc có 2+ feature rõ ràng độc lập nhau.

### Cấu trúc

```
quick-query/
├── shared/                          ← Dùng chung toàn module
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
├── table-detail/                    ← Sub-module, tự đóng gói, KHÔNG biết sub-module khác
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
├── query-editor/                    ← Sub-module, tự đóng gói, KHÔNG biết sub-module khác
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── index.ts
│
├── containers/                      ← Orchestration layer — nơi DUY NHẤT được compose sub-modules
│   └── QuickQueryContainer.vue      ← Import từ table-detail + query-editor + shared
│
└── index.ts                         ← Public API của toàn QuickQuery
```

### Low Coupling — High Cohesion áp dụng thế nào

**High Cohesion:**
- Mỗi sub-module chỉ chứa logic liên quan đến chính nó — `table-detail` không biết gì về `query-editor`
- `shared/` chỉ chứa thứ **thực sự** dùng ở 2+ sub-modules — không dump mọi thứ vào đây

**Low Coupling:**
- Sub-modules **không bao giờ import lẫn nhau** — coupling = 0 giữa các sub-modules
- `containers/` là layer **duy nhất** được phép biết về nhiều sub-modules cùng lúc
- Sub-module chỉ có 2 nguồn import hợp lệ: **chính nó** và **`shared/`**

```
# ✅ Sub-module chỉ dùng shared của parent
table-detail/hooks/useTableStructure.ts  →  ../shared/services/query.service.ts

# ✅ containers/ ở parent compose tất cả lại
containers/QuickQueryContainer.vue       →  ../table-detail
containers/QuickQueryContainer.vue       →  ../query-editor
containers/QuickQueryContainer.vue       →  ../shared

# ❌ Import ngang giữa sub-modules — VI PHẠM Low Coupling
table-detail/  →  query-editor/
query-editor/  →  table-detail/
```

> **Rule vàng:** Nếu sub-module A cần dùng gì từ sub-module B → đó là dấu hiệu thứ đó thuộc về `shared/`, không phải của B.

### containers/ ở parent trông như thế nào

```vue
<!-- containers/QuickQueryContainer.vue -->
<script setup lang="ts">
// Import từ sub-modules qua index.ts — không import thẳng vào file nội bộ
import { TableDetailPanel } from '../table-detail'
import { QueryEditorPanel } from '../query-editor'
import { useQueryConnection } from '../shared/hooks/useQueryConnection'

const { connection, isConnected } = useQueryConnection()
</script>

<template>
  <QueryEditorPanel :connection="connection" />
  <TableDetailPanel v-if="isConnected" />
</template>
```

### Quyết định khi nào dùng

| Tình huống | Làm gì |
|---|---|
| Module có 1–6 file mỗi folder | Giữ flat bình thường, chưa cần tách |
| Có 2+ feature độc lập, folder bắt đầu nhiều file | Tách thành Flat Sub-modules |
| Sub-module lại lớn tiếp | **KHÔNG nest thêm** — tách lên thành module riêng ở cấp trên |
| 2 sub-modules muốn dùng chung logic | Đẩy lên `shared/`, không import chéo |

### index.ts của Sub-module

Mỗi sub-module có `index.ts` riêng — **chỉ export những gì `containers/` của parent cần**:

```ts
// table-detail/index.ts
export { default as TableDetailPanel } from './components/TableDetailPanel.vue'
export type { TableStructure, ErdNode } from './types/table.types'
// Không export hooks, services, utils — đó là internal
```

```ts
// quick-query/index.ts — Public API ra ngoài app
export { default as QuickQueryContainer } from './containers/QuickQueryContainer.vue'
```

---

*Cập nhật guide này khi có thay đổi kiến trúc. Mọi exception cần comment rõ lý do trong code.*