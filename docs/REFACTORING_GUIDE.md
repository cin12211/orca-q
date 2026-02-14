# Refactoring for Scalability & Maintainability

This guide outlines strategies to refactor the `QuickQuery` module and related components to improve scalability, testability, and ease of maintenance.

## 1. Decouple Component from Store

**Current Status**: `QuickQuery.vue` is tightly coupled to `useTabViewsStore`. It derives its entire context (`tableName`, `schemaName`) from a `tabViewId` prop by looking it up in the store. This makes the component hard to test and reuse (e.g., in a dashboard widget or modal).

**Recommendation**:

- **Prop-Driven Architecture**: Refactor `QuickQuery.vue` to accept `tableName`, `schemaName`, and `connectionId` as direct props.
- **Container Component**: Create a `QuickQueryContainer.vue` (or `QuickQueryTabWrapper.vue`) that connects to the store, retrieves the data using `tabViewId`, and passes it down to the presentational `QuickQuery.vue`.

```vue
<!-- QuickQueryContainer.vue -->
<script setup>
const props = defineProps(['tabViewId']);
const store = useTabViewsStore();
const tabInfo = computed(() => store.getTabById(props.tabViewId));
</script>

<template>
  <QuickQuery
    v-if="tabInfo"
    :table-name="tabInfo.tableName"
    :schema-name="tabInfo.schemaId"
    :connection-id="tabInfo.connectionId"
  />
</template>
```

## 2. Consolidate State Management

**Current Status**: State management logic is scattered across multiple composables (`useTableQueryBuilder`, `useQuickQueryMutation`, `useQuickQueryTableInfo`, `useQuickQuery`). This leads to "prop drilling" of refs and implicit dependencies.

**Recommendation**:

- **Dedicated Store Pattern**: Create a "Tab Context" store. Since multiple tabs can be open, use a factory pattern or a Pinia store that accepts an ID.
- **Unified Composable**: Create `useQuickQueryState(tabId)` that returns a single, cohesive state object containing `filters`, `pagination`, `data`, and `mutationMethods`. This reduces the number of disparate refs being passed around.

## 3. Strict Typing for Stores

**Current Status**: `TabView` has some optional fields and `any` casts in legacy code.

**Recommendation**:

- **Strict Interfaces**: Ensure `TabView` and all store actions use strict interfaces.
- **Discriminated Unions**: If `TabView` handles different types (Table vs. SQL Query), use a discriminated union type (e.g., `TableTab | QueryTab`) to enforce correct properties for each type.

## 4. Optimize "Teleported" Components

**Current Status**: `QuickQuery` teleports elements to global layout IDs (`#preview-select-row`, `#bottom-panel`). This creates implicit DOM dependencies.

**Recommendation**:

- **Layout Slots**: If these areas are part of the main layout, consider using Named Slots in a Layout component instead of Teleports if the hierarchy permits.
- **Portal-Target Component**: If Teleports are necessary, formalize the targets as components (e.g., `<ActionbarTarget>`) to make the dependency explicit.

## 5. Feature Modularization

**Current Status**: `QuickQuery` handles everything: filtering, grid, mutation, history, ERD, structure.

**Recommendation**:

- **Lazy Loading**: Ensure heavier sub-components like `WrapperErdDiagram` and `StructureTable` are lazy-loaded (`defineAsyncComponent`) since they aren't always visible.
- **Composition**: Split `QuickQuery.vue` into smaller, feature-specific components.
  - `QuickQueryDataView.vue` (Grid + Filters + Pagination)
  - `QuickQueryStructureView.vue`
  - `QuickQueryErdView.vue`
    This reduces the complexity of the main file.
