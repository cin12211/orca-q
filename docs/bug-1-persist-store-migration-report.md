# Bug 1 Report: Move `agentStore` and `appConfigStore` to `core/persist`

## Scope

- Migrate `appConfigStore` away from old Pinia/localStorage persistence.
- Migrate `agentStore` away from old `useStorage` key-based persistence.
- Add one-time migration to copy legacy store data into the new persist layer.

## Root Cause

Both stores were still using the old persistence path:

- `appConfigStore` used Pinia `persist` with `getPlatformStorage()`.
- `agentStore` used multiple `useStorage()` keys directly.

That meant these two stores were outside the structured `core/persist` layer and had no proper collection-level migration path.

## Fix Summary

- Added dedicated persist contracts for `appConfig` and `agentState`.
- Added IDB and Tauri adapters for both stores.
- Added new persist collections in both web and desktop native storage.
- Rewired both stores to:
  - hydrate from `window.appConfigApi` / `window.agentApi`
  - debounce-save back into persist collections
  - stop using the old local key-based persistence flow
- Added legacy store migration so old persisted data is copied once into the new persist store before app hydration.

## Files Changed

### Persist contracts and shared state

- `core/persist/store-state.ts`
  - Added persisted state types, defaults, normalization helpers, and legacy key constants for `appConfig` and `agentState`.
- `core/persist/types.ts`
  - Added `AppConfigPersistApi` and `AgentPersistApi`.
- `core/persist/globals.d.ts`
  - Added `window.appConfigApi` and `window.agentApi`.
- `core/persist/index.ts`
  - Exposed the new APIs on `window`.
- `core/persist/factory.ts`
  - Wired platform-specific adapters into the persist factory.

### Web adapters

- `core/persist/adapters/idb/app-config.ts`
  - Added IDB adapter for `appConfig`.
- `core/persist/adapters/idb/agent.ts`
  - Added IDB adapter for `agentState`.
- `core/persist/adapters/idb/index.ts`
  - Exported the new adapters.
- `core/persist/adapters/idb/primitives.ts`
  - Registered new IDB collections.

### Desktop adapters

- `core/persist/adapters/tauri/app-config.ts`
  - Added Tauri adapter for `appConfig`.
- `core/persist/adapters/tauri/agent.ts`
  - Added Tauri adapter for `agentState`.
- `core/persist/adapters/tauri/index.ts`
  - Exported the new adapters.
- `core/persist/adapters/tauri/primitives.ts`
  - Registered new persist collections for Tauri commands.
- `src-tauri/src/persist.rs`
  - Added native collection support for `appConfig` and `agentState`.

### Store rewiring

- `core/stores/appConfigStore.ts`
  - Removed old Pinia `persist` usage.
  - Added persist hydration + debounced save via `window.appConfigApi`.
- `core/stores/agentStore.ts`
  - Removed old `useStorage()` persistence.
  - Added persist hydration + debounced save via `window.agentApi`.
- `core/stores/index.ts`
  - Exported `useAppConfigStore`.
- `plugins/02.app-initialization.client.ts`
  - Hydrates both stores during startup.

### Legacy data migration

- `core/persist/adapters/migration/legacyStoreMigration.ts`
  - Added one-time migration from old store persistence into new persist collections.
- `plugins/01.migration.client.ts`
  - Runs legacy store migration before schema migrations.

### Related integration updates

- `core/persist/adapters/migration/platformMigrationService.ts`
  - Extended platform migration snapshot logic to cover new collections.
- `components/modules/settings/hooks/useDataExport.ts`
  - Export now includes the new persist collections.
- `components/modules/settings/hooks/useDataImport.ts`
  - Import now restores the new persist collections and rehydrates affected stores.

## Validation

- `cargo check` passed in `src-tauri`.
- Scoped TypeScript check for changed files passed except for repo-level Nuxt auto-import limitations in the temporary `tsc` setup.
- Full `nuxt typecheck` is currently blocked by existing project tooling issues unrelated to this patch:
  - `ENOTDIR: ... components/ui/Typography.vue/index`
  - full-project `tsc` stack overflow in repo baseline
