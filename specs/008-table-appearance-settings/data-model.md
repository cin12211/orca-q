# Data Model: Table Appearance Settings

**Feature**: `008-table-appearance-settings` | **Phase**: 1

---

## Entities

### 1. `TableAppearanceConfigs` (Stored Preference)

Persisted inside `appConfigStore` via `persist: true` → `localStorage`.

```ts
// core/stores/appConfigStore.ts

export type SpacingPreset = 'compact' | 'default' | 'comfortable';

export interface TableAppearanceConfigs {
  fontSize: number; // integer, range [10, 20], default: 13
  spacingPreset: SpacingPreset; // default: 'default'
  accentColorLight: string; // CSS color string, default: '#0ea5e9'
  accentColorDark: string; // CSS color string, default: '#38bdf8'
}
```

**Validation rules**:

- `fontSize`: clamped to `[FONT_SIZE_MIN, FONT_SIZE_MAX]` = `[10, 20]` at write time by the settings UI (slider enforces range)
- `spacingPreset`: enum member — only valid if in `SpacingPreset` union; UI enforces this via preset buttons
- `accentColorLight` / `accentColorDark`: any valid CSS color string; native `<input type="color">` enforces valid hex output

**State transitions**: No state machine — all fields are independently mutable. "Reset to Defaults" replaces the entire object with `DEFAULT_TABLE_APPEARANCE_CONFIGS` in a single assignment.

---

### 2. `SpacingPreset` → Row Height Mapping (Constant, not stored)

```ts
// components/base/dynamic-table/constants/baseTableTheme.ts

export const SPACING_PRESET_ROW_HEIGHTS: Record<SpacingPreset, number> = {
  compact: 24,
  default: 32,
  comfortable: 42,
};
```

---

### 3. `DEFAULT_TABLE_APPEARANCE_CONFIGS` (Constant)

```ts
// components/base/dynamic-table/constants/baseTableTheme.ts (or separate constants file)

export const DEFAULT_TABLE_APPEARANCE_CONFIGS: TableAppearanceConfigs = {
  fontSize: 13,
  spacingPreset: 'default',
  accentColorLight: '#0ea5e9', // Tailwind sky-500 — matches existing system blue accent
  accentColorDark: '#38bdf8', // Tailwind sky-400 — lighter variant for dark backgrounds
};
```

---

### 4. Computed `AgGridTheme` (Derived, not stored)

Computed inside `useTableTheme()` composable. Never persisted.

```ts
// Pseudo-type — the actual type is AG Grid's Theme object (no named export)
// Derived each time fontSize / spacingPreset / accentColor / colorMode changes

computedTheme = baseLightOrDark.withParams({
  fontSize: configs.fontSize,
  rowHeight: SPACING_PRESET_ROW_HEIGHTS[configs.spacingPreset],
  accentColor:
    colorMode === 'dark' ? configs.accentColorDark : configs.accentColorLight,
});
```

---

## Field Reference Summary

| Field                   | Type            | Range / Values                          | Default     | Stored          |
| ----------------------- | --------------- | --------------------------------------- | ----------- | --------------- |
| `fontSize`              | `number`        | 10–20 (integer)                         | `13`        | ✅ localStorage |
| `spacingPreset`         | `SpacingPreset` | `compact` \| `default` \| `comfortable` | `'default'` | ✅ localStorage |
| `accentColorLight`      | `string`        | any CSS color                           | `'#0ea5e9'` | ✅ localStorage |
| `accentColorDark`       | `string`        | any CSS color                           | `'#38bdf8'` | ✅ localStorage |
| `rowHeight` (derived)   | `number`        | 24 \| 32 \| 42                          | `32`        | ❌ computed     |
| `accentColor` (derived) | `string`        | mode-selected accent                    | sky-500/400 | ❌ computed     |

---

## Store Extension Diff (Conceptual)

```ts
// core/stores/appConfigStore.ts — additions only

export type SpacingPreset = 'compact' | 'default' | 'comfortable';

export interface TableAppearanceConfigs {
  fontSize: number;
  spacingPreset: SpacingPreset;
  accentColorLight: string;
  accentColorDark: string;
}

// Inside useAppConfigStore() setup function:
const tableAppearanceConfigs = reactive<TableAppearanceConfigs>({
  ...DEFAULT_TABLE_APPEARANCE_CONFIGS,
});

const resetTableAppearance = () => {
  Object.assign(tableAppearanceConfigs, DEFAULT_TABLE_APPEARANCE_CONFIGS);
};

// Added to return statement:
return {
  // ...existing returns...
  tableAppearanceConfigs,
  resetTableAppearance,
};
```

The `DEFAULT_TABLE_APPEARANCE_CONFIGS` constant is co-located in `core/stores/appConfigStore.ts` (alongside `DEFAULT_CHAT_UI_CONFIG` which follows the same pattern) or extracted to `components/base/dynamic-table/constants/` and imported — the store import is acceptable since constants may flow upward from a base layer. **The simpler choice is to define the constant in the store file itself**, matching `DEFAULT_CHAT_UI_CONFIG`.
