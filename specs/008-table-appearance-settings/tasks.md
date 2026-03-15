# Tasks: Table Appearance Settings

**Feature**: `008-table-appearance-settings` | **Branch**: `008-table-appearance-settings` | **Date**: 2026-03-15  
**Input**: `specs/008-table-appearance-settings/` — plan.md, spec.md, research.md, data-model.md, quickstart.md  
**Total Tasks**: 28 | **User Stories**: 4 | **Parallel Opportunities**: 14

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: `[US1]` Font Size · `[US2]` Row Spacing · `[US3]` Accent Color · `[US4]` Live Preview
- Exact file paths are included in every description

---

## Phase 1: Setup

**Purpose**: No new project structure needed — this feature is purely additive to the existing Nuxt SPA. This phase covers confirming the implementation boundary before any code is written.

- [x] T001 Verify `components/base/dynamic-table/hooks/useTableTheme.ts` exports a single computed theme and confirm `:theme` binding in `DynamicTable.vue` and `QuickQueryTable.vue`
- [x] T002 Verify `core/stores/appLayoutStore.ts` structure: confirm `codeEditorConfigs` / `chatUiConfigs` pattern to replicate for `tableAppearanceConfigs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Store extension and constants changes that ALL user stories depend on. Must be complete before any story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Add `SpacingPreset` type union, `TableAppearanceConfigs` interface, `DEFAULT_TABLE_APPEARANCE_CONFIGS` constant, `tableAppearanceConfigs` reactive, and `resetTableAppearance()` action to `core/stores/appLayoutStore.ts`
- [x] T004 Add `SPACING_PRESET_ROW_HEIGHTS` map and re-export `SpacingPreset` / `DEFAULT_TABLE_APPEARANCE_CONFIGS` in `components/base/dynamic-table/constants/baseTableTheme.ts`
- [x] T005 Extend `useTableTheme` in `components/base/dynamic-table/hooks/useTableTheme.ts` to read `tableAppearanceConfigs` from `appLayoutStore` and compute the merged AG Grid theme via `.withParams({ fontSize, rowHeight, accentColor })`

**Checkpoint**: Store, constants, and `useTableTheme` are wired — DynamicTable and QuickQueryTable now consume settings reactively. All downstream story phases can proceed.

---

## Phase 3: User Story 1 — Adjust Table Font Size (Priority: P1) 🎯 MVP

**Goal**: Users can drag a font size slider in Table Appearance settings; all table instances reflect the change immediately and the value persists across page reloads.

**Independent Test**: Open any table view → open Settings → drag font size slider → confirm table cell and header text resizes in real time → reload page → confirm persisted size is applied.

### Implementation for User Story 1

- [x] T006 [US1] Create `components/modules/settings/components/TableAppearanceConfig.vue` with a font size `Slider` (range 10–20, step 1) bound to `appLayoutStore.tableAppearanceConfigs.fontSize` and a read-only numeric display alongside the slider
- [x] T007 [US1] Add `TABLE_FONT_SIZE_RANGE` constant (`{ min: 10, max: 20, step: 1, default: 13 }`) to `components/modules/settings/constants/settings.constants.ts`
- [x] T008 [US1] Add `'TableAppearanceConfig'` to the `SettingsComponentKey` union in `components/modules/settings/types/settings.types.ts`
- [x] T009 [US1] Add `'Table Appearance'` nav item (icon: `hugeicons:table-02`, `componentKey: 'TableAppearanceConfig'`) to `SETTINGS_NAV_ITEMS` in `components/modules/settings/constants/settings.constants.ts`
- [x] T010 [US1] Register `TableAppearanceConfig` in the `SETTINGS_COMPONENTS` map inside `components/modules/settings/containers/SettingsContainer.vue`
- [x] T011 [US1] Export `TableAppearanceConfig` from `components/modules/settings/components/index.ts`

**Checkpoint**: User Story 1 fully testable — font size slider visible in Settings, tables respond immediately, value survives page reload.

---

## Phase 4: User Story 2 — Adjust Row Height / Cell Spacing (Priority: P2)

**Goal**: Users can select a Compact / Default / Comfortable spacing preset; row height changes immediately across all table instances and persists.

**Independent Test**: Open a table with 20+ rows → open Settings → select "Compact" → verify rows become shorter and more are visible → reload → confirm "Compact" is still applied.

### Implementation for User Story 2

- [x] T012 [P] [US2] Add `SPACING_PRESET_OPTIONS` constant (array of `{ label, value: SpacingPreset }` objects) to `components/modules/settings/constants/settings.constants.ts`
- [x] T013 [US2] Add a row spacing preset toggle group (three buttons: Compact / Default / Comfortable) to `components/modules/settings/components/TableAppearanceConfig.vue` bound to `appLayoutStore.tableAppearanceConfigs.spacingPreset`

**Checkpoint**: User Stories 1 and 2 both independently testable. Font size and row spacing coexist without conflict.

---

## Phase 5: User Story 3 — Accent Color (Priority: P3)

**Goal**: Users can pick a separate accent color for light mode and dark mode; selected row highlights and focus borders use the custom color in all table instances.

**Independent Test**: Open Table Appearance settings → pick a red accent for light mode → click a row in DynamicTable → row highlight is red → switch to dark mode → row highlight returns to the dark-mode accent (unchanged).

### Implementation for User Story 3

- [x] T014 [P] [US3] Add two `<input type="color">` pickers (light mode accent / dark mode accent) to `components/modules/settings/components/TableAppearanceConfig.vue`, bound respectively to `accentColorLight` and `accentColorDark` in `tableAppearanceConfigs`
- [x] T015 [P] [US3] Add a "Reset to Defaults" button in `TableAppearanceConfig.vue` that calls `appLayoutStore.resetTableAppearance()`

**Checkpoint**: All three core settings (font size, spacing, accent) independently functional. Light/dark modes store separate accent values without bleed.

---

## Phase 6: User Story 4 — Live Preview in Settings Panel (Priority: P3)

**Goal**: A styled HTML mini-table inside the settings panel updates in real time as users adjust any appearance setting, giving immediate visual feedback before they navigate to a real table.

**Independent Test**: Open Table Appearance settings → change font size → preview table text updates without touching any real AG Grid table.

### Implementation for User Story 4

- [x] T016 [US4] Create `components/modules/settings/components/TableAppearancePreview.vue` as a pure HTML/CSS table that accepts `fontSize`, `rowHeight`, and `accentColor` as props and applies them via `:style` bindings (no AG Grid instance)
- [x] T017 [US4] Embed `<TableAppearancePreview>` in `TableAppearanceConfig.vue`, passing current `tableAppearanceConfigs` values (computed `rowHeight` derived from `SPACING_PRESET_ROW_HEIGHTS[spacingPreset]`)
- [x] T018 [US4] Export `TableAppearancePreview` from `components/modules/settings/components/index.ts`

**Checkpoint**: All four user stories complete. Live preview reflects font size, spacing, and accent color changes in real time.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tests, edge-case hardening, and cleanup that span all user stories.

- [x] T019 [P] Write unit tests for `useTableTheme` merged theme computation in `test/nuxt/table-appearance/useTableTheme.test.ts` — cover: default params produce correct theme, font size change updates `fontSize` param, spacing preset maps to correct `rowHeight`, dark mode selects `accentColorDark`, light mode selects `accentColorLight`
- [x] T020 [P] Write unit tests for `appLayoutStore` table appearance slice in `test/nuxt/table-appearance/tableAppearanceStore.test.ts` — cover: default shape matches `DEFAULT_TABLE_APPEARANCE_CONFIGS`, each field is individually mutable, `resetTableAppearance()` restores all defaults, Pinia persist plugin serialises the correct keys
- [ ] T021 [P] Verify `TableAppearancePreview.vue` applies inline styles correctly: write a component test that asserts the preview's inline `fontSize`, `rowHeight`, and `backgroundColor` styles match given prop values
- [x] T022 Verify `DynamicTable.vue` and `QuickQueryTable.vue` receive updated `:theme` prop on every `tableAppearanceConfigs` change — add a watcher-style smoke test or manual verification note in the quickstart
- [x] T023 [P] Confirm `SPACING_PRESET_ROW_HEIGHTS` exports are consistent between `baseTableTheme.ts` and the usage in `useTableTheme.ts` — run `bun vitest run` and confirm zero regressions in existing table-related tests
- [x] T024 Manually verify the full persistence flow: change all four fields → close browser tab → reopen → confirm all values restored from `localStorage` (key: whatever `persistedstate` assigns to `appLayoutStore`)
- [x] T025 [P] Verify no cross-mode bleed: set distinct `accentColorLight` and `accentColorDark` → toggle `@nuxtjs/color-mode` → confirm `useTableTheme` selects the correct accent for each mode
- [x] T026 [P] Verify edge case: font size set to 20 (max) → AG Grid columns do not overflow container; set to 10 (min) → text remains readable; slider cannot exceed bounds

---

## Dependency Graph

```
T001 ──┐
T002 ──┤
       ▼
T003 ──► T004 ──► T005 ──► [US1] T006–T011
                              │
                              ▼
                           [US2] T012–T013
                              │
                              ▼
                           [US3] T014–T015
                              │
                              ▼
                           [US4] T016–T018
                              │
                              ▼
                         Polish T019–T026
```

**Story completion order**: US1 → US2 → US3 → US4 (each builds on the shared store + `useTableTheme` foundation)  
**Parallel opportunities within a phase**: T012, T014, T015, T019, T020, T021, T023, T025, T026 can all run in parallel with siblings that touch different files.

---

## Parallel Execution Examples

### Foundational Phase (sequential — each step blocks the next)

```
T003 → T004 → T005
```

### US1 (T006–T011): after T005 completes

```
Parallel: T007, T008, T009 (all different files)
Then:     T006 (TableAppearanceConfig.vue — depends on T007 constants)
Then:     T010, T011 (wiring — depend on T006 + T008)
```

### Polish Phase: after T018 completes

```
Parallel: T019, T020, T021, T023, T025, T026 (all different test/verification targets)
Sequential: T022 (integration smoke), T024 (persistence manual check)
```

---

## Implementation Strategy

**MVP Scope (Recommended)**: Phase 1 + Phase 2 + Phase 3 (T001–T011)

Delivers User Story 1 (font size) with full persistence and live reactivity — immediately demonstrable, end-to-end proof that the settings → store → `useTableTheme` → AG Grid pipeline works correctly. All subsequent stories extend the same pipeline with no architectural changes.

**Increment 2**: Add Phase 4 (T012–T013) — row spacing presets, ~30 min of additional work atop the US1 scaffold.

**Increment 3**: Add Phase 5 (T014–T015) — accent color pickers, ~30 min.

**Increment 4**: Add Phase 6 (T016–T018) — live preview component.

**Final**: Phase 7 (T019–T026) — tests and cross-cutting verification.
