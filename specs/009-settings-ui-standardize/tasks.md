# Tasks: Settings UI Standardization & Space Display

**Feature**: 009-settings-ui-standardize
**Created**: 2026-03-16

## Phase 1 — Types & Constants

- [x] **T01** Add `SpaceDisplay` enum to `components/modules/settings/types/settings.types.ts`
- [x] **T02** Add `SPACE_DISPLAY_OPTIONS` constant and `DEFAULT_SPACE_DISPLAY` to `components/modules/settings/constants/settings.constants.ts`

## Phase 2 — State

- [x] **T03** Add `spaceDisplay` reactive ref to `core/stores/appConfigStore.ts` (default = `SpaceDisplay.Default`, returned and persisted)

## Phase 3 — Logic

- [x] **T04** Create `core/composables/useSpaceDisplay.ts` with `getSpaceDisplayFontSize` helper and `useSpaceDisplay` composable that watches store and applies font-size to `document.documentElement`
- [x] **T05** Write unit tests in `test/unit/core/composables/useSpaceDisplay.spec.ts` — cover all three mappings including `compact → font-size: smaller` and the ag-grid global effect scenario

## Phase 4 — Wire-up

- [x] **T06** Call `useSpaceDisplay()` inside `app.vue` `<script setup>` so the effect applies on every page

## Phase 5 — UI: New Feature

- [x] **T07** Add Space Display button-group to `components/modules/settings/components/AppearanceConfig.vue` (below Theme, above TableAppearanceConfig, separated by `<hr>`)

## Phase 6 — UI: Standardisation

- [x] **T08** Standardise `components/modules/settings/components/EditorConfig.vue` — fix outer gap, add descriptions to Code Editor setting rows (Font size, Theme, Mini map, Indentation)
- [x] **T09** Standardise `components/modules/settings/components/QuickQueryConfig.vue` — fix outer gap from `gap-2` to `gap-4`
- [x] **T10** Standardise `components/modules/settings/components/AgentConfig.vue` — remove extra `px-1` padding, align row spacing to standard
