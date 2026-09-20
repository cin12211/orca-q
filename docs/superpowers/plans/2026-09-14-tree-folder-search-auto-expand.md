# Tree Folder Search Auto-Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **IMPORTANT USER RULE:** Do NOT execute `git commit`. Leave all changes unstaged in the working tree for user review.

**Goal:** Auto-expand tree folders when a user searches so matching nested items are visible, and restore previous expansion when the search query is cleared.

**Architecture:** Add `searchQuery?: string` prop and search-expansion/restore logic inside `FileTree.vue` (`components/base/tree-folder/FileTree.vue`), prevent persistence while searching, and pass `debouncedSearch` down from all management sidebar views.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, Vitest.

## Global Constraints

- Do NOT run `git commit` automatically at any step.
- Preserve all existing `FileTree` functionality (drag-and-drop, inline rename, multi-select, keyboard navigation, persistence).
- All changes must pass `bun run typecheck` and `bun test:unit`.

---

### Task 1: Enhance `FileTree.vue` with Search Auto-Expand & State Restore

**Files:**

- Modify: `components/base/tree-folder/FileTree.vue`

**Interfaces:**

- Prop added: `searchQuery?: string` (default: `''`)
- When `searchQuery` becomes non-empty:
  - Save current `expandedIds` to `savedExpandedIdsBeforeSearch`.
  - Trigger `expandAll()` on `nextTick()`.
- When `searchQuery` becomes empty:
  - Restore `expandedIds` from `savedExpandedIdsBeforeSearch` if present.
  - Reset `savedExpandedIdsBeforeSearch` to `null`.
- When saving to persistence strategy:

  - Skip calling `expandedIdsPersistenceStrategy.value?.save(newVal)` if `props.searchQuery && props.searchQuery.trim()`.

- [ ] **Step 1: Update `Props` interface and withDefaults in `FileTree.vue`**
      Add `searchQuery?: string;` to `Props` interface and default `searchQuery: ''` in `withDefaults`.

- [ ] **Step 2: Add `savedExpandedIdsBeforeSearch` state and search watcher in `FileTree.vue`**

```ts
const savedExpandedIdsBeforeSearch = ref<Set<string> | null>(null);

watch(
  () => props.searchQuery,
  async (newQuery, oldQuery) => {
    const hasNew = Boolean(newQuery && newQuery.trim());
    const hadOld = Boolean(oldQuery && oldQuery.trim());

    if (hasNew) {
      if (!hadOld) {
        savedExpandedIdsBeforeSearch.value = new Set(expandedIds.value);
      }
      await nextTick();
      expandAll();
    } else if (hadOld && !hasNew) {
      if (savedExpandedIdsBeforeSearch.value) {
        expandedIds.value = new Set(savedExpandedIdsBeforeSearch.value);
        savedExpandedIdsBeforeSearch.value = null;
      }
    }
  }
);
```

- [ ] **Step 3: Update persistence watcher to avoid overwriting stored state during active search**
      In `FileTree.vue` line ~775:

```ts
watch(
  () => Array.from(expandedIds.value),
  newVal => {
    if (props.searchQuery && props.searchQuery.trim()) {
      return;
    }
    expandedIdsPersistenceStrategy.value?.save(newVal);
  }
);
```

- [ ] **Step 4: Verify typecheck**
      Run: `bun run typecheck`
      Expected: 0 errors.

---

### Task 2: Connect `search-query` in Schemas, MongoDB Schemas, and ERD Diagram

**Files:**

- Modify: `components/modules/management/schemas/ManagementSchemas.vue`
- Modify: `components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue`
- Modify: `components/modules/management/erd-diagram/ManagementErdDiagram.vue`

**Interfaces:**

- Pass `:search-query="debouncedSearch"` to `<FileTree>` in all 3 components.

- [ ] **Step 1: Update `ManagementSchemas.vue`**
      In `<FileTree ref="fileTreeRef" ... />`, add `:search-query="debouncedSearch"`.

- [ ] **Step 2: Update `ManagementMongoSchemas.vue`**
      In `<FileTree ref="fileTreeRef" ... />`, add `:search-query="debouncedSearch"`.

- [ ] **Step 3: Update `ManagementErdDiagram.vue`**
      In `<FileTree ref="fileTreeRef" ... />`, add `:search-query="debouncedSearch"`.

- [ ] **Step 4: Verify typecheck**
      Run: `bun run typecheck`
      Expected: 0 errors.

---

### Task 3: Connect `search-query` in Explorer, Roles & Permissions, Agent History, and Redis Key Tree

**Files:**

- Modify: `components/modules/management/explorer/components/ManagementExplorerTree.vue`
- Modify: `components/modules/management/explorer/ManagementExplorer.vue`
- Modify: `components/modules/management/role-permission/components/UserRolesTree.vue`
- Modify: `components/modules/management/role-permission/ManagementUsersAndPermission.vue`
- Modify: `components/modules/management/agent/components/ManagementAgentHistoryTree.vue`
- Modify: `components/modules/management/agent/ManagementAgent.vue`
- Modify: `components/modules/management/redis-browser/components/RedisKeyTree.vue`

**Interfaces:**

- Add `searchQuery?: string` prop to `ManagementExplorerTree.vue`, `UserRolesTree.vue`, and `ManagementAgentHistoryTree.vue`.
- Forward `props.searchQuery` to `<FileTree :search-query="searchQuery" ... />`.
- In parents (`ManagementExplorer.vue`, `ManagementUsersAndPermission.vue`, `ManagementAgent.vue`), bind `:search-query="debouncedSearch"`.
- In `RedisKeyTree.vue`, bind `:search-query="props.searchQuery"` to `<FileTree>`.

- [ ] **Step 1: Update `ManagementExplorerTree.vue` and `ManagementExplorer.vue`**
      Add `searchQuery?: string` to `Props` in `ManagementExplorerTree.vue` and pass `:search-query="props.searchQuery"` to `FileTree`.
      Pass `:search-query="debouncedSearch"` from `ManagementExplorer.vue`.

- [ ] **Step 2: Update `UserRolesTree.vue` and `ManagementUsersAndPermission.vue`**
      Add `searchQuery?: string` to `Props` in `UserRolesTree.vue` and pass `:search-query="props.searchQuery"` to `FileTree`.
      Pass `:search-query="debouncedSearch"` from `ManagementUsersAndPermission.vue`.

- [ ] **Step 3: Update `ManagementAgentHistoryTree.vue` and `ManagementAgent.vue`**
      Add `searchQuery?: string` to `Props` in `ManagementAgentHistoryTree.vue` and pass `:search-query="props.searchQuery"` to `FileTree`.
      Pass `:search-query="debouncedSearch"` from `ManagementAgent.vue`.

- [ ] **Step 4: Update `RedisKeyTree.vue`**
      Pass `:search-query="props.searchQuery"` directly to `FileTree`.

- [ ] **Step 5: Verify typecheck**
      Run: `bun run typecheck`
      Expected: 0 errors.

---

### Task 4: Unit Testing & Final Verification

**Files:**

- Create: `test/unit/components/base/tree-folder/file-tree-search-expand.spec.ts`

- [ ] **Step 1: Write unit tests for `FileTree.vue` search auto-expand and restore**
      Test:

1. When `searchQuery` becomes non-empty, all folder IDs are added to `expandedIds`.
2. When `searchQuery` is cleared, previous `expandedIds` are restored.
3. Persistence save is skipped when `searchQuery` is active.

- [ ] **Step 2: Run test suite**
      Run: `bun test:unit test/unit/components/base/tree-folder/file-tree-search-expand.spec.ts`
      Expected: PASS.

- [ ] **Step 3: Run full typecheck**
      Run: `bun run typecheck`
      Expected: PASS.
