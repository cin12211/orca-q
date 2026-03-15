# Implementation Plan: Table Appearance Settings

**Branch**: `008-table-appearance-settings` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-table-appearance-settings/spec.md`

## Summary

Add a "Table Appearance" settings section that lets users configure font size, row-height spacing preset, and per-mode accent color for all AG Grid table instances. Changes apply reactively in real time and persist across sessions via the existing Pinia `appLayoutStore` (`persist: true`). The single integration point is the `useTableTheme` composable, which will be extended to merge user preferences on top of the base light/dark themes via AG Grid's `withParams()` API.

## Technical Context

**Language/Version**: TypeScript 5 / Vue 3.5 / Nuxt 3 (SPA, `ssr: false`)  
**Primary Dependencies**: AG Grid v33 (`ag-grid-community`, `ag-grid-vue3`) with `themeBalham`; Pinia (`pinia-plugin-persistedstate`); `@nuxtjs/color-mode`; shadcn-vue UI components; VueUse  
**Storage**: `localStorage` via Pinia `persist: true` — same mechanism already used for `codeEditorConfigs`, `chatUiConfigs`, `quickQuerySafeModeEnabled` in `appLayoutStore`  
**Testing**: Vitest (unit), Vue Test Utils (component), Playwright (E2E per `playwright.config.ts`)  
**Target Platform**: Browser (Chromium) + Electron desktop wrapper  
**Project Type**: Web application (Nuxt SPA)  
**Performance Goals**: Appearance setting changes reflected in visible table UI ≤100 ms (SC-001 / SC-005)  
**Constraints**: No grid destruction/re-creation on setting change — AG Grid's `withParams()` supports runtime updates. Settings must not bleed across light/dark modes (FR-009).  
**Scale/Scope**: 2 table components (`DynamicTable.vue`, `QuickQueryTable.vue`); 1 composable; 1 store extension; 1 settings config component + 1 preview component; ~4 new constants/type entries

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

> Constitution file is a template with no project-specific gates filled in yet. No blocking violations. Proceeding under standard Module Architecture rules from `.github/instructions/module-architecture.instructions.md`.

**Dependency rules verified (post-design)**:

| Layer                                        | This feature's additions                                                    | Verdict |
| -------------------------------------------- | --------------------------------------------------------------------------- | ------- |
| `components/` (`TableAppearancePreview.vue`) | Imports `types/`, `constants/` only                                         | ✅      |
| `components/` (`TableAppearanceConfig.vue`)  | Imports `types/`, `constants/`, `appLayoutStore` via auto-import            | ✅      |
| `hooks/` (`useTableTheme`)                   | Imports `services/` — N/A; imports `appLayoutStore`, `constants/`, `types/` | ✅      |
| `core/stores/` (`appLayoutStore`)            | Extended with `tableAppearanceConfigs` — no new external imports            | ✅      |

## Project Structure

### Documentation (this feature)

```text
specs/008-table-appearance-settings/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
core/stores/
└── appLayoutStore.ts                         MODIFY — add TableAppearanceConfigs interface + tableAppearanceConfigs reactive + reset action

components/base/dynamic-table/
├── constants/
│   └── baseTableTheme.ts                     MODIFY — extract SPACING_PRESET_ROW_HEIGHTS map; add DEFAULT_TABLE_APPEARANCE
├── hooks/
│   └── useTableTheme.ts                      MODIFY — read tableAppearanceConfigs from store; compute merged theme via withParams()

components/modules/settings/
├── components/
│   ├── TableAppearanceConfig.vue             NEW — settings panel section (font size slider, spacing presets, accent color pickers)
│   ├── TableAppearancePreview.vue            NEW — live mini-preview table rendered as styled HTML (no AG Grid instance needed)
│   └── index.ts                              MODIFY — export TableAppearanceConfig
├── constants/
│   └── settings.constants.ts                 MODIFY — add "Table Appearance" nav item; add TABLE_FONT_SIZE_RANGE, SPACING_PRESET_OPTIONS
└── types/
    └── settings.types.ts                     MODIFY — add 'TableAppearanceConfig' to SettingsComponentKey union

test/unit/
└── table-appearance/
    ├── useTableTheme.spec.ts                 NEW — unit tests for merged theme computation
    └── tableAppearanceStore.spec.ts          NEW — unit tests for store defaults, reset, persistence shape
```

**Structure Decision**: Frontend-only single project. No new modules created — changes extend the existing `settings` module and `dynamic-table` base component following the established module architecture pattern. The `TableAppearanceConfig` component is placed alongside `AppearanceConfig`, `EditorConfig`, etc. in `components/modules/settings/components/`. The store extension follows the exact same pattern as `codeEditorConfigs` and `chatUiConfigs` in `appLayoutStore`.

## Complexity Tracking

> No constitution violations. No complexity justification required.

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
