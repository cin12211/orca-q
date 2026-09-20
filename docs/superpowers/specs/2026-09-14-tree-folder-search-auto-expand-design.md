# Tree Folder Search Auto-Expand Design Specification

## Overview

When users type a search term in sidebar management trees (Redis Browser, Schemas, MongoDB Collections, File Explorer, ERD Diagram, Roles & Permissions, Agent History), matching items may be nested inside collapsed tree folders.

Following the UX pattern established in `ManagementRedisBrowser.vue` / `RedisKeyTree.vue`, when a search query is active, the tree folders should automatically expand all matched parent nodes so that all matching items are immediately visible. When the search is cleared, the previous expansion state is restored without permanently polluting persistent storage.

## Target Architecture

### 1. Core Component: `FileTree.vue` (`components/base/tree-folder/FileTree.vue`)

Add prop:

- `searchQuery?: string` (default: `''`)

Add state:

- `savedExpandedIdsBeforeSearch = ref<Set<string> | null>(null)`

Add behavior:

- When `searchQuery` changes to a non-empty string:
  - If transitioning from empty to non-empty query, snapshot `expandedIds` into `savedExpandedIdsBeforeSearch`.
  - On `nextTick()`, execute `expandAll()`.
- When `searchQuery` changes from non-empty back to empty:
  - If `savedExpandedIdsBeforeSearch` exists, restore `expandedIds` from `savedExpandedIdsBeforeSearch`, then set `savedExpandedIdsBeforeSearch.value = null`.
- Persistence guard:
  - In `watch(() => Array.from(expandedIds.value))`, skip calling `expandedIdsPersistenceStrategy.value?.save(newVal)` if `props.searchQuery?.trim()` is active, ensuring temporary search expansions don't overwrite the user's manual folder layout in `localStorage`.

### 2. Management Modules Integration

Wire `:search-query` down to `FileTree.vue` in all management modules:

1. **Schemas** (`components/modules/management/schemas/ManagementSchemas.vue`):
   - Bind `:search-query="debouncedSearch"` to `FileTree`.
2. **MongoDB Schemas** (`components/modules/management/schemas/mongodb/ManagementMongoSchemas.vue`):
   - Bind `:search-query="debouncedSearch"` to `FileTree`.
3. **Explorer** (`components/modules/management/explorer/`):
   - In `ManagementExplorerTree.vue`: Add `searchQuery?: string` prop and forward to `FileTree`.
   - In `ManagementExplorer.vue`: Pass `:search-query="debouncedSearch"` to `ManagementExplorerTree`.
4. **ERD Diagram** (`components/modules/management/erd-diagram/ManagementErdDiagram.vue`):
   - Bind `:search-query="debouncedSearch"` to `FileTree`.
5. **Roles & Permissions** (`components/modules/management/role-permission/`):
   - In `UserRolesTree.vue`: Add `searchQuery?: string` prop and forward to `FileTree`.
   - In `ManagementUsersAndPermission.vue`: Pass `:search-query="debouncedSearch"` to `UserRolesTree`.
6. **Agent History** (`components/modules/management/agent/`):
   - In `ManagementAgentHistoryTree.vue`: Add `searchQuery?: string` prop and forward to `FileTree`.
   - In `ManagementAgent.vue`: Pass `:search-query="debouncedSearch"` to `ManagementAgentHistoryTree`.
7. **Redis Browser** (`components/modules/management/redis-browser/components/RedisKeyTree.vue`):
   - Bind `:search-query="props.searchQuery"` to `FileTree` (aligning with `FileTree`'s new native support).

## Verification & Testing

- Unit test in `test/unit/` or test suite verifying:
  - `FileTree.vue` auto-expands when `searchQuery` is provided.
  - `FileTree.vue` restores previous expansion when `searchQuery` is cleared.
  - Persistence strategy is not invoked while search is active.
- `bun run typecheck` passes without any errors.
