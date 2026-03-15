# Tasks: Global Theme Mode (Dark / Light / System)

**Feature Branch**: `005-theme-mode-settings`
**Created**: 2026-03-14
**Status**: In Progress

## Phase 1 — Setup

- [x] T-001 [P] Create plan.md
- [x] T-002 [P] Create tasks.md

## Phase 2 — Core Implementation

- [x] T-003 — Fix `nuxt.config.ts`: add `classSuffix: ''` to `colorMode` config

  - **File**: `nuxt.config.ts`
  - **Why**: Without this, `@nuxtjs/color-mode` adds `dark-mode` class instead of `dark`, breaking all Tailwind dark variant styles.

- [x] T-004 — Add `THEME_MODE_OPTIONS` constant to settings constants

  - **File**: `components/modules/settings/constants/settings.constants.ts`
  - **Why**: Centralizes the options definition (label, value, icon) for the theme mode selector, keeping the component clean.

- [x] T-005 — Add Theme Mode selector to `AppearanceConfig.vue`
  - **File**: `components/modules/settings/components/AppearanceConfig.vue`
  - **Why**: This is the UI entry point for the feature. Connects `useColorMode()` to a segmented button control in the Appearance settings section.
  - **Depends on**: T-003, T-004

## Phase 3 — Validation

- [x] T-006 — Verify TypeScript typecheck passes

  - Run: `bun typecheck`
  - Confirm no errors introduced by the changes

- [x] T-007 — Manual verification

  - Open Settings → Appearance
  - Select Dark → verify app switches to dark theme
  - Select Light → verify app switches to light theme
  - Select System → verify app follows OS preference
  - Refresh page → verify preference is restored

- [x] T-008 — Scan to check all componet , all feature, all module is support dark mode and light mode
