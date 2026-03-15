# Implementation Plan: Global Theme Mode (Dark / Light / System)

**Feature Branch**: `005-theme-mode-settings`
**Created**: 2026-03-14
**Status**: Ready

## Overview

Enable users to choose their preferred color scheme (Light, Dark, or System) from the Appearance panel in Settings. The selection is applied globally and persisted across sessions via cookie.

## Tech Stack

- **Framework**: Nuxt 3 (SPA mode, SSR: false)
- **Color Mode**: `@nuxtjs/color-mode` v3.5 (already installed)
- **Styling**: Tailwind CSS v4 with `@custom-variant dark (&:is(.dark *))` already defined
- **UI Components**: shadcn-vue (`Select`, `Icon`, `Button`)
- **Architecture**: Module architecture — settings module (`components/modules/settings/`)

## Current State

| Thing                                      | Current value                                           | Required value                                             |
| ------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| `nuxt.config.ts` → `colorMode.preference`  | `'light'` (hard-coded)                                  | `'system'`-capable (user controls it)                      |
| `nuxt.config.ts` → `colorMode.classSuffix` | not set (defaults to `'-mode'`, adds `dark-mode` class) | `''` (adds `dark` class, matching existing `.dark {}` CSS) |
| `AppearanceConfig.vue`                     | No theme mode control                                   | Theme Mode selector (Light / Dark / System)                |
| `settings.constants.ts`                    | No theme mode options                                   | `THEME_MODE_OPTIONS` constant                              |

## Architecture Decisions

### Why `classSuffix: ''` is required

The existing `tailwind.css` defines `.dark { ... }` and uses `@custom-variant dark (&:is(.dark *))`. The `@nuxtjs/color-mode` module adds a CSS class to `<html>` — without `classSuffix: ''`, it adds `dark-mode` class, which does not match the `.dark` CSS rules. Setting `classSuffix: ''` makes it add just `dark`.

### No new hook or service needed

`@nuxtjs/color-mode` provides `useColorMode()` auto-imported in Nuxt. It handles:

- Reactivity (changing `preference` updates the class immediately)
- Persistence (writes to `nuxt-color-mode` cookie automatically)
- System detection (`preference = 'system'` follows `prefers-color-scheme`)
- Dynamic OS tracking (media query listener built into the module)

`AppearanceConfig.vue` can call `useColorMode()` directly — it is a component-level concern, not a shared hook.

### Default preference remains `'light'`

The `nuxt.config.ts` `preference: 'light'` is the fallback when no cookie exists. Once the user makes a selection, the cookie overrides it. This satisfies FR-007 (default to Light if no prior preference).

## File Structure Changes

```
nuxt.config.ts                                          ← Add classSuffix: ''
components/modules/settings/
  constants/settings.constants.ts                       ← Add THEME_MODE_OPTIONS
  components/AppearanceConfig.vue                       ← Add Theme Mode section
```

## Implementation Details

### 1. `nuxt.config.ts` — Add `classSuffix: ''`

Add `classSuffix: ''` to the existing `colorMode` config block. This is the critical fix that connects `@nuxtjs/color-mode` to the existing Tailwind `.dark` CSS class.

### 2. `settings.constants.ts` — Add `THEME_MODE_OPTIONS`

```ts
export const THEME_MODE_OPTIONS = [
  { label: 'Light', value: 'light', icon: 'lucide:sun' },
  { label: 'Dark', value: 'dark', icon: 'lucide:moon' },
  { label: 'System', value: 'system', icon: 'lucide:monitor' },
] as const;

export type ThemeMode = (typeof THEME_MODE_OPTIONS)[number]['value'];
```

### 3. `AppearanceConfig.vue` — Theme Mode selector

Add a new section at the top of the component (before "Chat UI") that:

- Calls `useColorMode()` (auto-imported by Nuxt)
- Renders three buttons (Light / Dark / System) styled as a segmented control
- Shows the currently active mode as selected
- Updates `colorMode.preference` on click

## Testing Notes

- Verify to ensure all module, all feateure, all componet is support dark mode and light mode
- Manual: Toggle between Light/Dark/System in Settings Appearance → app updates immediately
- Manual: Refresh page → selected mode restored
- Manual: Set System → change OS dark/light → app follows
- No unit tests added (this is pure UI wiring of an existing module)
