# Quickstart: Connection Environment Tags

**Feature**: 013-connection-env-tags  
**Target developer**: Implementor picking up this feature

---

## What this feature adds

1. **Environment tag library** — A globally managed collection of named, colored tags with an optional `strictMode` flag. Ships with 5 defaults: `prod` (strict), `uat`, `test`, `dev`, `local`.
2. **Tag assignment on connections** — Users can assign up to 3 tags to any connection via the connection create/edit form.
3. **Strict mode guard** — When connecting to a connection that has a strict-mode tag, a dialog blocks the connection until the user types `"this is production"` exactly.
4. **Tag management settings panel** — A new panel in the Settings modal lets users list tags, open a create-tag modal, and delete tags.

---

## Files to create (new)

### New module: `components/modules/environment-tag/`

```
components/modules/environment-tag/
├── components/
│   ├── EnvTagBadge.vue                 ← pill badge (name + color); used in lists and cards
│   ├── CreateEnvTagDialog.vue          ← reusable create-tag modal for settings and picker
│   ├── EnvTagColorDot.vue              ← tiny color dot; used in selectors
│   ├── EnvTagPicker.vue                ← multi-select tag picker for connection form
│   └── StrictModeConfirmDialog.vue     ← modal requiring typed phrase confirmation
├── containers/
│   └── TagManagementContainer.vue      ← settings panel: list tags, open create modal, delete tags
├── hooks/
│   ├── useEnvironmentTagStore.ts       ← Pinia composable: load, create, delete, seed defaults
│   └── useStrictModeGuard.ts           ← checks strict tags; returns Promise<boolean>
├── services/
│   └── environmentTag.service.ts       ← wraps window.environmentTagApi
├── types/
│   ├── environmentTag.types.ts         ← EnvironmentTag interface
│   └── environmentTag.enums.ts         ← TagColor enum
├── constants/
│   ├── DEFAULT_ENV_TAGS.ts             ← the 5 seeded default tag objects
│   └── TAG_COLOR_OPTIONS.ts            ← palette config (label, value, CSS classes)
├── schemas/
│   └── envTag.schema.ts                ← Zod schema for create-tag form
└── index.ts                            ← public API exports
```

### New persist adapters

```
core/persist/adapters/
├── idb/
│   └── environmentTag.ts               ← localforage adapter for environment-tags
└── electron/
    └── environmentTag.ts               ← Electron IPC adapter for environment-tags
```

### New migration

```
core/persist/adapters/migration/versions/connections/
└── v002-add-tag-ids.ts                 ← adds tagIds: [] to all Connection documents
```

---

## Files to modify (existing)

| File                                                                                   | Change                                                                       |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `core/stores/managementConnectionStore.ts`                                             | Add `tagIds?: string[]` to `Connection` interface                            |
| `core/persist/adapters/migration/versions/connections/types.ts`                        | Add `ConnectionV2` interface                                                 |
| `core/persist/adapters/migration/versions/index.ts`                                    | Import + register `connectionV2` in `ALL_MIGRATIONS`                         |
| `core/persist/adapters/idb/primitives.ts`                                              | Add `'environment-tags'` to `PersistCollection` union + `IDB_STORES` record  |
| `core/persist/adapters/electron/primitives.ts`                                         | Add `'environment-tags'` to `PersistCollection` union                        |
| `core/persist/types.ts`                                                                | Add `EnvironmentTagPersistApi` interface                                     |
| `core/persist/factory.ts`                                                              | Add `environmentTagApi` to both `createIDBApis()` and `createElectronApis()` |
| `core/persist/index.ts`                                                                | Wire `window.environmentTagApi = apis.environmentTagApi`                     |
| `components/modules/connection/components/CreateConnectionModal.vue`                   | Add `<EnvTagPicker>` to step 2 of the connection form                        |
| `components/modules/connection/hooks/useConnectionForm.ts`                             | Add `tagIds` to form state and Zod schema                                    |
| `components/modules/connection/components/ConnectionsList.vue`                         | Add tag badge column; intercept `onConnectConnection` with strict mode guard |
| `components/modules/workspace/components/WorkspaceCard.vue` (or `useWorkspaceCard.ts`) | Intercept connect action with strict mode guard (home page path)             |
| `components/modules/settings/types/settings.types.ts`                                  | Add `EnvironmentTagsConfig` to `SettingsComponentKey` enum                   |
| `components/modules/settings/constants/settings.constants.ts`                          | Add "Environment Tags" entry to `SETTINGS_NAV_ITEMS`                         |
| `components/modules/settings/containers/SettingsContainer.vue`                         | Register `TagManagementContainer` in the `SETTINGS_COMPONENTS` record        |

---

## Implementation order (by story priority)

### P1 — Tag assignment on connection form

1. Add `EnvironmentTag` type + `TagColor` enum
2. Create `environmentTag.service.ts` + persist adapters (IDB + Electron) + wire factory
3. Create `useEnvironmentTagStore.ts` (load + seed defaults)
4. Create `DEFAULT_ENV_TAGS.ts` constants
5. Add `tagIds` migration (`v002-add-tag-ids.ts`) + register it
6. Create `EnvTagBadge.vue` + `EnvTagColorDot.vue` + `EnvTagPicker.vue`
7. Update `CreateConnectionModal.vue` + `useConnectionForm.ts`
8. Update `ConnectionsList.vue` — add tag badge display column

### P2 — Strict mode guard

1. Create `useStrictModeGuard.ts`
2. Create `StrictModeConfirmDialog.vue`
3. Intercept `onConnectConnection` in `ConnectionsList.vue`
4. Intercept connect action in `WorkspaceCard.vue` / `useWorkspaceCard.ts`

### P3 — Tag management settings panel

1. Add `EnvironmentTagsConfig` to `SettingsComponentKey`
2. Create `envTag.schema.ts` (Zod: name, color, strictMode)
3. Create `TagManagementContainer.vue` and reuse `CreateEnvTagDialog.vue`
4. Add nav item + register in `SettingsContainer.vue`

---

## Key Patterns to Follow

### Composable (hook) pattern

```ts
// useEnvironmentTagStore.ts — mirrors managementConnectionStore.ts
export const useEnvironmentTagStore = defineStore('environmentTag', () => {
  const tags = ref<EnvironmentTag[]>([]);
  const isLoading = ref(false);

  const loadTags = async () => { /* getAll → if empty seed defaults */ };
  const createTag = async (tag: Omit<EnvironmentTag, 'id' | 'createdAt'>) => { ... };
  const deleteTag = async (id: string) => { ... };

  return { tags, isLoading, loadTags, createTag, deleteTag };
});
```

### Service pattern

```ts
// environmentTag.service.ts — mirrors core/persist/adapters/idb/connection.ts pattern
export const environmentTagService = {
  getAll: (): Promise<EnvironmentTag[]> => window.environmentTagApi.getAll(),
  create: (tag: EnvironmentTag): Promise<EnvironmentTag> =>
    window.environmentTagApi.create(tag),
  delete: (id: string): Promise<void> => window.environmentTagApi.delete(id),
};
```

### Strict mode guard pattern

```ts
// useStrictModeGuard.ts — returns Promise<boolean>
export function useStrictModeGuard() {
  const checkAndConfirm = async (connection: Connection): Promise<boolean> => {
    const strictTags = getStrictTagsForConnection(connection);
    if (strictTags.length === 0) return true;
    // show StrictModeConfirmDialog, await user response
    return showDialog(strictTags);
  };
  return { checkAndConfirm };
}
```

### Settings registration pattern

```ts
// SettingsContainer.vue — existing SETTINGS_COMPONENTS record
const SETTINGS_COMPONENTS: Record<SettingsComponentKey, Component> = {
  // ...existing
  [SettingsComponentKey.EnvironmentTagsConfig]: TagManagementContainer,
};
```
