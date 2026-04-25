# Tasks: Connection Environment Tags

**Input**: Design documents from `/specs/013-connection-env-tags/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the persistence layer and type foundations that every story depends on. Nothing else can start until this phase is done.

- [x] T001 Add `'environment-tags'` to `PersistCollection` union in `core/persist/adapters/idb/primitives.ts` and add the corresponding `localforage.createInstance` entry to `IDB_STORES` record
- [x] T002 Add `'environment-tags'` to `PersistCollection` union in `core/persist/adapters/electron/primitives.ts`
- [x] T003 [P] Create `EnvironmentTag` interface and `TagColor` enum in `components/modules/environment-tag/types/environmentTag.types.ts` and `components/modules/environment-tag/types/environmentTag.enums.ts`
- [x] T004 [P] Create `DEFAULT_ENV_TAGS` constant (5 default tag objects: prod/red/strict, uat/orange, test/yellow, dev/blue, local/green) in `components/modules/environment-tag/constants/DEFAULT_ENV_TAGS.ts`
- [x] T005 [P] Create `TAG_COLOR_OPTIONS` constant mapping each `TagColor` to label + Tailwind CSS class pair (light + dark) in `components/modules/environment-tag/constants/TAG_COLOR_OPTIONS.ts`
- [x] T006 Add `EnvironmentTagPersistApi` interface to `core/persist/types.ts` with methods: `getAll`, `getOne`, `create`, `update`, `delete`
- [x] T007 Create `core/persist/adapters/idb/environmentTag.ts` — localforage adapter implementing `EnvironmentTagPersistApi` (mirror `connection.ts` pattern, store name `environmentTagStoreIDB`)
- [x] T008 Create `core/persist/adapters/electron/environmentTag.ts` — Electron IPC adapter implementing `EnvironmentTagPersistApi` (mirror `connection.ts` electron adapter pattern)
- [x] T009 Wire `environmentTagApi` into `core/persist/factory.ts` — add `environmentTagIDBAdapter` to `createIDBApis()` and `environmentTagElectronAdapter` to `createElectronApis()`; add `environmentTagApi` to `PersistApis` type in `core/persist/types.ts`
- [x] T010 Wire `window.environmentTagApi = apis.environmentTagApi` in `core/persist/index.ts`; export `EnvironmentTagPersistApi` type

**Checkpoint**: `window.environmentTagApi` is available in both web and Electron runtimes. The `EnvironmentTag` type and `TagColor` enum exist. All subsequent phases can now begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Connection schema migration and the store/service layer that all user stories share.

**⚠️ CRITICAL**: US1 implementation cannot begin until T011–T014 are complete.

- [x] T011 Add `tagIds?: string[]` to `Connection` interface in `core/stores/managementConnectionStore.ts`
- [x] T012 Add `ConnectionV2` interface to `core/persist/adapters/migration/versions/connections/types.ts` extending `ConnectionV1` with `tagIds: string[]`
- [x] T013 Create migration `core/persist/adapters/migration/versions/connections/v002-add-tag-ids.ts` — `up()` spreads doc and adds `tagIds: []`; collection `'connections'`; version `2`
- [x] T014 Import `connectionV2` from `v002-add-tag-ids.ts` and add it to `ALL_MIGRATIONS` array in `core/persist/adapters/migration/versions/index.ts`
- [x] T015 Create `components/modules/environment-tag/services/environmentTag.service.ts` — thin wrapper over `window.environmentTagApi` (`getAll`, `getOne`, `create`, `update`, `delete`)
- [x] T016 Create `components/modules/environment-tag/hooks/useEnvironmentTagStore.ts` — Pinia store (`defineStore`) with `tags: ref<EnvironmentTag[]>([])`, `isLoading: ref(false)`, `loadTags()` (getAll → if empty seed from `DEFAULT_ENV_TAGS`), `createTag()`, `deleteTag()` (cascade: also remove `tagId` from all connections in `managementConnectionStore`)
- [x] T017 Create `components/modules/environment-tag/index.ts` — export public API (types, enums, store, components as they are created)

**Checkpoint**: Migration runs on next app start. Store loads tags and seeds defaults on first use. Service delegates to persist API. All user stories can now proceed.

---

## Phase 3: User Story 1 — Assign Environment Tags to a Connection (Priority: P1) 🎯 MVP

**Goal**: Users can assign up to 3 environment tags when creating or editing a connection; assigned tags display as colored badges in the connection list.

**Independent Test**: Create a new connection, open the tag picker in step 2 of the form, select up to 3 tags (verify 4th is disabled), save the connection, and confirm the tag badges appear in the connection list row.

- [x] T018 [P] [US1] Create `EnvTagColorDot.vue` in `components/modules/environment-tag/components/` — renders a small colored circle using the `color` prop mapped through `TAG_COLOR_OPTIONS` to a Tailwind class
- [x] T019 [P] [US1] Create `EnvTagBadge.vue` in `components/modules/environment-tag/components/` — pill badge showing `EnvTagColorDot` + tag `name`; accepts `EnvironmentTag` as prop; used in lists and cards
- [x] T020 [US1] Create `EnvTagPicker.vue` in `components/modules/environment-tag/components/` — multi-select dropdown/popover listing all tags from `useEnvironmentTagStore`; emits `update:modelValue` with `string[]`; disables unchecked items when `modelValue.length >= 3`; shows "Max 3 tags" notice when at limit
- [x] T021 [US1] Add `tagIds` field to form state in `components/modules/connection/hooks/useConnectionForm.ts` — initialize to `[]`; add `tagIds: z.array(z.string()).max(3).optional()` to the Zod connection schema
- [x] T022 [US1] Add `<EnvTagPicker v-model="form.tagIds" />` to step 2 of `components/modules/connection/components/CreateConnectionModal.vue`, positioned after the connection name field; `tagIds` must be submitted with the form payload to `createNewConnection` / `updateConnection`
- [x] T023 [US1] Update `components/modules/connection/components/ConnectionsList.vue` — add a "Tags" column to the table; render `<EnvTagBadge>` for each tag in `connection.tagIds` (resolve tag objects from `useEnvironmentTagStore`)
- [x] T024 [US1] Export `EnvTagBadge`, `EnvTagPicker`, `EnvTagColorDot` through `components/modules/environment-tag/index.ts`

**Checkpoint**: US1 fully functional. A connection can be created with tags, saved, and tags display in the list. Max-3 limit is enforced in the picker and via Zod. Migration has populated `tagIds: []` on all existing connections.

---

## Phase 4: User Story 2 — Strict Mode Confirmation on Connect (Priority: P2)

**Goal**: When connecting to a connection bearing at least one strict-mode tag, a modal dialog blocks the connection until the user types `"this is production"` exactly (case-sensitive). Cancelling aborts the connection. Non-strict connections are unaffected.

**Independent Test**: Assign the default "prod" tag to a connection, click Connect, confirm the dialog appears naming the strict-mode tag(s), type the wrong phrase and verify the confirm button stays disabled, type `"this is production"` exactly and confirm the connection proceeds. Create a connection with only "dev" tag and confirm no dialog appears.

- [x] T025 [US2] Create `StrictModeConfirmDialog.vue` in `components/modules/environment-tag/components/` — a modal dialog that:
  - Receives `strictTags: EnvironmentTag[]` as prop (the triggering strict-mode tags)
  - Displays the names of the strict-mode tag(s) that triggered the check
  - Contains a text input for the confirmation phrase
  - Shows the required phrase `"this is production"` in instructional text
  - Enable the confirm button only when `inputValue === 'this is production'` (exact, case-sensitive)
  - Emits `confirm` or `cancel`; dismissing/clicking Cancel emits `cancel`
- [x] T026 [US2] Create `useStrictModeGuard.ts` in `components/modules/environment-tag/hooks/` — composable that:
  - Exposes `checkAndConfirm(connection: Connection): Promise<boolean>`
  - Resolves tag objects for `connection.tagIds` from `useEnvironmentTagStore`
  - If no strict-mode tags found: resolves `true` immediately
  - If strict-mode tags exist: programmatically shows `StrictModeConfirmDialog` (via Vue's `createApp` / `useModal` pattern or a shared dialog store), awaits user response, returns `true` on confirm, `false` on cancel
- [x] T027 [US2] Intercept `onConnectConnection` in `components/modules/connection/components/ConnectionsList.vue` — before calling `openWorkspaceWithConnection`, call `await useStrictModeGuard().checkAndConfirm(connection)`; only proceed if result is `true`
- [x] T028 [US2] Intercept the connect action in `components/modules/workspace/components/WorkspaceCard.vue` (or its composable) — same guard pattern: `await checkAndConfirm(connection)` before `openWorkspaceWithConnection`
- [x] T029 [US2] Export `useStrictModeGuard` through `components/modules/environment-tag/index.ts`

**Checkpoint**: US2 fully functional. Strict-mode connections require confirmation. Non-strict connections work without interruption. Both connection entry points (management panel + home page card) are protected.

---

## Phase 5: User Story 3 — Manage Custom Environment Tags (Priority: P3)

**Goal**: A "Environment Tags" panel in the Settings modal lets users view all tags, open a create-tag modal, and delete existing tags. Default tags are visible and deletable.

**Independent Test**: Open Settings → "Environment Tags", confirm 5 default tags are listed with prod showing strictMode on. Click Create New Tag, create a new tag with a unique name, color, and strictMode value → confirm it appears. Try creating a duplicate name → confirm an error is shown. Delete an unused custom tag → confirm it is removed immediately. Delete a used tag → confirm a warning dialog appears and explains that the tag will also be removed from affected connections.

- [x] T030 [P] [US3] Create `envTag.schema.ts` in `components/modules/environment-tag/schemas/` — Zod schema for the create-tag form: `name` (string, min 1, max 30), `color` (nativeEnum TagColor), `strictMode` (boolean, default false)
- [x] T031 [US3] Add `EnvironmentTagsConfig = 'EnvironmentTagsConfig'` to `SettingsComponentKey` enum in `components/modules/settings/types/settings.types.ts`
- [x] T032 [US3] Create `TagManagementContainer.vue` in `components/modules/environment-tag/containers/` — settings panel that:
  - Lists all tags from `useEnvironmentTagStore` with `EnvTagBadge` + strictMode indicator + delete button
  - Shows a `Create New Tag` button that opens `CreateEnvTagDialog.vue`
  - Reuses `CreateEnvTagDialog.vue` for name/color/strictMode validation and creation flow
  - Deletes unused tags immediately
  - Shows a confirmation dialog before deleting a tag that is assigned to existing connections; on confirm, calls `deleteTag()` and cascades removal from affected connections
- [x] T033 [US3] Add "Environment Tags" entry to `SETTINGS_NAV_ITEMS` in `components/modules/settings/constants/settings.constants.ts` — `{ name: 'Environment Tags', icon: 'hugeicons:tag-01', componentKey: SettingsComponentKey.EnvironmentTagsConfig }`
- [x] T034 [US3] Register `TagManagementContainer` in the `SETTINGS_COMPONENTS` record inside `components/modules/settings/containers/SettingsContainer.vue`
- [x] T035 [US3] Export `TagManagementContainer` through `components/modules/environment-tag/index.ts`

**Checkpoint**: US3 fully functional. Settings panel shows all tags. Users can create custom tags through the modal (with duplicate-name validation), delete unused tags directly, and confirm deletion for used tags. Deleted tags are unassigned from all connections via the store's `deleteTag` cascade logic.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T036 [P] Verify `useEnvironmentTagStore.loadTags()` is called early in the app lifecycle — check `plugins/02.app-initialization.client.ts` or `app.vue` and add a `loadTags()` call if tags are not pre-loaded before the connection form is first opened
- [x] T037 [P] Handle orphaned `tagIds` gracefully in `EnvTagBadge` and `ConnectionsList` — if a `tagId` on a connection no longer exists in the store (tag was deleted), filter it out silently at render time rather than showing a broken badge
- [x] T038 [P] Verify cascade delete works both directions: deleting a tag from the library also removes its ID from all connections in `managementConnectionStore`; write the cascade logic in `useEnvironmentTagStore.deleteTag()` using `managementConnectionStore.updateConnection()`
- [x] T039 [P] Add `window.environmentTagApi` type declaration to the global `Window` interface in `electron/types/` or wherever `window.connectionApi` is declared

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion (needs `PersistCollection` type + persist adapter wiring)
- **Phase 3 (US1)**: Depends on Phase 2 completion (needs store + service + `tagIds` on Connection)
- **Phase 4 (US2)**: Depends on Phase 3 (needs `EnvTagBadge` component + working store)
- **Phase 5 (US3)**: Depends on Phase 2 + T030 (Zod schema); can run in parallel with Phase 4
- **Phase 6 (Polish)**: Depends on all story phases

### User story dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Can start after US1 (needs store and tag data); T025–T026 can start in parallel with US1 once Phase 2 is done
- **US3 (P3)**: Can start after Phase 2; T030 + T031 are fully independent and can run in parallel with US1

### Parallel opportunities within each phase

Phase 1 parallel group (T001–T010):

- T001 + T002 (both `PersistCollection` edits) → can run in parallel
- T003 + T004 + T005 (types + constants) → can all run in parallel
- T006 → T007 → T008 → T009 → T010 must run in sequence (each depends on the previous)

Phase 3 parallel group:

- T018 + T019 (display-only components) → fully parallel, no dependencies
- T020 depends on T018 + T019 (uses them internally)
- T021 → T022 → T023 must run in sequence

---

## Parallel Execution — User Story 1

```bash
# Stage A — can all start immediately after Phase 2:
T018  # EnvTagColorDot.vue
T019  # EnvTagBadge.vue
T021  # useConnectionForm.ts tagIds field

# Stage B — after T018 + T019:
T020  # EnvTagPicker.vue (uses ColorDot + Badge internally)

# Stage C — after T020 + T021:
T022  # CreateConnectionModal.vue (uses Picker + needs form field)

# Stage D — after T022:
T023  # ConnectionsList.vue tag column
T024  # index.ts exports
```

---

## Implementation Summary

| Story        | Tasks        | Files created                                  | Files modified     |
| ------------ | ------------ | ---------------------------------------------- | ------------------ |
| Setup        | T001–T010    | 5 new files (adapters, types, constants)       | 4 existing files   |
| Foundational | T011–T017    | 4 new files (migration, service, store, index) | 3 existing files   |
| US1 (P1)     | T018–T024    | 3 new components                               | 3 existing files   |
| US2 (P2)     | T025–T029    | 2 new files (dialog, guard)                    | 2 existing files   |
| US3 (P3)     | T030–T035    | 2 new files (schema, container)                | 3 existing files   |
| Polish       | T036–T039    | 0 new files                                    | 2–3 existing files |
| **Total**    | **39 tasks** | **~16 new files**                              | **~17 modified**   |

---

## Suggested MVP Scope

Deliver only **Phase 1 + Phase 2 + Phase 3 (US1)** for the initial merge:

- Persistence layer wired
- Migration applied
- Tags assignable in connection form
- Tags visible in connection list
- Default tags seeded on first launch

US2 (strict mode) and US3 (settings panel) can follow as a second increment.
