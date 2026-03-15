# Tasks: Dark Mode — Module-level Fixes (ERD, Tables, Raw Query)

**Feature Branch**: `006-darkmode-module-fixes`
**Created**: 2026-03-14
**Status**: Complete

## Phase 1 — Setup

- [x] T-001 [P] Create spec.md
- [x] T-002 [P] Create plan.md
- [x] T-003 [P] Create tasks.md

## Phase 2 — AG Grid Tables (P1)

- [x] T-004 — Split `baseTableTheme.ts` into `baseTableThemeLight` + `baseTableThemeDark` using AG Grid `colorSchemeLight` / `colorSchemeDark` parts

  - **File**: `components/base/dynamic-table/constants/baseTableTheme.ts`

- [x] T-005 — Create `useTableTheme()` reactive composable

  - **File**: `components/base/dynamic-table/hooks/useTableTheme.ts` _(new)_
  - **Why**: Tables are mounted as Vue components — the theme must react to color mode changes without unmounting. A computed ref wired to `useColorMode()` achieves this.

- [x] T-006 — Export `useTableTheme` from hooks index

  - **File**: `components/base/dynamic-table/hooks/index.ts`

- [x] T-007 — Update `DynamicTable.vue` to use reactive theme

  - **File**: `components/base/dynamic-table/DynamicTable.vue`
  - Changes: `useTableTheme()` composable, row stripe `var(--color-neutral-100)` → `var(--muted)`, remove `.ag-cell { color: var(--color-black) }`
  - **Depends on**: T-005, T-006

- [x] T-008 — Update `QuickQueryTable.vue` to use reactive theme
  - **File**: `components/modules/quick-query/quick-query-table/QuickQueryTable.vue`
  - Changes: same as DynamicTable — `useTableTheme()`, `var(--muted)` stripe, `.ag-cell` uses `var(--foreground)`
  - **Depends on**: T-005, T-006

## Phase 3 — Raw Query Result Tabs (P2)

- [x] T-009 — Fix `ExplainOperationCell.vue` tree connector color

  - **File**: `components/modules/raw-query/components/result-tab/explain/components/ExplainOperationCell.vue`
  - `text-neutral-400` → `text-muted-foreground`

- [x] T-010 — Fix `ResultTabAgentView.vue` prose code block colors

  - **File**: `components/modules/raw-query/components/result-tab/ResultTabAgentView.vue`
  - `prose-pre:bg-gray-900 prose-pre:text-gray-100` → `prose-pre:bg-muted prose-pre:text-foreground`

- [x] T-011 — Fix `ResultTabErrorView.vue` error highlight color
  - **File**: `components/modules/raw-query/components/result-tab/ResultTabErrorView.vue`
  - `rgba(239,68,68,0.2)` → `color-mix(in srgb, rgb(239,68,68) 25%, transparent)`

## Phase 4 — ERD Module (P3)

- [x] T-012 — Fix `ValueNode.vue` column icon colors (already applied in feature 005 work)
  - **File**: `components/modules/erd-diagram/ValueNode.vue`
  - `text-gray-400` → `dark:text-muted-foreground`, `text-gray-300` → `dark:text-muted-foreground/60`

## Phase 5 — Validation

- [x] T-013 — TypeScript typecheck passes (`bun typecheck` → 0 errors)
- [ ] T-014 — Manual verification
  - Switch to dark mode → open QuickQuery table → verify rows, header, stripe
  - Switch to dark mode → run failing query in Raw Query → check Error tab highlight
  - Switch to dark mode → view ERD → verify column icons
  - Switch back to light → verify no regressions
