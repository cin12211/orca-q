# OrcaQ Code Guidelines

**Version:** 1.0  
**Last Updated:** February 2026

This document defines the coding standards, naming conventions, and best practices for the OrcaQ project.

---

## 1. File & Folder Naming Conventions

### Components

| Type               | Convention                                 | Example                                    |
| ------------------ | ------------------------------------------ | ------------------------------------------ |
| **Vue Components** | PascalCase                                 | `QuickQuery.vue`, `BaseCodeEditor.vue`     |
| **Hook files**     | camelCase with `use` prefix                | `useQuickQueryMutation.ts`                 |
| **Store files**    | camelCase with `use` prefix or descriptive | `useTabViewsStore.ts`, `appLayoutStore.ts` |
| **Type files**     | kebab-case with `.type.ts` or `.types.ts`  | `database-roles.types.ts`                  |
| **Constant files** | camelCase or `constants.ts`                | `constants.ts`                             |
| **Utility files**  | camelCase with descriptive names           | `generateTableSQL.ts`                      |

### Folders

| Type                    | Convention | Example                               |
| ----------------------- | ---------- | ------------------------------------- |
| **Module folders**      | kebab-case | `quick-query/`, `management-schemas/` |
| **Sub-feature folders** | kebab-case | `quick-query-filter/`, `code-editor/` |

---

## 2. Vue Component Patterns

### Script Setup (Mandatory)

All components use the Composition API with `<script setup lang="ts">`:

```vue
<script setup lang="ts">
// 1. Imports
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import type { TabView } from '~/shared/stores/useTabViewsStore';

// 2. Props & Emits
const props = defineProps<{
  tabId: string;
  isActive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'close'): void;
}>();

// 3. Stores & Composables
const appLayoutStore = useAppLayoutStore();
const { wsState } = toRefs(useWSStateStore());

// 4. Refs & Reactive State
const isLoading = ref(false);
const formData = reactive({ name: '', value: '' });

// 5. Computed Properties
const isValid = computed(() => formData.name.length > 0);

// 6. Functions
const handleSubmit = async () => {
  // ...
};

// 7. Lifecycle Hooks
onMounted(() => {
  // ...
});

// 8. Watchers
watch(
  () => props.tabId,
  newId => {
    // ...
  }
);
</script>
```

### Component Structure Order

1. `<script setup lang="ts">` (logic first)
2. `<template>` (markup)
3. `<style scoped>` (optional, prefer Tailwind)

---

## 3. TypeScript Conventions

### Type Definitions

```typescript
// ✅ Use interfaces for object shapes
export interface Schema {
  id: string;
  name: string;
  tables: string[];
}

// ✅ Use type for unions, intersections, and primitives
export type TabViewType = 'TableOverview' | 'CodeQuery' | 'ERD';
export type AIProvider = 'openai' | 'google' | 'anthropic';

// ✅ Use enums for fixed sets with meaning
export enum TabViewType {
  AllERD = 'AllERD',
  TableDetail = 'tableDetail',
  CodeQuery = 'CodeQuery',
}
```

### Generic Patterns

```typescript
// ✅ Type-safe store actions
const createWorkspace = async (workspace: Workspace) => {
  await window.workspaceApi.create(workspace);
};

// ✅ Props with defaults
const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    size: 'md',
  }
);
```

---

## 4. State Management Rules

### When to Use What

| State Type                   | Use For                             | Location            |
| ---------------------------- | ----------------------------------- | ------------------- |
| **Local `ref`/`reactive`**   | UI state (modals, forms, temp data) | Component           |
| **Pinia Store**              | Shared state across components      | `/shared/stores/`   |
| **Composable**               | Reusable logic with local state     | `/composables/`     |
| **Context (provide/inject)** | Deep component tree data            | `/shared/contexts/` |

### Store Naming Pattern

```typescript
// ✅ Setup Store Pattern (preferred)
export const useTabViewsStore = defineStore(
  'tab-views',
  () => {
    const tabViews = ref<TabView[]>([]);

    const openTab = async (tab: TabView) => {
      /* ... */
    };

    return { tabViews, openTab };
  },
  {
    persist: false, // Custom persistence via IndexedDB
  }
);
```

### Store Dependencies

Use `toRefs()` when accessing store state:

```typescript
const wsStateStore = useWSStateStore();
const { workspaceId, connectionId } = toRefs(wsStateStore);
```

---

## 5. Import Patterns

### Path Aliases

```typescript
// ✅ Use ~ for src root
import { useSchemaStore } from '~/shared/stores/useSchemaStore';
import QuickQuery from '~/components/modules/quick-query/QuickQuery.vue';

// ❌ Avoid relative paths for cross-module imports
import { useSchemaStore } from '../../../shared/stores/useSchemaStore';
```

### Barrel Exports

Each module should have an `index.ts`:

```typescript
// ~/shared/stores/index.ts
export * from './useWorkspacesStore';
export * from './useSchemaStore';
export * from './useTabViewsStore';
```

---

## 6. API & Data Fetching

### Server API Pattern

```typescript
// ✅ Use $fetch with typed responses
const result = await $fetch('/api/get-tables', {
  method: 'POST',
  body: {
    dbConnectionString: connection.connectionString,
    schemaName: 'public',
  },
});

// ✅ Error handling with try-catch
try {
  const data = await $fetch('/api/execute', { method: 'POST', body });
} catch (error) {
  console.error('Query execution failed:', error);
  throw error;
}
```

---

## 7. Styling Rules

### Tailwind First

```vue
<!-- ✅ Prefer Tailwind utilities -->
<div class="flex items-center gap-2 p-4 bg-gray-50 rounded-md"></div>
```

### Component-Scoped CSS (When Needed)

```vue
<style scoped>
/* Only for complex styles not achievable with Tailwind */
.custom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
</style>
```

---

## 8. Error Handling

### API Error Pattern

```typescript
// ✅ Consistent error handling
const executeQuery = async (query: string) => {
  try {
    return await $fetch('/api/execute', { method: 'POST', body: { query } });
  } catch (error) {
    errorMessage.value = error.message;
    openErrorModal.value = true;
    throw error;
  }
};
```

### Form Validation (Zod)

```typescript
import { z } from 'zod';

const connectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  connectionString: z.string().url('Invalid connection string'),
  type: z.enum(['postgres', 'mysql']),
});
```

---

## 9. Component Communication

### Props Down, Events Up

```vue
<!-- Parent -->
<QuickQueryFilter
  :filters="activeFilters"
  @update:filters="handleFilterChange"
/>

<!-- Child -->
<script setup>


const emit = defineEmits<{
  (e: 'update:filters', filters: Filter[]): void;
}>();
</script>
```

### Deep Tree: Provide/Inject

```typescript
// Parent provides
provide('connection', connectionRef);

// Deep child injects
const connection = inject<Ref<Connection>>('connection');
```

---

## 10. Keyboard Shortcuts

Use the `useHotkeys` composable:

```typescript
useHotkeys([
  {
    key: 'meta+s',
    callback: () => onSaveData(),
    isPreventDefault: true,
  },
  {
    key: 'meta+c',
    callback: () => onCopyRows(),
    excludeInput: true,
  },
]);
```

---

## 11. Do / Don't Examples

### ✅ DO

```typescript
// Use typed refs
const isLoading = ref<boolean>(false);

// Use computed for derived state
const hasChanges = computed(() => editedRows.value.length > 0);

// Destructure with toRefs for reactivity
const { workspaceId } = toRefs(wsStateStore);
```

### ❌ DON'T

```typescript
// Avoid any type
const data: any = await fetch(...);

// Avoid direct store mutation outside store
wsStateStore.workspaceId = 'new-id'; // Do this via action

// Avoid inline anonymous functions in templates
@click="() => handleClick(item.id)" // Extract to method
```

---

## Quick Reference

| Convention        | Pattern                                  |
| ----------------- | ---------------------------------------- |
| Vue Components    | PascalCase, `<script setup>`             |
| Hooks/Composables | `use` prefix, camelCase                  |
| Stores            | `use...Store` pattern                    |
| Types             | Interfaces for objects, Types for unions |
| Imports           | `~/` path alias                          |
| Styling           | Tailwind first                           |
| API Calls         | `$fetch` with typed body                 |
