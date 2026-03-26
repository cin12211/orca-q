# Research: Table Appearance Settings

**Feature**: `008-table-appearance-settings` | **Phase**: 0

---

## R-001: AG Grid v33 Runtime Theme Param Updates

**Decision**: Use `themeBalham.withPart(colorSchemeLight/Dark).withParams({ fontSize, rowHeight, accentColor })` to produce a new computed `AgGridTheme` object each time a setting changes. Pass this as `:theme="tableTheme"` on the `<AgGridVue>` component.

**Rationale**: AG Grid's v33 Theme API (the "params theming" API) is designed for this pattern. A computed value returned from `useTableTheme()` is already bound as a prop on both `DynamicTable.vue` (line 260) and `QuickQueryTable.vue` (line 424). When the computed ref changes, Vue's reactivity propagates the new theme object into the grid without destroying and re-creating the grid instance.

**Verified params** supported by `themeBalham` (from AG Grid v33 docs and the existing `baseTableTheme.ts` usage):

- `fontSize`: number (pixels) — controls all cell and header text size
- `rowHeight`: number (pixels) — height of data rows; AG Grid recalculates layout reactively
- `accentColor`: CSS color string — used by AG Grid for selections, focus rings, row highlight tints
- `headerVerticalPaddingScale`, `spacing` — already in use; untouched by this feature

**Alternatives considered**:

- CSS custom property injection at runtime: would require knowing AG Grid's internal CSS var names, which are internal and undocumented. Fragile across AG Grid upgrades.
- `gridApi.setGridOption('rowHeight', n)` + `gridApi.resetRowHeights()`: viable as a fallback but bypasses the unified theme flow; would need separate calls per grid instance.

---

## R-002: Store Architecture — Extend appConfigStore vs New Store

**Decision**: Extend `core/stores/appConfigStore.ts` with a new `tableAppearanceConfigs` reactive object following the identical pattern used for `codeEditorConfigs` and `chatUiConfigs`.

**Rationale**: The store already handles `persist: true` which automatically serialises to `localStorage` via `pinia-plugin-persistedstate`. All analogous user preference blobs (`codeEditorConfigs`, `chatUiConfigs`) live here. Creating a separate `useTableAppearanceStore` would be premature abstraction for a single config object; the naming convention and pattern are already established.

**Shape**:

```ts
export interface TableAppearanceConfigs {
  fontSize: number; // 10–20, default 13
  spacingPreset: SpacingPreset; // 'compact' | 'default' | 'comfortable'
  accentColorLight: string; // CSS color, default '#0ea5e9' (sky-500)
  accentColorDark: string; // CSS color, default '#38bdf8' (sky-400)
}
```

**Alternatives considered**:

- Separate Pinia store: unnecessary complexity for a config blob that belongs with other UI preferences.
- `localStorage` direct read/write: would bypass Pinia reactivity; themes would not update in real time.

---

## R-003: Per-Mode Accent Color — Storage Strategy

**Decision**: Store `accentColorLight` and `accentColorDark` as two separate string fields in `TableAppearanceConfigs`. `useTableTheme` selects the correct field based on `colorMode.value`.

**Rationale**: FR-009 requires that changing a setting in dark mode must not affect light mode defaults. The simplest correct implementation is two fields. Both are reset independently by "Reset to Defaults".

**Alternatives considered**:

- Single accent color applied to both modes: violates FR-009.
- A nested `{ light: string, dark: string }` object: equivalent data, more verbose access path; not worth the complexity at this scale.

---

## R-004: Spacing Preset → Row Height Mapping

**Decision**: Three presets map to fixed `rowHeight` pixel values passed to AG Grid `withParams()`:

| Preset        | `rowHeight` | Description                                   |
| ------------- | ----------- | --------------------------------------------- |
| `compact`     | 24          | Dense — maximises visible rows                |
| `default`     | 32          | AG Grid Balham default — current behaviour    |
| `comfortable` | 42          | More padding — easier scanning of sparse data |

**Rationale**: AG Grid's `themeBalham` default row height is 32px. 24px is the minimum comfortable for touch and keyboard targets. 42px matches typical "comfortable" table density in analytics tools (e.g., Airtable, Notion). These are hardcoded constants rather than a free-form slider to keep the UI simple and the preset options clearly differentiable.

**Alternatives considered**:

- Free slider for row height: overly granular; most users think in presets not pixels.
- Using AG Grid's `spacing` multiplier instead of `rowHeight`: `spacing` affects all margins globally including headers, making it unsuitable for isolated row height control.

---

## R-005: Live Preview Implementation

**Decision**: Implement `TableAppearancePreview.vue` as a pure HTML/CSS mock table (not an AG Grid instance). The preview applies settings via inline CSS custom properties bound to the component's root element.

**Rationale**: Embedding a real AG Grid instance inside a settings panel risks performance overhead and lifecycle complexity. A styled HTML table that visually mirrors the AG Grid appearance (using the same CSS variables already defined in `baseTableTheme.ts`) delivers the same UX value with zero AG Grid overhead. The preview binds `:style` with the current `fontSize`, `rowHeight`, and `accentColor` values so it updates in real time as the user drags sliders or picks colors.

**Alternatives considered**:

- Real AG Grid mini-grid: higher fidelity but initialisation cost and event handling complexity in a small settings panel is not justified.
- Plain text description of settings: not visual feedback, fails FR-007 / SC-004.

---

## R-006: Font Size Slider vs Numeric Input

**Decision**: Use a shadcn `Slider` component for font size (range 10–20, step 1) alongside a read-only numeric display. No free-form text input.

**Rationale**: The spec (FR-002) specifies a slider or numeric input. A slider with a live display gives immediate visual drag feedback while constraining the value to the valid range without requiring input validation logic. This mirrors the existing chat font size UI in `EditorConfig.vue`.

**Alternatives considered**:

- `<input type="number">`: works but requires additional validation (min/max clamping). The slider is simpler and more discoverable.

---

## R-007: Reset to Defaults Action

**Decision**: A `resetTableAppearance()` action in `appConfigStore` that assigns `DEFAULT_TABLE_APPEARANCE_CONFIGS` back to `tableAppearanceConfigs`. No confirmation dialog — immediate, reversible by adjusting settings again.

**Rationale**: "Reset" is a low-risk action in a settings panel; it affects only visual appearance, not data. The spec (FR-008) says "a reset action must be available" without requiring confirmation. Matching the pattern used in other settings sections (no dialogs).

---

## R-008: Settings Nav Integration

**Decision**: Add a new nav item `'Table Appearance'` to `SETTINGS_NAV_ITEMS` in `settings.constants.ts` with `componentKey: 'TableAppearanceConfig'` and icon `'hugeicons:table-02'`. Extend the `SettingsComponentKey` union type and `SETTINGS_COMPONENTS` map in `SettingsContainer.vue`.

**Rationale**: This is the established pattern for adding a settings section. No structural changes to the settings module's architecture needed — it's purely additive.
