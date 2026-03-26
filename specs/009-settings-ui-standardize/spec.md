# Feature Specification: Settings UI Standardization & Space Display

**Feature Branch**: `009-settings-ui-standardize`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Standardize Settings UI across all setting components for consistent labels, spacing and typography; add Space Display setting in AppearanceConfig with 3 options (compact, default, spacious) using CSS font-size values"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Space Display Preference (Priority: P1)

A user wants to adjust how dense or spacious the entire application UI feels. They open Settings → Appearance and find a new "Space display" control with three choices: Compact, Default, and Spacious. After selecting Spacious, the app immediately applies a slightly larger text scale, making everything feel more open and readable. The preference is remembered across sessions.

**Why this priority**: This is the primary new capability requested and delivers visible, immediately testable user value on its own. It also lays the foundation for a persisted display-density preference pattern.

**Independent Test**: Open Settings → Appearance, change Space display to "Spacious", dismiss the modal — observe that UI text scale increases globally. Reopen the app and confirm the preference persists.

**Acceptance Scenarios**:

1. **Given** the user is on the Appearance settings tab, **When** they view the Space display control, **Then** they see exactly three options: Compact, Default, and Spacious.
2. **Given** the user selects "Spacious", **When** the change is applied, **Then** the entire application UI reflects a visually larger text scale without a page reload.
3. **Given** the user selects "Compact", **When** the change is applied, **Then** the UI reflects a visually smaller, denser text scale.
4. **Given** the user selects "Default", **When** the change is applied, **Then** the UI returns to its baseline text scale.
5. **Given** the user has set a non-default Space display, **When** they reload or reopen the application, **Then** the previously chosen Space display is still active.

---

### User Story 2 - Consistent Settings UI Across All Panels (Priority: P2)

A user navigates between the Appearance, Editor, Quick Query, and Agent settings panels. Currently each panel looks different — section headers have inconsistent spacing, label typographies differ (some labels are `text-sm`, others `text-xs font-medium`), and the gap between rows varies. After this feature, all panels share a single visual language: uniform section headers, consistent row structure (setting label + description on the left, control on the right), and identical vertical rhythm between items.

**Why this priority**: UI consistency is a quality-of-life improvement that benefits every user and makes future settings panels easier to build, but it delivers no new functional capability on its own — hence P2.

**Independent Test**: Open Settings and cycle through every panel tab. Verify that section header height, label size, description text size, spacing between items, and control alignment appear identical across all panels.

**Acceptance Scenarios**:

1. **Given** the user opens any settings panel, **When** they view a setting row, **Then** the primary label is always the same text size and weight, and the description below it is always the same muted smaller size.
2. **Given** the user opens any settings panel, **When** they view a section header, **Then** the header icon size, font size, font weight, and bottom margin below it are identical across all panels.
3. **Given** the user switches between Appearance, Editor, Quick Query, and Agent panels, **When** they compare the vertical gap between consecutive setting rows, **Then** the gap is visually identical in every panel.
4. **Given** a settings panel contains multiple sections separated by a divider, **When** the user views the divider, **Then** its style and surrounding spacing are identical to all other panels that use dividers.

---

### User Story 3 - Space Display Reflected in Settings Panel Itself (Priority: P3)

When a user changes the Space display setting, the Settings modal itself also immediately reflects the active density level — not only the rest of the application — so the user can see a live preview of the chosen density without closing the dialog.

**Why this priority**: This is a polish enhancement on top of Story 1 that improves the evaluation experience. It is lower priority because Story 1 already delivers the core capability.

**Independent Test**: With the Settings modal open, change Space display from Default to Spacious — the Settings modal's own text and spacing visibly increases in real time.

**Acceptance Scenarios**:

1. **Given** the Settings modal is open, **When** the user changes Space display, **Then** the modal's own layout immediately reflects the new density.
2. **Given** the user switches Space display back to Default, **When** they observe the modal, **Then** it returns to the baseline layout instantly.

---

### Edge Cases

- What happens if the persisted Space display value is corrupted or unrecognized? → Fall back silently to "Default".
- What if a user has both a custom table font-size and a Space display preference active simultaneously? → Both apply independently; Space display is a global scale modifier, table font size is a precise numeric override.
- What if the user's OS accessibility settings already enlarge text? → Space display stacks additively; the user is responsible for choosing the level that works for them.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to select a Space display preference from three options: Compact, Default, and Spacious, within the Appearance settings panel.
- **FR-002**: The Space display preference MUST apply a relative text-scale change globally across the application immediately upon selection — no reload required.
- **FR-003**: The Space display preference MUST be persisted across application sessions so it is restored on next launch.
- **FR-004**: The Space display preference MUST default to "Default" for new users or when no persisted value is found.
- **FR-005**: If a persisted Space display value is invalid or unrecognized, the application MUST silently fall back to "Default" without errors.
- **FR-006**: All settings panels (Appearance, Editor, Quick Query, Agent) MUST use a unified section-header pattern: icon + title text, consistent size, weight, and margin below.
- **FR-007**: All settings panels MUST use a unified setting-row pattern: left side contains a primary label and an optional muted description; right side contains the control (select, switch, button group, etc.).
- **FR-008**: All settings panels MUST use a consistent vertical gap between setting rows and between sections.
- **FR-009**: Dividers between sections, where present, MUST have identical style and surrounding spacing across all panels.
- **FR-010**: The three Space display options MUST be presented as a compact button-group control (matching the existing Theme Mode button-group pattern in the Appearance panel).

### Key Entities

- **SpaceDisplayPreference**: A user setting with three possible values — `compact`, `default`, `spacious`. Controls the relative text-scale modifier applied globally to the application. Stored as part of the application configuration alongside existing display preferences (theme mode, table appearance, etc.).
- **SettingsRowPattern**: A visual UI contract (not a data entity) consisting of: left-aligned label block (primary text + optional muted description) and right-aligned control. Used uniformly across all settings panels.
- **SectionHeaderPattern**: A visual UI contract consisting of: icon + heading text at a fixed size/weight with a defined bottom margin. Used at the top of every logical settings section.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All four settings panels (Appearance, Editor, Quick Query, Agent) are visually indistinguishable in terms of section header height, label typography, description typography, row spacing, and control alignment when reviewed side-by-side.
- **SC-002**: Switching Space display from Default to Spacious or Compact produces a perceptible and consistent text-scale change across the application within 100ms of the user's selection.
- **SC-003**: The chosen Space display option survives an application reload — confirmed by selecting a non-default option, reloading, and observing the same option is still active.
- **SC-004**: A developer adding a new settings panel can follow a single, unambiguous visual pattern from the existing panels without making judgment calls about spacing, typography, or control alignment.

## Assumptions

- The Space display setting uses CSS relative font-size keywords (`smaller` for Compact, inherited/root for Default, `larger` for Spacious) applied at a high-level wrapper element so all descendant text scales proportionally.
- "Standardization" does not introduce any new navigation items, panels, or settings beyond those already listed in `SETTINGS_NAV_ITEMS`.
- The existing Theme Mode button-group control in Appearance is the established pattern for multi-option toggle controls; Space display will follow the same visual pattern.
- Persistence of Space display uses the same storage mechanism (`appConfigStore`) already used for theme mode, table appearance, and other settings in this codebase.
- No new settings panel tabs are added by this feature; only existing panels are updated.
