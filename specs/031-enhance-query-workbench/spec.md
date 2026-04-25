# Feature Specification: Query Workbench Reliability

**Feature Branch**: `031-enhance-query-workbench`  
**Created**: 2026-04-23  
**Status**: Draft  
**Input**: User description: "Enhance and fix the query workbench across raw query, quick query, schema loading, tab creation, and table sorting preferences."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Run and Update Queries Reliably (Priority: P1)

As a database user, I want quick query updates and raw SQL execution to behave consistently so I can edit functions, procedures, and parameterized statements without unexpected parser failures.

**Why this priority**: Query execution and update reliability is the core value of the workbench. If users cannot trust update flows or valid SQL comments break execution, the rest of the workspace improvements do not matter.

**Independent Test**: Can be fully tested by editing a function or procedure from quick query, previewing or saving the generated change, and executing raw SQL that contains commented parameter examples. The user should be able to complete those tasks without switching to a fallback editor to avoid errors.

**Acceptance Scenarios**:

1. **Given** a user edits a function or procedure through quick query, **When** the system generates the update statement, **Then** the update flow completes without rejecting a valid change that would execute successfully in the raw SQL editor.
2. **Given** a raw SQL statement contains placeholder-like text inside comments, **When** the user runs the statement, **Then** the parser ignores comment-only placeholders and executes the valid SQL body.
3. **Given** a user is about to save an update from quick query, **When** the user opens the change preview, **Then** the system shows the exact statement that will be submitted and leaves the underlying record unchanged until the user confirms the save.

---

### User Story 2 - Open the Right Workspace Tab Faster (Priority: P2)

As a database user, I want faster tab creation shortcuts so I can open a starter SQL file or the most common workspace views without leaving the tab bar.

**Why this priority**: Opening the right working surface quickly removes friction from frequent database tasks and reduces setup time every time a user starts a new query or navigates to supporting views.

**Independent Test**: Can be fully tested by opening a workspace with an empty or partially populated tab set, using the first-tab SQL shortcut, and using the plus-tab menu to create a raw SQL file, open schema browser, or open instance insight.

**Acceptance Scenarios**:

1. **Given** the first tab is visible, **When** the user clicks the SQL shortcut, **Then** the system opens a raw query tab backed by a reusable starter file named `sample.sql`, creating it only if it does not already exist.
2. **Given** the user opens the plus-tab menu, **When** the user chooses to create a new raw SQL file, **Then** the system creates a uniquely named file using the next available `new-file` pattern and opens it immediately.
3. **Given** the user opens the plus-tab menu, **When** the user chooses schema browser or instance insight, **Then** the selected view opens in a new tab without disrupting the current tab content.

---

### User Story 3 - Understand Metadata and Large Schemas Faster (Priority: P3)

As a database user, I want consistent column type labels, usable schema loading for large multi-schema databases, and controllable null ordering so I can interpret data structures and table results without manual cleanup.

**Why this priority**: These improvements reduce interpretation errors and make large environments usable, but users can still get value from the product before they are delivered.

**Independent Test**: Can be fully tested by browsing metadata from multiple supported database families, loading a workspace that contains many schemas, and changing the global null-order preference from settings or the quick query bar.

**Acceptance Scenarios**:

1. **Given** the same logical database type is surfaced from different metadata views, **When** the user inspects the column details, **Then** the short type label is shown consistently across supported database families.
2. **Given** a database exposes many schemas and takes a long time to enumerate, **When** the user opens schema browsing, **Then** the system keeps the load in progress, communicates that work is continuing, and completes without requiring repeated user retries.
3. **Given** a user chooses a default null-ordering preference, **When** the user opens a table view or quick query sort control, **Then** the chosen preference is available and applied consistently unless the user intentionally changes it for the current view.

### Edge Cases

- If a quick query update generates no effective change, the preview must clearly indicate that no update will be submitted and saving must not produce a misleading success message.
- If a raw SQL statement mixes active bind parameters with commented examples, only placeholders in executable SQL may be treated as parameters.
- If `sample.sql` already exists, the first-tab SQL shortcut must open that existing file instead of creating duplicates.
- If several `new-file` names already exist, the next created raw SQL file must skip collisions and use the next available sequential name.
- If schema loading exceeds typical wait time, the interface must continue to show progress or a waiting state rather than appearing frozen.
- If a database family does not support a requested null-order behavior, the interface must preserve the user preference while clearly showing when the current result cannot apply it.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST let users update functions and procedures from quick query when the resulting statement is valid for the connected database.
- **FR-002**: The system MUST treat valid SQL comments as non-executable content when detecting bind parameters or parsing raw SQL for execution.
- **FR-003**: The system MUST provide a read-only preview of the exact update statement before a quick query save is committed.
- **FR-004**: The system MUST use one maintained set of short type labels so the same database type is displayed consistently across metadata and query-driven views.
- **FR-005**: The system MUST apply the type-label rules across all database families currently supported by the product wherever short type names are shown.
- **FR-006**: The system MUST allow schema loading to continue for large multi-schema databases without requiring the user to restart the load manually during normal wait periods.
- **FR-007**: The system MUST show that schema loading is still active whenever the load duration is long enough that a user could otherwise assume the interface stalled.
- **FR-008**: The system MUST provide an SQL shortcut in the first tab area that opens a starter raw SQL file named `sample.sql` for the current workspace, creating it only when absent.
- **FR-009**: The system MUST provide a plus-tab menu with options to create a new raw SQL file, open schema browser, and open instance insight.
- **FR-010**: The system MUST create new raw SQL files with collision-free names based on the `new-file` pattern and open the selected file immediately after creation.
- **FR-011**: The system MUST allow users to define a global null-ordering preference with the choices unset, nulls first, and nulls last.
- **FR-012**: The system MUST expose the current null-ordering preference in both global settings and the quick query bar.
- **FR-013**: The system MUST preserve existing save, query execution, and tab content until the user explicitly confirms an action that changes them.

### Key Entities _(include if feature involves data)_

- **Query Update Preview**: A read-only representation of the statement that would be submitted by a quick query update, including whether the change is actionable or results in no update.
- **Type Alias Rule Set**: The catalog of short display names used to normalize equivalent column types across supported database families.
- **Schema Load Session**: The active attempt to fetch schemas for a connection, including loading state, progress messaging, and completion or timeout outcome.
- **Workspace SQL File**: A persisted raw SQL document associated with a workspace, including reserved starter names and auto-generated sequential names.
- **Null Ordering Preference**: A user-selectable default that determines how null values should be ordered in table-oriented results when the current database view supports that behavior.

## Assumptions

- The feature applies to the database families already supported by HeraQ at the time of implementation.
- The quick query preview is informational only and does not introduce a separate approval workflow beyond the existing save action.
- Global null-ordering preference establishes the default behavior, while the current view may still allow temporary overrides.
- Existing permissions and connection rules for opening schema browser, instance insight, and query tabs remain unchanged.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of tested valid function and procedure updates that succeed through the raw SQL editor also succeed through the quick query update flow.
- **SC-002**: At least 95% of tested valid raw SQL statements that contain placeholder-like text only inside comments execute without parser rejection.
- **SC-003**: Users can reach a new SQL file, schema browser, or instance insight view from the tab bar in no more than 2 interactions.
- **SC-004**: In acceptance testing across supported database families, the same sampled column types display the same short label in 100% of compared metadata views.
- **SC-005**: For large multi-schema connections used in acceptance testing, users receive visible loading feedback within 5 seconds and can complete schema loading without manual restart within 60 seconds.
- **SC-006**: 100% of tested table and quick query screens expose the selected null-ordering default after the user saves the preference.
