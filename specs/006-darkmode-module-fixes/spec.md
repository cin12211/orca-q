# Feature Specification: Dark Mode — Module-level Fixes (ERD, Tables, Raw Query)

**Feature Branch**: `006-darkmode-module-fixes`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "ensure all module can apply darkmode light mode perfect — check ERD, Dynamic table, QuickQueryTable, TabViewItem, Raw-query module (raw-query-editor, raw-query result-tab still not working dark mode)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - AG Grid Tables Render Correctly in Dark Mode (Priority: P1)

A user switches the app to dark mode. The data tables (QuickQuery table, DynamicTable, Raw Query result table) render with dark backgrounds, light cell text, legible alternating row stripes, and readable header rows — with no white, grey-100, or black-on-dark-background colors.

**Why this priority**: Tables are the primary data surface in the app. If they break in dark mode, the core value of the product is unusable.

**Independent Test**: Switch to dark mode → open any database table in QuickQuery → verify the table header, rows, alternating stripe, and cell text all appear correctly.

**Acceptance Scenarios**:

1. **Given** dark mode is active, **When** the QuickQueryTable renders, **Then** cell text is light-colored and readable against a dark background.
2. **Given** dark mode is active, **When** the DynamicTable renders, **Then** alternating row stripes use dark-appropriate subtle contrast, not `var(--color-neutral-100)` (a light grey).
3. **Given** dark mode is active, **When** the table header renders, **Then** header background is dark and header text is readable.
4. **Given** light mode is active, **When** the tables render, **Then** they still appear exactly as before (no regression).

---

### User Story 2 - Raw Query Result Tabs Work in Dark Mode (Priority: P2)

A user switches to dark mode and executes a query in the Raw Query editor. All result tabs — Error, Agent (AI assist), Explain, Info, Raw — display their content with correct dark backgrounds, no light-only hardcoded colors, and no invisible text.

**Why this priority**: The Raw Query editor is a primary feature. Result feedback (errors, explain plans) is useless if unreadable in dark mode.

**Independent Test**: Switch to dark mode → run an intentionally failing query in Raw Query → view the Error tab → verify the error highlight and message are readable with correct dark colors.

**Acceptance Scenarios**:

1. **Given** dark mode is active and a query error occured, **When** the Error result tab renders, **Then** the error highlight in the query preview uses a dark-appropriate red tint, not `rgba(239, 68, 68, 0.2)` which is invisible on dark backgrounds.
2. **Given** dark mode is active, **When** the Agent (AI) result tab renders prose content with code blocks, **Then** code blocks are dark-themed, not hardcoded `bg-gray-900` on a potentially conflicting background.
3. **Given** dark mode is active, **When** the Explain timeline chart renders, **Then** tree connector symbols are readable using muted foreground color, not `text-neutral-400`.

---

### User Story 3 - ERD Diagram Nodes Work in Dark Mode (Priority: P3)

A user views an Entity-Relationship Diagram in dark mode. Column icon colors (key, nullable diamond, link icons) render with appropriate muted tones rather than hardcoded gray values.

**Why this priority**: The ERD module is a secondary feature but column icons being invisible in dark mode creates confusion about column types.

**Independent Test**: Switch to dark mode → navigate to the ERD view → verify foreign key, nullable, and link icons on table nodes are visible.

**Acceptance Scenarios**:

1. **Given** dark mode is active, **When** the ERD table nodes render, **Then** column type icons (key, diamond, link) are visible using muted foreground tones.
2. **Given** light mode is active, **When** the ERD table nodes render, **Then** icons are still visible with appropriate gray tones.

---

### Edge Cases

- What happens if the color mode changes while a table is open (grid still mounted)? → The AG Grid theme must react to color mode change dynamically without requiring a full page reload.
- What if a user has an older stored preference before `classSuffix: ''` was added? → The app defaults to light mode as a fallback (handled by `@nuxtjs/color-mode`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: AG Grid tables MUST dynamically switch between a light and dark color scheme when the global theme mode changes.
- **FR-002**: Alternating row stripe colors in AG Grid tables MUST adapt for both light and dark modes.
- **FR-003**: AG Grid cell text color MUST be controlled by the theme's foreground color, not hardcoded to `var(--color-black)`.
- **FR-004**: The Raw Query Error tab error-highlight decoration MUST use a color that is visible in dark mode.
- **FR-005**: The Raw Query Agent tab prose code blocks MUST use colors that are compatible with dark mode.
- **FR-006**: The Explain timeline tree connector text MUST use a semantic muted foreground color, not a hardcoded neutral gray.
- **FR-007**: All changes MUST be backward-compatible — light mode MUST render without visual regression.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero visible white backgrounds or black-on-dark text in the identified components when dark mode is active.
- **SC-002**: AG Grid table theme switches within 300ms of a global theme mode change with no page reload required.
- **SC-003**: All existing light-mode visual behavior is preserved — no layout shifts, no color changes in light mode.

## Assumptions

- `@nuxtjs/color-mode` with `classSuffix: ''` is already configured (from feature 005), so `.dark` is added to `<html>` when dark mode is active.
- AG Grid v33+ supports `colorSchemeDark` and `colorSchemeLight` parts via `withPart()`.
- The AG Grid `themeBalham` base theme accepts dynamic `colorScheme` switching via a computed reactive theme object.

## Out of Scope

- Custom ERD canvas SVG edge color theming (edges use CSS vars already).
- AG Grid chart/sparkline theming.
- Changes to the code editor (Monaco/CodeMirror) theme, which is a separate, independent setting.

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

_Example of marking unclear requirements:_

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities _(include if feature involves data)_

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]
