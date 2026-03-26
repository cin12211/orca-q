# Solution: Refactoring App Initialization & Connection Logic

## Proposed Changes

### 1. Centralize Data Hydration

Move all initial IndexedDB loading to a single "App Init" process that runs before the page is rendered.

- **Action:** Create a Nuxt plugin or use the root `app.vue` to orchestrate this before any route logic.

### 2. Make Connection Logic Reactive

Instead of manually calling `connectToConnection` in `onMounted`, the app should **react** to route parameter changes.

- **Action:** Add a `watch` in `app.vue` (or a global layout) that monitors `[workspaceId, connectionId]` and triggers the connection process whenever they change.

### 3. Ensure State Creation on Connect

Update the connection logic to automatically create a `WorkspaceState` if it doesn't already exist for the current route params.

- **Action:** Add `onCreateNewWSState` call in `connectToConnection` if `wsState` is missing.

### 4. Move Business Logic to Store Actions

Refactor `useAppContext.connectToConnection` logic into `useSchemaStore` or a dedicated orchestration store. This makes it easier to test and more modular.

### 5. Standardize Initialization Sequence

1. **Hydrate Stores:** Load workspaces, connections, and workspace states from IDB.
2. **Validate Route:** Ensure the current URL params correspond to existing data (Middleware).
3. **Synchronize State:** Ensure `WorkspaceState` exists for the current context.
4. **Connect:** Fetch schemas for the active connection.

---

## Implementation Plan

### Phase A: Root Layout Refactoring

- Add a watcher in `app.vue` for route params.
- Move `connectToConnection` invocation to this watcher.

### Phase B: connectToConnection Logic Update

- Modify `useAppContext.ts` to check and create `WorkspaceState` if missing.
- Improve error handling to show a toast message on connection failure.

### Phase C: Store Cleanup

- Remove auto-loading `loadPersistData()` from `defineStore` setup.
- Explicitly call it during the app initialization phase.

---

## Benefits

- **Stability:** Eliminates race conditions by ensuring data is loaded before use.
- **Reactivity:** Properly handles switching between different connections in a SPA.
- **Maintainability:** Clearer separation of concerns between state storage and business logic orchestration.
