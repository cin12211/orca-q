# Quickstart: Table Appearance Settings

**Feature**: `008-table-appearance-settings` | **Phase**: 1

---

## What This Feature Does

Adds a **Table Appearance** section to the Settings panel that lets users configure:

1. **Font size** — slider 10–20px, applied to all table cell and header text
2. **Row spacing** — three presets: Compact (24px), Default (32px), Comfortable (42px)
3. **Accent color** — separate picker for light mode and dark mode; used for row selection highlights and focus rings

All changes are **live** (≤100ms) and **persistent** (survive page reload).

---

## Key Files to Know

| File                                                                | Role                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `core/stores/appLayoutStore.ts`                                     | Add `tableAppearanceConfigs` + `resetTableAppearance()`                   |
| `components/base/dynamic-table/constants/baseTableTheme.ts`         | Add `SPACING_PRESET_ROW_HEIGHTS` + `DEFAULT_TABLE_APPEARANCE_CONFIGS`     |
| `components/base/dynamic-table/hooks/useTableTheme.ts`              | Extend to read store and merge params via `withParams()`                  |
| `components/modules/settings/components/TableAppearanceConfig.vue`  | New settings panel section (slider, presets, color pickers, reset button) |
| `components/modules/settings/components/TableAppearancePreview.vue` | New live mini-preview HTML table                                          |
| `components/modules/settings/constants/settings.constants.ts`       | Add "Table Appearance" nav item                                           |
| `components/modules/settings/types/settings.types.ts`               | Extend `SettingsComponentKey`                                             |
| `components/modules/settings/containers/SettingsContainer.vue`      | Register `TableAppearanceConfig` in `SETTINGS_COMPONENTS` map             |

---

## How It Works End-to-End

```
User drags font size slider in TableAppearanceConfig.vue
  → updates appLayoutStore.tableAppearanceConfigs.fontSize (reactive)
  → useTableTheme() computed re-evaluates
  → new AG Grid theme object produced via withParams()
  → DynamicTable + QuickQueryTable receive updated :theme prop
  → AG Grid repaints cells with new font size
  → Pinia persist serialises to localStorage automatically
```

---

## Implementation Order (Dependencies)

1. **Store** (`appLayoutStore.ts`) — foundation; no dependencies
2. **Constants** (`baseTableTheme.ts`) — `SPACING_PRESET_ROW_HEIGHTS`, import `SpacingPreset` type
3. **`useTableTheme`** — depends on store + constants
4. **`TableAppearancePreview.vue`** — pure presentational; no hook dependencies
5. **`TableAppearanceConfig.vue`** — depends on store + preview component
6. **Settings wiring** (`settings.constants.ts`, `settings.types.ts`, `SettingsContainer.vue`, `components/index.ts`) — depends on step 5
7. **Tests** — depends on all above

---

## Running Locally

```bash
# Start dev server
bun nuxt:dev

# Open Settings → "Table Appearance" (Cmd+,)
# Adjust font size slider, pick spacing preset, choose accent color
# Verify table cells update in real time and preview updates live
```

## Running Tests

```bash
# Unit tests
bun vitest run test/unit/table-appearance/

# All unit tests
bun vitest run
```

---

## Edge Cases & Fallback Behaviour

| Scenario                               | Behaviour                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `localStorage` corrupted / cleared     | `appLayoutStore` initialises from `DEFAULT_TABLE_APPEARANCE_CONFIGS`; no error shown  |
| Font size set to max (20px)            | Columns auto-resize via AG Grid built-in column resize; no manual intervention needed |
| Setting changed while table is loading | Computed theme updates; AG Grid applies it when data rows render                      |
| Light mode → dark mode switch          | `useTableTheme` selects `accentColorDark`; no cross-mode bleed                        |
| "Reset to Defaults"                    | `resetTableAppearance()` assigns defaults; all tables repaint within 100ms            |
