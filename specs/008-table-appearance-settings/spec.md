# Feature Specification: Table Appearance Settings

**Feature Branch**: `008-table-appearance-settings`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "Enhance to allow user setting quick query to custom color, theme, font size, space for table — this config applies to DynamicTable and QuickQueryTable"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Adjust table font size from settings (Priority: P1)

A developer finds the default table font too small on a high-resolution monitor. They open the Settings panel, navigate to the "Table Appearance" section, and drag a font size slider to a larger value. All table views (Quick Query, raw query, ERD data panels) immediately reflect the new font size without a page reload.

**Why this priority**: Font size is the single most universally impactful readability setting. Delivering this alone provides clear, demonstrable value and validates the settings persistence + live-preview pipeline.

**Independent Test**: Open any table view → open Settings → change font size slider → verify table text size changes in real time and persists after closing and reopening the table panel.

**Acceptance Scenarios**:

1. **Given** a table is visible, **When** the user increases the font size setting, **Then** all cell text and headers in DynamicTable and QuickQueryTable reflect the new size immediately.
2. **Given** the font size was changed, **When** the user refreshes the page or reopens the app, **Then** the saved font size is applied on load.
3. **Given** the settings panel is open, **When** the user resets to defaults, **Then** the font size reverts to the default value and tables update instantly.

---

### User Story 2 - Adjust row height / cell spacing (Priority: P2)

A user working with wide data prefers compact rows to see more data at once. They open the Table Appearance settings and select a "Compact", "Default", or "Comfortable" row spacing preset. All table rows immediately resize to match the selection.

**Why this priority**: Row density directly affects how much data a user can scan at once — a critical workflow efficiency concern for data-heavy users.

**Independent Test**: Open a table with 20+ rows → change row spacing to "Compact" → verify row height decreases across all table instances and the change persists on next session.

**Acceptance Scenarios**:

1. **Given** a table is displaying data, **When** the user selects "Compact" spacing, **Then** row height decreases and more rows become visible without scrolling.
2. **Given** "Comfortable" spacing is selected, **When** the table renders, **Then** row height increases with additional padding.
3. **Given** the spacing preference was saved, **When** the app is reloaded, **Then** the same spacing preset is applied automatically.

---

### User Story 3 - Choose accent color / cell highlight color (Priority: P3)

A user wants to personalize the table to match their team's brand or improve visual distinction. They open the Table Appearance settings and pick an accent color from a color palette. This color is used for selected row highlights, focus borders, and column highlights in all table instances.

**Why this priority**: Color customization enhances personalization but is not critical for core usability. Delivered after spacing and font size are stable.

**Independent Test**: Open Table Appearance settings → choose a custom accent color → verify selected rows and focused cells use the new color in both DynamicTable and QuickQueryTable.

**Acceptance Scenarios**:

1. **Given** the user selects a custom accent color, **When** they click a row in any table, **Then** the selected row highlight uses the custom color.
2. **Given** a custom color is saved, **When** the user switches between dark mode and light mode, **Then** the custom accent color is preserved (on top of the mode's base theme).
3. **Given** the user resets to defaults, **When** the reset is confirmed, **Then** the system accent color is restored.

---

### User Story 4 - Live preview in settings panel (Priority: P3)

While adjusting any table appearance setting (font size, spacing, colors), the user sees a live mini-preview of a sample table within the settings panel itself before applying changes, allowing confident decision-making.

**Why this priority**: Reduces trial-and-error when choosing values — a quality-of-life improvement that increases user confidence.

**Independent Test**: Open Table Appearance settings → modify any value → a small embedded table preview in the settings panel updates in real time to reflect the change.

**Acceptance Scenarios**:

1. **Given** the settings panel is open with a preview table, **When** the user changes font size, **Then** the preview table font updates immediately.
2. **Given** the settings panel is open, **When** the user changes row spacing, **Then** the preview table row heights update to reflect the new preset.

---

### Edge Cases

- What happens when a user sets an extremely large font size (e.g., 36px) and columns become unreadable? → The slider has a defined max value; column widths auto-adjust using AG Grid's column resize logic.
- What happens when both a custom light-mode accent and a dark-mode accent are set and the user toggles modes? → Each mode stores its own accent; toggling modes applies the correct stored accent for that mode.
- What happens on first run before any settings have been saved? → The system applies built-in defaults (font: 13px, spacing: Default, accent: system blue matching existing theme).
- What happens if stored settings are corrupted or unreadable (e.g., browser storage cleared)? → System silently falls back to defaults on next load without an error message.
- What happens when a setting is changed while a table is loading data? → The setting is queued and applied once data renders; no visual glitch occurs.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a "Table Appearance" section within the application settings accessible from the main settings panel.
- **FR-002**: Users MUST be able to set a table font size within a defined range (minimum 10px, maximum 20px) via a slider or numeric input.
- **FR-003**: Users MUST be able to choose a row height/spacing preset from at least three options: Compact, Default, and Comfortable.
- **FR-004**: Users MUST be able to choose a custom accent color used for row selection highlights and focus indicators in all table instances.
- **FR-005**: All appearance settings MUST apply in real time to all open DynamicTable and QuickQueryTable instances without requiring a page reload.
- **FR-006**: All appearance settings MUST persist across sessions (survive page reload and app restart).
- **FR-007**: The settings panel MUST include a live mini-preview table that reflects changes as the user adjusts each setting.
- **FR-008**: A "Reset to Defaults" action MUST be available that restores all table appearance settings to their factory default values.
- **FR-009**: Appearance settings MUST apply independently to light mode and dark mode — changing settings in dark mode does not affect light mode defaults, and vice versa.
- **FR-010**: The customization system MUST integrate with the existing AG Grid theming infrastructure (`useTableTheme`) so that both DynamicTable and QuickQueryTable consume settings from a single source of truth.
- **FR-011**: Settings MUST be reactive — components consuming the theme do not need to be remounted; they reactively respond to setting changes.

### Key Entities

- **Table Appearance Settings**: A persistent user preference record containing: font size, row spacing preset, light-mode accent color, dark-mode accent color. Stored per-user/per-device.
- **Table Theme**: The computed AG Grid theme object derived from both the current color mode (light/dark) and the user's Table Appearance Settings. Consumed by DynamicTable and QuickQueryTable via the existing `useTableTheme` composable.
- **Spacing Preset**: An enumerated value (Compact / Default / Comfortable) mapping to specific row height pixel values and cell padding config understood by AG Grid.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All appearance changes (font size, spacing, accent color) are reflected in visible table UI within 100 milliseconds of the user changing a setting.
- **SC-002**: Settings persist with 100% consistency — saved preferences are applied correctly on every subsequent page load.
- **SC-003**: Both DynamicTable and QuickQueryTable reflect identical appearance settings when the same configuration is active — zero divergence between the two table implementations.
- **SC-004**: The settings panel live preview updates in real time as values change, giving users immediate visual feedback before confirming.
- **SC-005**: "Reset to Defaults" restores all settings in a single action, with tables reverting visually within 100 milliseconds.
- **SC-006**: Dark/light mode switching preserves each mode's independently saved appearance settings — no cross-mode bleed.

## Assumptions

- The existing `useTableTheme` composable in `components/base/dynamic-table/hooks/useTableTheme.ts` serves as the integration point; it will be extended to incorporate user preference settings on top of base light/dark themes.
- AG Grid's theming parameter system supports runtime updates to font size, row height, and color variables without requiring grid destruction and re-creation.
- User appearance preferences are stored in the same persistence layer as other app settings (e.g., the existing Pinia store or local storage, as determined during planning).
- The settings panel UI already exists; this feature adds a new "Table Appearance" subsection to it.
