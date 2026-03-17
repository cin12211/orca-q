# Implementation Plan: Settings UI Standardization & Space Display

**Feature Branch**: `009-settings-ui-standardize`
**Created**: 2026-03-16

## Tech Stack

- **Framework**: Nuxt 3 + Vue 3 (Composition API, `<script setup>`)
- **State management**: Pinia (`appConfigStore`) with `persist: true`
- **Styling**: Tailwind CSS + shadcn/vue components
- **Testing**: Vitest (unit tests in `test/unit/`)

## Architecture

### Space Display — how it works

A `SpaceDisplay` enum (`compact | default | spacious`) is stored in `appConfigStore`. A utility function `getSpaceDisplayFontSize` maps each value to a CSS `font-size` string (`'smaller'`, `''`, `'larger'`). A composable `useSpaceDisplay` watches the store and sets `document.documentElement.style.fontSize` reactively. This causes all rem-relative and `font-size: inherit` elements (including ag-grid) to scale proportionally.

### UI standardisation — shared visual contract

All four panels (Appearance, Editor, Quick Query, Agent) adopt:

| Element             | Tailwind classes                                                          |
| ------------------- | ------------------------------------------------------------------------- |
| Panel root          | `h-full flex flex-col overflow-y-auto gap-4`                              |
| Section header      | `text-sm font-medium leading-7 text-primary flex items-center gap-1 mb-2` |
| Section header icon | `size-5!`                                                                 |
| Setting row         | `flex items-center justify-between gap-4`                                 |
| Setting label       | `text-sm`                                                                 |
| Setting description | `text-xs text-muted-foreground`                                           |
| label+desc block    | `flex flex-col gap-0.5`                                                   |
| Section divider     | `<hr class="border-border" />`                                            |

## File Structure

```
components/modules/settings/
  types/settings.types.ts           ← add SpaceDisplay enum
  constants/settings.constants.ts   ← add SPACE_DISPLAY_OPTIONS
  components/AppearanceConfig.vue   ← add Space Display button-group
  components/EditorConfig.vue       ← standardise UI
  components/QuickQueryConfig.vue   ← standardise UI
  components/AgentConfig.vue        ← standardise UI

core/
  composables/useSpaceDisplay.ts    ← new composable

app.vue                             ← wire useSpaceDisplay()

test/unit/core/composables/
  useSpaceDisplay.spec.ts           ← unit tests
```

## Key Decisions

- `getSpaceDisplayFontSize` is a pure function defined inside `useSpaceDisplay.ts` (not a standalone file) to keep the module tight — it is the only consumer.
- The composable is invoked once in `app.vue` so the effect applies globally before any view renders.
- `appConfigStore` uses `persist: true` — no extra storage layer is needed.
- Invalid persisted values fall back to `SpaceDisplay.Default` via the getter.
