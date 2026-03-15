# OrcaQ Architecture Enhancements

**Version:** 1.0  
**Last Updated:** February 2026

Areas requiring improvement for better scalability, maintainability, and architectural consistency.

---

## Priority Legend

- 🔴 **Critical** - Blocking scalability, needs immediate attention
- 🟠 **High** - Significant improvement opportunity
- 🟡 **Medium** - Nice to have, improves DX
- 🟢 **Low** - Future consideration

---

## 1. State Management 🟠

### Current Issues

#### 1.1 Store Coupling

**Location:** `/shared/stores/`

```typescript
// PROBLEM: Stores directly reference each other
export const useTabViewsStore = defineStore('tab-views', () => {
  const wsStateStore = useWSStateStore(); // tight coupling
  // ...
});
```

**Issues:**

- Circular dependencies risk
- Hard to test in isolation
- Difficult to mock

**Recommendation:**

```typescript
// SOLUTION: Inject dependencies or use events
export const useTabViewsStore = defineStore('tab-views', () => {
  // Accept context via composable parameter or use event bus
  const { workspaceId, connectionId } = useWorkspaceContext();
});
```

---

#### 1.2 Inconsistent Store Patterns

**Files affected:**

- `appConfigStore.ts` - Uses `reactive()` inline
- `useTabViewsStore.ts` - Uses `ref()` pattern
- `managementConnectionStore.ts` - Mixed patterns

**Recommendation:** Standardize on one pattern:

```typescript
// STANDARD: Always use ref() + computed() in setup stores
export const useExampleStore = defineStore('example', () => {
  const items = ref<Item[]>([]);
  const activeItem = computed(() => /* ... */);
  return { items, activeItem };
});
```

---

#### 1.3 Schema Store Cache Invalidation 🟠

**Location:** `/shared/stores/useSchemaStore.ts`

```typescript
// PROBLEM: No TTL or smart invalidation
const schemas = ref<Schema[]>([]);
// Data stays stale until manual refresh
```

**Recommendation:**

```typescript
interface CachedSchema extends Schema {
  cachedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const isStale = (schema: CachedSchema) =>
  Date.now() - schema.cachedAt > CACHE_TTL;
```

---

## 2. API Layer 🟠

### 2.1 No API Client Abstraction

**Location:** `/server/api/`, components using `$fetch`

**Current:**

```typescript
// PROBLEM: $fetch scattered across components
const result = await $fetch('/api/execute', {
  method: 'POST',
  body: { query, dbConnectionString },
});
```

**Recommendation:** Create centralized API client

```typescript
// /lib/api/client.ts
export const api = {
  execute: (query: string, connectionString: string) =>
    $fetch('/api/execute', {
      method: 'POST',
      body: { query, dbConnectionString },
    }),

  getTables: (connectionString: string, schema?: string) =>
    $fetch('/api/get-tables', {
      method: 'POST',
      body: { dbConnectionString, schemaName: schema },
    }),
};

// Usage
const result = await api.execute(query, connectionString);
```

---

### 2.2 Missing Request Cancellation 🟡

**Issue:** Long-running queries cannot be cancelled

**Recommendation:** Add AbortController support

```typescript
// /composables/useQuery.ts
export const useQuery = () => {
  const controller = ref<AbortController | null>(null);

  const execute = async (query: string) => {
    controller.value?.abort();
    controller.value = new AbortController();

    return $fetch('/api/execute', {
      method: 'POST',
      body: { query },
      signal: controller.value.signal,
    });
  };

  const cancel = () => controller.value?.abort();

  return { execute, cancel };
};
```

---

### 2.3 No Retry Logic 🟡

**Issue:** Transient failures cause immediate errors

**Recommendation:** Add retry wrapper

```typescript
const fetchWithRetry = async (url: string, options: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await $fetch(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

---

## 3. Component Architecture 🟠

### 3.1 Large Monolithic Components 🔴

**Files affected:**
| Component | Lines | Issue |
|-----------|-------|-------|
| `QuickQuery.vue` | 581 | Too many responsibilities |
| `CreateConnectionModal.vue` | 500+ | Form logic mixed with UI |
| `useRawQueryEditor.ts` | 500+ | Hook doing too much |

**Recommendation:** Extract sub-components

```
QuickQuery/
├── QuickQuery.vue          # Container only (~100 lines)
├── QuickQueryProvider.vue  # State provider
├── QuickQueryToolbar.vue   # Extracted toolbar
├── QuickQueryGrid.vue      # AG Grid wrapper
├── QuickQueryPagination.vue
└── hooks/
    ├── useQuickQueryState.ts    # State only
    ├── useQuickQueryMutation.ts # Mutations only
    └── useQuickQueryFilter.ts   # Filter logic
```

---

### 3.2 Missing Error Boundaries 🟡

**Issue:** Component errors crash entire view

**Recommendation:**

```vue
<!-- /components/base/ErrorBoundary.vue -->
<script setup>
const error = (ref < Error) | (null > null);

onErrorCaptured(err => {
  error.value = err;
  return false; // prevent propagation
});
</script>

<template>
  <slot v-if="!error" />
  <ErrorFallback v-else :error="error" @retry="error = null" />
</template>
```

---

### 3.3 Inconsistent Props Typing 🟡

**Issue:** Some components use `any` or loose types

```typescript
// PROBLEM
const props = defineProps<{
  data: any;  // No type safety
}>();

// SOLUTION
interface QuickQueryProps {
  schemaName: string;
  tableName: string;
  initialFilters?: Filter[];
}
const props = defineProps<QuickQueryProps>();
```

---

## 4. Hook Architecture 🟠

### 4.1 Hooks with Side Effects

**Location:** `/components/modules/quick-query/hooks/`

```typescript
// PROBLEM: Hook makes API calls on import
export const useQuickQueryTableInfo = () => {
  const data = ref();

  // Side effect on hook creation
  onMounted(async () => {
    data.value = await $fetch('/api/get-table'); // implicit
  });
};
```

**Recommendation:** Explicit initialization

```typescript
export const useQuickQueryTableInfo = () => {
  const data = ref();
  const isLoading = ref(false);

  const load = async (tableName: string) => {
    isLoading.value = true;
    data.value = await $fetch('/api/get-table', { body: { tableName } });
    isLoading.value = false;
  };

  return { data, isLoading, load }; // Caller controls when to load
};
```

---

### 4.2 Missing Composable Tests 🟠

**Issue:** No unit tests for composables

**Recommendation:** Add test coverage

```typescript
// /composables/__tests__/useTableQueryBuilder.test.ts
import { useTableQueryBuilder } from '../useTableQueryBuilder';

describe('useTableQueryBuilder', () => {
  it('should build SELECT with filters', () => {
    const { buildQuery } = useTableQueryBuilder({
      tableName: 'users',
      schemaName: 'public',
    });

    expect(
      buildQuery({
        filters: [{ column: 'id', operator: '=', value: 1 }],
      })
    ).toContain('WHERE id = 1');
  });
});
```

---

## 5. Type System 🟡

### 5.1 Missing Zod Runtime Validation

**Issue:** API responses not validated at runtime

```typescript
// PROBLEM: Trust API response shape
const result = await $fetch('/api/get-tables');
// result could be malformed

// SOLUTION: Validate with Zod
const TableSchema = z.object({
  table_name: z.string(),
  columns: z.array(ColumnSchema),
});

const result = TableSchema.parse(await $fetch('/api/get-tables'));
```

---

### 5.2 Duplicate Type Definitions

**Files with similar types:**

- `/shared/types/database-roles.types.ts`
- `/server/api/get-schema-meta-data.ts` (inline types)
- `/components/modules/management-schemas/hooks/` (local types)

**Recommendation:** Centralize in `/shared/types/`

```typescript
// Reuse everywhere
import type { Table, Column } from '~/shared/types/database.types';

// /shared/types/database.types.ts
export interface Table {
  /* ... */
}
export interface Column {
  /* ... */
}
export interface ForeignKey {
  /* ... */
}
```

---

## 6. Performance 🟡

### 6.1 AG Grid Bundle Size

**Issue:** AG Grid is large (~300KB gzipped)

**Recommendation:** Dynamic import

```typescript
const AgGridVue = defineAsyncComponent(() =>
  import('ag-grid-vue3').then(m => m.AgGridVue)
);
```

---

### 6.2 Schema Metadata Over-fetching 🟠

**Issue:** `/api/get-schema-meta-data` returns all tables for all schemas

**Recommendation:** Paginated/lazy loading

```typescript
// Fetch schema list first
const schemas = await api.getSchemaNames();

// Fetch tables on-demand when schema expanded
const tables = await api.getTablesForSchema(schemaName);
```

---

### 6.3 Missing Virtual Scrolling in Trees 🟡

**Location:** `/components/base/Tree/`

**Issue:** Large schema trees render all nodes

**Recommendation:** Implement virtual scrolling

```vue
<VirtualTree :items="flattenedTree" :item-height="32" :visible-items="20">
  <template #item="{ item }">
    <TreeItem :item="item" />
  </template>
</VirtualTree>
```

---

## 7. Error Handling 🟠

### 7.1 Inconsistent Error Patterns

**Issue:** Mix of toast, modal, console, and thrown errors

**Recommendation:** Centralized error handler

```typescript
// /composables/useErrorHandler.ts
export const useErrorHandler = () => {
  const { toast } = useSonner();

  const handle = (error: Error, context?: string) => {
    console.error(`[${context}]`, error);

    if (error instanceof ValidationError) {
      toast.warning(error.message);
    } else if (error instanceof NetworkError) {
      toast.error('Network error. Please retry.');
    } else {
      toast.error('Unexpected error occurred.');
    }
  };

  return { handle };
};
```

---

## 8. Folder Structure 🟡

### 8.1 Stores Location

**Current:** `/shared/stores/`  
**Issue:** "shared" is vague

**Recommendation:** Move to `/stores/` at root

---

### 8.2 Types Scattered

**Current locations:**

- `/shared/types/`
- `/server/api/*.ts` (inline)
- `/components/modules/*/type/`

**Recommendation:** Single source of truth at `/types/`

---

## Summary & Priority Matrix

| Area                        | Priority    | Effort | Impact |
| --------------------------- | ----------- | ------ | ------ |
| Large Component Refactoring | 🔴 Critical | High   | High   |
| API Client Abstraction      | 🟠 High     | Medium | High   |
| Store Standardization       | 🟠 High     | Medium | Medium |
| Cache Invalidation          | 🟠 High     | Low    | High   |
| Error Handling              | 🟠 High     | Medium | Medium |
| Type Centralization         | 🟡 Medium   | Low    | Medium |
| Virtual Scrolling           | 🟡 Medium   | Medium | Medium |
| Bundle Optimization         | 🟡 Medium   | Low    | Low    |
| Test Coverage               | 🟠 High     | High   | High   |

---

## Recommended Action Order

1. **Week 1-2:** Create API client abstraction
2. **Week 3-4:** Refactor QuickQuery.vue into smaller components
3. **Week 5-6:** Standardize store patterns
4. **Week 7-8:** Add composable unit tests
5. **Ongoing:** Centralize types as touched
