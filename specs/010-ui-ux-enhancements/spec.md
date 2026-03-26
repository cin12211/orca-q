# Feature Specification: UI/UX Enhancements Batch

**Feature Branch**: `010-ui-ux-enhancements`  
**Created**: 2026-03-17  
**Status**: Draft  
**Input**: User description: "UI/UX enhancements batch across connection form, management connections, command palette, what's new, raw query view, and agent screen"

## Overview

A batch of user-facing improvements across six areas of the application: the connection form, management connections view, command palette, what's new panel, raw query view, and agent screen. Each enhancement is independent and scoped to reduce friction, fix visual inconsistencies, and improve discoverability.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connection Form: Show/Hide Password (Priority: P1)

A user filling in the connection form needs to verify the password they typed. Currently, the password field masks input with no way to reveal it, leading to connection failures caused by undetected typos.

**Why this priority**: Security-adjacent usability issue; a typo in a masked password field blocks the user from connecting entirely. Highest user-impact item in the batch.

**Independent Test**: Navigate to the connection form, fill in the password field, and use the toggle control. Verify the field switches between masked and plain-text modes correctly.

**Acceptance Scenarios**:

1. **Given** the connection form is open, **When** the user focuses on the password field, **Then** a show/hide toggle control is visible inside or adjacent to the field.
2. **Given** the password field is masked, **When** the user clicks the toggle, **Then** the password text becomes visible and the toggle reflects the revealed state.
3. **Given** the password is visible, **When** the user clicks the toggle again, **Then** the field returns to masked mode.
4. **Given** the password field is empty, **When** the toggle is clicked, **Then** it still switches state without error.

---

### User Story 2 - Connection Form: SSL/SSH File Inputs with Drag-and-Drop & Descriptions (Priority: P2)

A user configuring SSL certificates or SSH tunnel keys needs to supply file content. Currently, file inputs accept drag-and-drop but there is no visible cue that this is possible, and no description explaining what each field expects.

**Why this priority**: Directly reduces configuration errors and support confusion for advanced connection types.

**Independent Test**: Open the SSL config or SSH tunnel section in the connection form. Verify each file input shows a description and responds visually to a file being dragged over it.

**Acceptance Scenarios**:

1. **Given** the SSL config section is expanded, **When** the user views a file-accepting input field, **Then** a short description is displayed near the field explaining what file type or content is expected.
2. **Given** a file input field is displayed, **When** the user drags a file over it, **Then** the field gives a visual drop target indication (highlight or border change).
3. **Given** the user drops a compatible file onto the field, **Then** the field is populated with the file's content.
4. **Given** the user drops an incompatible or empty file, **Then** the field remains unchanged and shows an inline error message.

---

### User Story 3 - Raw Query View: Space Density Applies to Code Editor (Priority: P3)

A user who changes the application space density setting expects all text-editing areas—including the SQL code editor in the raw query view—to reflect the new density immediately. Currently the code editor ignores this setting.

**Why this priority**: Visual inconsistency that breaks the user's configured layout; affects every raw query user who uses non-default density.

**Independent Test**: Change the space density setting, then open the raw query view and verify the code editor's line height and padding match the selected density.

**Acceptance Scenarios**:

1. **Given** a space density is selected in settings, **When** the user opens the raw query view, **Then** the code editor renders with spacing consistent with the chosen density.
2. **Given** the raw query view is open, **When** the user changes the density setting, **Then** the editor updates to reflect the new density without requiring a page reload.
3. **Given** the default density is active, **When** the user switches to a compact or comfortable density, **Then** the code editor padding and line height change visibly.

---

### User Story 4 - Raw Query View: Consistent Footer Button Heights (Priority: P3)

A user operating the raw query view notices that the "Explain" and "Execute Current" buttons in the footer are not the same height, creating a misaligned toolbar appearance.

**Why this priority**: Visual polish; the footer is a high-frequency interaction area. Low effort, high-visibility fix.

**Independent Test**: Open the raw query view and inspect the footer. Verify that "Explain" and "Execute Current" buttons share the same height and appear aligned.

**Acceptance Scenarios**:

1. **Given** the raw query view footer is visible, **When** the user looks at the "Explain" and "Execute Current" buttons, **Then** both buttons are the same height and are visually aligned.
2. **Given** the window is resized, **When** the footer layout adjusts, **Then** the button heights remain equal.

---

### User Story 5 - Raw Query View: Command+J to Toggle Result Panel (Priority: P3)

A user who frequently switches between writing SQL and reading results wants a keyboard shortcut to minimize/maximize the result panel without reaching for the mouse.

**Why this priority**: Developer-experience improvement with zero friction if unused; high value for power users.

**Independent Test**: Open the raw query view, press Command+J (Mac) or Ctrl+J (other platforms), and verify the result panel toggles between visible and hidden states.

**Acceptance Scenarios**:

1. **Given** the raw query view is focused and the result panel is visible, **When** the user presses Command+J, **Then** the result panel collapses.
2. **Given** the result panel is collapsed, **When** the user presses Command+J, **Then** the result panel reopens to its previous height.
3. **Given** the raw query view is not the active focus, **When** Command+J is pressed, **Then** no toggle occurs.

---

### User Story 6 - Agent: Thread Renaming (Priority: P4)

A user with multiple agent conversation threads needs to identify each thread by a meaningful name. Currently thread names default to the first portion of the first message and cannot be changed, making long thread lists confusing.

**Why this priority**: Productivity and organisation feature for multi-thread users. Does not block any existing functionality.

**Independent Test**: Use an inline action on a thread entry. Verify the user can enter a custom name and it persists after navigating away and returning.

**Acceptance Scenarios**:

1. **Given** a conversation thread exists, **When** the user triggers the rename action, **Then** an inline or modal input appears pre-filled with the current thread name.
2. **Given** the rename input is open, **When** the user types a new name and confirms, **Then** the thread displays the new name throughout the app.
3. **Given** the rename input is open, **When** the user cancels or presses Escape, **Then** the thread name reverts to the previous value.
4. **Given** a thread was renamed, **When** the user navigates away and returns, **Then** the custom name is still displayed.
5. **Given** the user tries to save an empty name, **Then** the rename is rejected and the thread keeps its previous name.

---

### User Story 7 - Agent: Disable Panel Toggles on Agent Screen (Priority: P4)

The agent screen should not allow users to open the bottom panel or the right panel, as they are irrelevant in that context and clutter the layout.

**Why this priority**: Layout correctness; prevents users from accidentally opening irrelevant panels in the agent view.

**Independent Test**: Navigate to the agent screen. Verify that bottom panel and right panel toggle controls are hidden or disabled.

**Acceptance Scenarios**:

1. **Given** the user is on the agent screen, **When** they look for the bottom panel toggle, **Then** the toggle is not visible or is disabled.
2. **Given** the user is on the agent screen, **When** they look for the right panel toggle, **Then** the toggle is not visible or is disabled.
3. **Given** the user navigates away from the agent screen, **When** they open another view, **Then** the panel toggles are functional again.

---

### User Story 8 - Command Palette: Hugeicons for Session Commands (Priority: P5)

A user opening the command palette notices that session-related commands use inconsistent or outdated icons compared to the rest of the application which uses Hugeicons throughout.

**Why this priority**: Visual consistency; low complexity change.

**Independent Test**: Open the command palette, browse session-related command entries, and verify they display Hugeicons-style icons matching the app's icon system.

**Acceptance Scenarios**:

1. **Given** the command palette is open, **When** the user browses session commands, **Then** each command displays an icon from the Hugeicons set.
2. **Given** the icons are rendered, **When** viewed at standard and high-DPI resolutions, **Then** icons appear crisp and correctly sized.

---

### User Story 9 - Command Palette: Instance Info Item (Priority: P5)

A user wants to view details about the current database instance directly from the command palette, without navigating through menus.

**Why this priority**: Discoverability improvement; reduces navigation steps for a common power-user action.

**Independent Test**: Open the command palette, activate the instance info item, and verify the instance detail view opens.

**Acceptance Scenarios**:

1. **Given** the command palette is open, **When** the user searches for or scrolls to the instance info item, **Then** it is listed with a visible icon and label.
2. **Given** the user selects the instance info item, **Then** the instance detail view opens.
3. **Given** no active connection exists, **When** the user activates the instance item, **Then** a clear message indicates there is no active connection.

---

### User Story 10 - Command Palette: What's New Item (Priority: P5)

A user can open the What's New panel directly from the command palette.

**Why this priority**: Discoverability of new features; complements the What's New UI improvements.

**Independent Test**: Open the command palette, find the "What's New" item, and activate it. Verify the What's New panel opens.

**Acceptance Scenarios**:

1. **Given** the command palette is open, **When** the user types "what's new" or browses release-related items, **Then** a "What's New" entry is visible.
2. **Given** the user selects the item, **Then** the What's New panel or view opens.

---

### User Story 11 - What's New: Timeline UI (Priority: P6)

A user viewing the What's New section sees a visual timeline of releases, making the sequence and recency of changes easy to scan.

**Why this priority**: Informational UX improvement; does not affect core functionality.

**Independent Test**: Open the What's New panel and verify that release entries are displayed in a timeline-style layout with dates visible and chronological ordering clear.

**Acceptance Scenarios**:

1. **Given** the What's New panel is open with multiple release entries, **When** the user views it, **Then** entries are displayed in a timeline layout sorted chronologically (newest first).
2. **Given** a release entry is on screen, **When** the user views it, **Then** the release date is clearly shown adjacent to or within the entry.
3. **Given** there is only one release entry, **When** the panel is open, **Then** it still renders correctly in the timeline layout without visual glitches.

---

### User Story 12 - What's New: Reuse Agent Markdown Rendering Style (Priority: P6)

The What's New panel renders markdown content. Currently the rendering style differs from the agent chat, leading to visual inconsistency across formatted text surfaces.

**Why this priority**: Visual consistency; ensures a unified reading experience across markdown surfaces.

**Independent Test**: Compare rendered markdown text in the What's New panel and the agent chat. Verify headings, lists, code blocks, and links share the same visual style.

**Acceptance Scenarios**:

1. **Given** the What's New content contains markdown (headings, lists, code blocks), **When** the panel renders it, **Then** the output visually matches the markdown rendering in the agent chat panel.
2. **Given** the shared markdown style is updated, **When** viewed in both contexts, **Then** both surfaces reflect the change consistently.

---

### User Story 13 - Management Connections: Show host:databaseName in Details Column (Priority: P7)

A user looking at the connections list table wants to quickly identify each connection's target. The "Connection Details" column should show `host:databaseName` for each entry.

**Why this priority**: Read-only display fix; reduces time spent opening each connection to check its target.

**Independent Test**: Open the management connections view and verify each row in "Connection Details" shows `host:databaseName`.

**Acceptance Scenarios**:

1. **Given** the management connections table is visible, **When** the user looks at the "Connection Details" column, **Then** each row shows a value in the format `host:databaseName`.
2. **Given** a connection has no database name configured, **When** it is listed, **Then** the column shows only the host without a trailing colon.

---

### User Story 14 - Raw Query View: Automated Test Coverage (Priority: P8)

As a developer maintaining the raw query view, automated tests must cover primary scenarios so regressions are caught after the view is updated.

**Why this priority**: Quality gate. Ensures the other raw query view fixes (density, button height, shortcut) do not regress.

**Independent Test**: Run the test suite for the raw query module and verify all scenarios below have passing tests.

**Acceptance Scenarios**:

1. **Given** a valid query is executed, **When** results arrive, **Then** the test confirms the result grid is rendered with rows.
2. **Given** an invalid query is submitted, **When** the server returns an error, **Then** the test confirms the error message is displayed to the user.
3. **Given** a query returns no rows (empty SELECT) or is a mutation (INSERT/UPDATE/DELETE), **When** execution completes, **Then** the test confirms a success message is shown without a data grid (e.g., "Query succeeded, no records returned" for DML).
4. **Given** an EXPLAIN query is run, **When** results arrive, **Then** the test confirms the explain plan output is rendered.
5. **Given** a query containing named parameters/variables, **When** executed, **Then** the test confirms the variable prompt or substitution UI appears before execution.
6. **Given** a query with inline variable declarations (variables defined directly in the query text), **When** executed, **Then** the test confirms the query runs with inline values resolved.

---

### Edge Cases

- What happens when a user drags a non-file item (e.g., a URL or plain text snippet) onto an SSL/SSH file input?
- What happens if a renamed thread name exceeds the maximum display length in the sidebar?
- What happens when Command+J is pressed while a modal or popover is open over the raw query view?
- What happens when What's New content contains no markdown — plain text only?
- What happens when no connections exist and the user opens Management Connections?
- What happens if a port number is present in the host — should it be shown in the Connection Details column?

---

## Requirements _(mandatory)_

### Functional Requirements

**Connection Form**

- **FR-001**: The connection form password field MUST provide a toggle control to switch between masked and plain-text display.
- **FR-002**: SSL configuration and SSH tunnel file input fields MUST accept files via drag-and-drop.
- **FR-003**: Each SSL/SSH file input field MUST display a short descriptive label explaining the expected file type or content.
- **FR-004**: Dropping a valid file onto a field MUST populate the field with the file's text content.
- **FR-005**: Dropping an incompatible or empty file MUST leave the field unchanged and display an inline error.

**Management Connections**

- **FR-006**: The "Connection Details" column in the management connections table MUST display values in `host:databaseName` format.
- **FR-007**: If the database name is absent for a connection, the column MUST display only the host.

**Command Palette**

- **FR-008**: Session-related command entries in the command palette MUST use Hugeicons icons.
- **FR-009**: The command palette MUST include an entry for viewing the current database instance; selecting it MUST open the instance detail view.
- **FR-010**: The command palette MUST include a "What's New" entry; selecting it MUST open the What's New panel.

**What's New**

- **FR-011**: The What's New panel MUST render markdown content using the same visual style as the agent chat markdown renderer.
- **FR-012**: Release entries in the What's New panel MUST be displayed in a chronological timeline layout (newest first) with the release date visible per entry.

**Raw Query View**

- **FR-013**: The space density setting selected by the user MUST apply to the code editor in the raw query view.
- **FR-014**: The "Explain" and "Execute Current" buttons in the raw query view footer MUST be the same height and visually aligned.
- **FR-015**: Pressing Command+J (Mac) or Ctrl+J (other platforms) while the raw query view is focused MUST toggle the result panel visibility.
- **FR-016**: The raw query view MUST have automated test coverage for six scenarios: normal query, error query, empty/mutation result, explain query, named variable query, and inline variable query.

**Agent**

- **FR-017**: Each conversation thread in the agent screen MUST expose a rename action accessible without leaving the thread list.
- **FR-018**: A renamed thread MUST persist its custom name across navigation and application restarts.
- **FR-019**: The agent screen MUST hide or disable the bottom panel toggle and the right panel toggle for all users while on that screen.

---

## Assumptions

- The Hugeicons library is already integrated into the project; no new dependency is needed for FR-008.
- The shared markdown renderer used by the agent chat is already extractable as a reusable component or composable; FR-011 reuses it without new third-party libraries.
- "Command+J" maps to Ctrl+J on non-Mac platforms; both bindings refer to the same feature.
- Thread names are stored in the existing thread metadata persistence layer; no new backend API is required for FR-018.
- SSL and SSH file inputs already support drag-and-drop mechanically; the work for FR-002 is adding the visual drag-target indication and description labels (FR-003).
- The Connection Details column port display (if host includes a port) follows whichever format is already used for host display elsewhere in the app.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can verify their connection password without retyping it — the toggle is reachable in a single click and operates without form submission.
- **SC-002**: Users configuring SSL or SSH connections can identify the expected content for every file field by reading the in-context description, without consulting external documentation.
- **SC-003**: The Management Connections table displays host and database name for every connection in a consistent, scannable format without requiring the user to open each record.
- **SC-004**: The space density setting visibly affects the code editor appearance in the raw query view within one setting interaction, consistent with all other layout areas.
- **SC-005**: Footer buttons in the raw query view are uniform in height with no visible misalignment at any supported window size.
- **SC-006**: A user can toggle the raw query result panel using only the keyboard (Command+J / Ctrl+J) with no mouse interaction required.
- **SC-007**: Users can rename any agent thread in two or fewer interactions (e.g., activate rename action → type → confirm).
- **SC-008**: The agent screen layout does not expose panel toggle controls that are irrelevant to the agent workflow.
- **SC-009**: All six raw query view test scenarios have passing automated tests and the suite runs without manual intervention.
- **SC-010**: Markdown content in the What's New panel and in agent chat renders with the same visual appearance (headings, list styles, code block styles, link styles).
