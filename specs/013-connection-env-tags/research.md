# Research: Connection Environment Tags

**Feature**: 013-connection-env-tags  
**Phase**: 0 — Outline & Research  
**Date**: 2026-04-11

---

## Summary of Unknowns Resolved

All NEEDS CLARIFICATION items from Technical Context are resolved below.

---

## Decision 1 — EnvironmentTag Storage Strategy

**Decision**: Store `EnvironmentTag` objects in a new, dedicated persistence collection (`environment-tags`), following the exact same pattern as `connections`, `workspaces`, and all other entities in the app. The collection is wired through the platform-agnostic `PersistApi` factory.

**Rationale**: The app has a well-established, dual-platform persistence architecture:

- **Web**: localforage (IndexedDB) via `adapters/idb/`
- **Electron**: IPC bridge via `adapters/electron/` → native store

All entities follow the same pattern: an adapter pair (IDB + Electron) implements the same `*PersistApi` contract from `core/persist/types.ts`, and the factory selects the right adapter at runtime. This is the only architecture that is consistent with how every other entity is persisted. A Pinia `persistedstate` plugin is explicitly not used (`persist: false` on all stores).

**Alternatives Considered**:

- Storing tags in `appConfig` (the app-wide settings blob) — rejected because tags are a collection of independent entities that need individual CRUD operations; the appConfig blob is a flat key-value config.
- Storing tag IDs in the `Connection` object itself with embedded tag data — rejected because tags are shared across connections; embedding data causes duplication and sync problems on rename/delete.

**Implementation**: Add `'environment-tags'` to the `PersistCollection` union in both `core/persist/adapters/idb/primitives.ts` and `core/persist/adapters/electron/primitives.ts`. Create `environmentTagIDBAdapter` and `environmentTagElectronAdapter`. Add `EnvironmentTagPersistApi` to `core/persist/types.ts`. Wire `window.environmentTagApi` in `core/persist/index.ts` and `factory.ts`.

---

## Decision 2 — Default Tag Seeding Strategy

**Decision**: Seed the 5 default tags (prod, uat, test, dev, local) via the **store's initialization logic** (`loadPersistData` in `useEnvironmentTagStore.ts`), not via the migration runner.

**Rationale**: The migration runner's `VersionedMigration.up()` is a **document-level transformation** — it receives an existing document and returns a modified version. It is not designed for collection-level seeding (inserting documents when the collection is empty). The appConfig pattern already demonstrates the Nuxt-compatible approach: on store load, check if the collection is empty, and if so, call `create()` for each default. This is idiomatic and avoids misuse of the migration system.

**Alternatives Considered**:

- A v001 migration that creates default documents — rejected because the migration runner is a transform pipeline, not a seed mechanism. Creating documents inside `up()` would require the runner to have create capabilities, breaking its pure-transform contract.
- A Nuxt plugin that seeds defaults — considered, but `useEnvironmentTagStore.ts` is the natural owner of this logic (same as how `managementConnectionStore.loadPersistData` bootstraps connection data). Keeps seeding co-located with the store.

**Implementation**: In `useEnvironmentTagStore.ts`, the `loadTags()` function calls `environmentTag.service.ts`.`getAll()`. If the result is empty, it calls `create()` for each of the 5 defaults defined in `DEFAULT_ENV_TAGS.ts`.

---

## Decision 3 — Connection Schema Migration (tagIds field)

**Decision**: Add `tagIds?: string[]` to the `Connection` interface and create a standard migration `versions/connections/v002-add-tag-ids.ts` that populates `tagIds: []` on all existing connection documents.

**Rationale**: The migration system is perfectly suited for this: it is a document-level transform (add a new optional field with a default value), exactly what `VersionedMigration.up()` is designed for. The migration runner auto-applies unapplied versions on startup via `plugins/01.migration.client.ts`. Existing connections will silently gain `tagIds: []` on the next app launch.

**Alternatives Considered**:

- Making `tagIds` optional and handling `undefined` everywhere in code — rejected; optional handling creates noise across all read paths. The migration ensures every document in storage is v2+.

**Implementation**:

1. Add `tagIds?: string[]` to both `Connection` (current store interface) and `ConnectionV1` (migration types historical record — add `ConnectionV2`).
2. Create `versions/connections/v002-add-tag-ids.ts`.
3. Register in `versions/index.ts` `ALL_MIGRATIONS` array.

---

## Decision 4 — Strict Mode Intercept Point

**Decision**: Intercept in **two places**:

1. `components/modules/connection/components/ConnectionsList.vue` → `onConnectConnection()` handler (management panel flow)
2. `components/modules/workspace/components/WorkspaceCard.vue` or its accompanying composable `useWorkspaceCard.ts` (home page connection flow)

Both paths eventually call `openWorkspaceWithConnection()` from `useAppContext.ts`. The interception must happen **before** that call in each path, as the app's router navigation triggers the actual TCP connection.

**Rationale**: Wrapping `openWorkspaceWithConnection` in `useAppContext.ts` itself was considered, but that function has no access to any Vue dialog/component layer (it's a pure composable). Intercepting at the call site in the UI layer is simpler, more readable, and keeps dialog concerns in the presentation layer.

**Alternatives Considered**:

- Modifying `useAppContext.ts` to check strict mode — rejected; `useAppContext.ts` has no mechanism to show a dialog or await user input.
- A global route middleware that intercepts navigation — considered but overly complex; the connection objects are not always available from the route alone without an extra store read.

**Implementation**: In each intercept point, before calling `openWorkspaceWithConnection`, call `useStrictModeGuard().checkAndConfirm(connection)` which returns a `Promise<boolean>`. If it resolves `false`, abort; if `true`, proceed with connection.

---

## Decision 5 — Tag Color Strategy

**Decision**: Use a **predefined color palette** of named Tailwind/design-system colors (e.g., red, orange, amber, yellow, lime, green, teal, cyan, blue, indigo, violet, purple, pink, rose). Each color is stored as a semantic key (string like `'red'` | `'green'` | `'blue'` etc.) that maps to a CSS class or design token.

**Rationale**: Free-form hex color pickers introduce design inconsistency across the UI. Shadcn-vue and Tailwind are already the design system — standardizing on named palette entries (which map to known Tailwind color classes) ensures tag badges render consistently in both light and dark mode. The color key is stored as a string enum value; the component maps it to a CSS class.

**Alternatives Considered**:

- Hex string storage (`#FF5733`) — rejected; requires a full color picker component and dark-mode variants become unpredictable.
- HSL variables — rejected; adds complexity for a cosmetic feature.

**Implementation**: Define `TagColor` enum with ~12 named color options. `EnvTagBadge.vue` maps `color` to a Tailwind text + background class pair (e.g., `'green'` → `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`).

---

## Decision 6 — Tag Management UI Location

**Decision**: Add an **"Environment Tags" settings panel** in the existing settings modal, following the established `SettingsComponentKey` + `SETTINGS_NAV_ITEMS` + `SettingsContainer` pattern.

**Rationale**: The settings modal is the established place for global configuration in this app (Appearance, Editor, Quick Query, Agent, Desktop, Backup & Restore). Environment tags are global config — they apply across all connections regardless of workspace. The existing pattern is: add a value to `SettingsComponentKey` enum, add a `SettingsNavItem` to `SETTINGS_NAV_ITEMS`, create a new `*Config.vue` component, and register it in `SettingsContainer.vue`. Within that panel, creation should use a small modal dialog so the tag list stays compact and focused.

**Alternatives Considered**:

- A dedicated route `/settings/tags` — rejected; the app uses a modal-based settings UI, not a settings page route.
- Tag management inline inside the settings panel itself (large always-visible create form) — rejected; it makes the panel noisier and less focused than a compact create action + modal dialog.
- Tag management inline in the connection form (create/delete tags without leaving the form) — considered for P3 UX improvement; a compact create dialog shortcut is acceptable there, but full library management still belongs in Settings.

**Implementation**: Add `EnvironmentTagsConfig = 'EnvironmentTagsConfig'` to `SettingsComponentKey`. Create `TagManagementContainer.vue` in `components/modules/environment-tag/containers/`. Add a `Create New Tag` action there that opens `CreateEnvTagDialog.vue`. Register the panel in the settings module. Add nav entry with icon `hugeicons:tag-01` (or similar).

---

## Decision 7 — Max 3 Tags Enforcement

**Decision**: Enforce the 3-tag limit at the **component level** (in `EnvTagPicker.vue`) and at the **hook/schema level** (Zod validation on form submit), but not at the service/persist level.

**Rationale**: The 3-tag limit is a UX constraint, not a data integrity rule. Enforcing it at the picker (`disabled` state when 3 already selected) gives immediate feedback. Secondary enforcement in the form schema (Zod `array().max(3)`) prevents invalid saves. The service layer does not need to duplicate this: it trusts validated data from the hook layer (per the module architecture dependency rules where hooks handle business logic).

**Implementation**: `EnvTagPicker.vue` disables unselected options when `selectedTagIds.length >= 3`. `useConnectionForm.ts` Zod schema includes `tagIds: z.array(z.string()).max(3).optional()`.

---

## Technology Confirmation

| Concern               | Resolution                                                      |
| --------------------- | --------------------------------------------------------------- |
| Language/Version      | TypeScript 5.x (confirmed from tsconfig.json)                   |
| Framework             | Nuxt 3 SPA (`ssr: false`) + Vue 3 Composition API               |
| State management      | Pinia (no plugin-persistedstate; all state via `window.*Api`)   |
| Persistence (web)     | localforage → IndexedDB (same as all other entities)            |
| Persistence (desktop) | Electron IPC bridge → native store (same as all other entities) |
| Forms                 | VeeValidate v4 + Zod (same as connection form)                  |
| UI components         | shadcn-vue + Tailwind CSS 4                                     |
| Migration runner      | `core/persist/adapters/migration/` — auto-runs on startup       |
| Testing               | Vitest (unit) + Playwright (e2e)                                |
