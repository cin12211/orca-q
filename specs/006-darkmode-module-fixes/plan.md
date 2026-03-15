# Implementation Plan: Dark Mode — Module-level Fixes (ERD, Tables, Raw Query)

**Feature Branch**: `006-darkmode-module-fixes`
**Created**: 2026-03-14
**Status**: Implemented

## Overview

Fix all remaining dark mode regressions in the ERD, AG Grid table, and Raw Query modules. This builds on feature 005 (global theme mode) where `@nuxtjs/color-mode` with `classSuffix: ''` was configured and the Settings Appearance UI was added.

## Tech Stack

- **Framework**: Nuxt 3 (SPA, SSR: false)
- **Tables**: AG Grid v33 (`ag-grid-community`, `ag-grid-vue3`) with `themeBalham`
- **Color Mode**: `@nuxtjs/color-mode` → `useColorMode()` auto-imported
- **Styling**: Tailwind CSS v4 with `@custom-variant dark (&:is(.dark *))`
- **Architecture**: Module architecture per `.github/instructions/module-architecture.instructions.md`

## Problem Analysis

### AG Grid Tables (Critical)

AG Grid themes are statically defined — the existing `baseTableTheme` used only `themeBalham.withParams()` with no color scheme part. This caused:

- Cell text defaulting to `var(--color-black)` via `.ag-cell { color: var(--color-black) }` (invisible in dark)
- Row stripe using `var(--color-neutral-100)` (a Tailwind light-grey, not available in dark)
- Header background controlled by AG Grid's default light theme, unchanged in dark mode

**Fix**: Use AG Grid's `colorSchemeDark` / `colorSchemeLight` parts via `withPart()` to create two named themes, and a reactive `useTableTheme()` composable.

### Raw Query Result Tabs

- `ExplainOperationCell.vue`: Tree connector `text-neutral-400` — hardcoded, not adaptive
- `ResultTabAgentView.vue`: Prose code blocks `prose-pre:bg-gray-900 prose-pre:text-gray-100` — hardcoded dark values that conflict with the app dark background
- `ResultTabErrorView.vue`: Error highlight `rgba(239,68,68,0.2)` — near-invisible on dark background

### ERD ValueNode

Already fixed in this feature set — `text-gray-400`, `text-gray-300` column icons → `text-muted-foreground` / `dark:text-muted-foreground/60`.

## File Structure Changes

```
components/base/dynamic-table/
  constants/baseTableTheme.ts           ← Split into light + dark themes
  hooks/useTableTheme.ts                ← NEW: reactive composable
  hooks/index.ts                        ← Export useTableTheme
  DynamicTable.vue                      ← Use useTableTheme(), fix row stripe, remove hardcoded cell color

components/modules/quick-query/quick-query-table/
  QuickQueryTable.vue                   ← Same: useTableTheme(), fix row stripe, fix cell color

components/modules/raw-query/components/result-tab/
  ResultTabAgentView.vue                ← prose-pre colors → semantic vars
  ResultTabErrorView.vue                ← rgba error highlight → color-mix
  explain/components/ExplainOperationCell.vue  ← text-neutral-400 → text-muted-foreground
```

## Key Decisions

### Reactive AG Grid Theme Pattern

```ts
// useTableTheme.ts
export function useTableTheme() {
  const colorMode = useColorMode();
  return computed(() =>
    colorMode.value === 'dark' ? baseTableThemeDark : baseTableThemeLight
  );
}
```

The computed value is passed as `:theme="tableTheme.value"` via `gridOptions`. AG Grid's reactivity picks up the change immediately when computed value changes.

### Row Stripe: `var(--muted)` instead of `var(--color-neutral-100)`

`var(--muted)` is a shadcn CSS variable that adapts in the `.dark {}` CSS block — it's `oklch(0.97 0 0)` in light and `oklch(0.269 0 0)` in dark. `var(--color-neutral-100)` is a Tailwind static palette color that does not adapt.

### Error Highlight: `color-mix()` instead of `rgba()`

`color-mix(in srgb, rgb(239,68,68) 25%, transparent)` is a CSS native function that produces the same visual result but works on any background because it mixes the red with `transparent` rather than white-assuming opacity.
