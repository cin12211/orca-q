# Code Review: App Initialization & Dependency Stability

## Identified Issues

### 1. Incomplete Initialization on Direct Entry (Bookmark/Refresh)

When a user enters the app via a specific URL (e.g., `/[workspaceId]/[connectionId]`), `app.vue`'s `onMounted` calls `connectToConnection`. However, if the `WorkspaceState` for that specific workspace/connection pair doesn't exist yet in the store, `connectToConnection` does **not** create it.

- **Impact:** `wsStateStore.wsState` remains `undefined`, which breaks computed properties in other stores like `useSchemaStore.activeSchema` (e.g., `wsState.value?.id` is undefined).

### 2. Reactivity Limitation in `app.vue`

The connection logic in `app.vue` is inside `onMounted`.

- **Impact:** Since `app.vue` is the root component, it only mounts once. Navigating between different connections (switching URLs) within the SPA will **not** trigger `connectToConnection` again, leaving the app with stale schema data from the previous connection.

### 3. Redundant & Uncoordinated Data Loading

Multiple stores (`useWorkspacesStore`, `useManagementConnectionStore`, `useWSStateStore`) call `loadPersistData()` independently in their `defineStore` setup. Additionally, the newly added middleware and `useAppContext.connectToConnection` also trigger these loads.

- **Impact:** Redundant I/O operations to IndexedDB and potential race conditions where logic runs before data is fully hydrated.

### 4. Silent Failures in `connectToConnection`

The `try...catch` block in `connectToConnection` logs the error but doesn't notify the UI or the user.

- **Impact:** The `appLoading` indicator finishes, but the app might be in a broken or empty state without any visual feedback on what went wrong.

### 5. Dependency Circularity & Coupling

`useAppContext` is tightly coupled with almost all stores. While it acts as an orchestrator, it's becoming a "God Object" where critical logic (like schema fetching and default schema selection) is hidden away from the stores that actually own that data.

### 6. Side Effects in Store Setup

Calling async `loadPersistData()` directly in the store setup is generally discouraged in Nuxt (especially if SSR were enabled, but even in SPA it's hard to track completion).

- **Impact:** Components might access store state before the initial hydration is complete.

---

## Technical Debt Summary

- **Stability:** Medium-Low (Race conditions on cold start).
- **Scalability:** Medium (Hard to add more complex initialization logic).
- **Maintainability:** Medium (Logic spread across middleware, context, and app.vue).
