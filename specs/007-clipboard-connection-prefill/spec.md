# Feature Specification: Clipboard Connection String Pre-fill

**Feature Branch**: `007-clipboard-connection-prefill`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "in create connection i want to enhance check in clipboard of user have connection string and pre-fill form, use lib https://www.npmjs.com/package/connection-string"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Auto-detect clipboard connection string on modal open (Priority: P1)

A developer copies a connection string (e.g., `postgresql://user:pass@localhost:5432/mydb`) from their cloud provider dashboard or documentation. They open the "Create Connection" modal and the app automatically detects the valid connection string in their clipboard, pre-fills the Connection String field and switches to the "Connection String" tab, and shows a dismissible banner confirming that the clipboard content was used.

**Why this priority**: This is the core value of the feature — zero manual re-typing when a valid connection string is already in the clipboard. It eliminates the most common friction point.

**Independent Test**: Copy a valid PostgreSQL connection string to clipboard → open Create Connection modal → verify the Connection String tab is active, the field is pre-filled with the clipboard value, and a confirmation notice is visible.

**Acceptance Scenarios**:

1. **Given** a valid connection string is in the clipboard, **When** the Create Connection modal opens, **Then** the Connection String tab becomes active and the connection string field is pre-filled with the clipboard content.
2. **Given** the modal pre-filled from clipboard, **When** the user clicks the confirmation banner's dismiss button, **Then** the banner disappears and the pre-filled value remains.
3. **Given** the modal pre-filled from clipboard, **When** the user switches to the "Connection Form" tab, **Then** individual host/port/user/password/database fields are automatically populated by parsing the pre-filled connection string.

---

### User Story 2 - Graceful fallback when clipboard is empty or invalid (Priority: P2)

A developer opens the "Create Connection" modal but their clipboard contains plain text, a URL unrelated to databases, or is empty. The modal opens normally in its default state without any pre-fill and without showing any error to the user.

**Why this priority**: The feature must degrade gracefully — users who don't have a connection string in their clipboard should experience no change in their workflow.

**Independent Test**: Ensure clipboard contains non-connection-string text → open modal → verify it opens in its default state with no pre-fill notice and no error alert.

**Acceptance Scenarios**:

1. **Given** the clipboard is empty, **When** the modal opens, **Then** no pre-fill occurs and no notice banner is shown.
2. **Given** the clipboard contains a non-database string (e.g., "hello world"), **When** the modal opens, **Then** no pre-fill occurs and no error is displayed.
3. **Given** the clipboard read permission is denied by the browser/OS, **When** the modal opens, **Then** the modal opens normally and a silent fallback occurs (no crash, no error banner).

---

### User Story 3 - Paste button to manually trigger clipboard read (Priority: P3)

A user already has the modal open and then copies a connection string to their clipboard. Rather than closing and reopening, they can click a "Paste from clipboard" button near the Connection String field to trigger the clipboard check on demand.

**Why this priority**: The auto-detect only runs on modal open. This story ensures users who copy the connection string after opening the modal can also benefit from the feature.

**Independent Test**: Open modal with no clipboard content → copy a valid connection string → click the "Paste from clipboard" button → verify the field is pre-filled and parsed.

**Acceptance Scenarios**:

1. **Given** the modal is open and the clipboard has been updated with a valid connection string, **When** the user clicks "Paste from clipboard", **Then** the connection string field is populated and fields are parsed.
2. **Given** the user clicks "Paste from clipboard" and clipboard is empty, **Then** no change occurs and a brief inline notice indicates nothing was found.

---

### Edge Cases

- What happens when the clipboard contains a partially valid connection string that can be parsed but is missing required fields (e.g., no database name)? → Pre-fill what can be parsed, leave missing fields empty, show validation errors normally.
- What happens when clipboard access is denied mid-session (permission revoked)? → The "Paste from clipboard" button silently fails without crashing; a brief user-friendly message explains access was denied.
- What happens when the modal is used in "Edit Connection" mode? → The auto-detect on open is suppressed; the existing connection data takes precedence. The manual "Paste from clipboard" button remains available.
- What happens if the connection string is very long or malformed in an unexpected way? → Parsing is attempted; if it fails completely, treat it as an invalid/unrecognized format and do not pre-fill.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST read the user's clipboard content when the Create Connection modal opens (Step 2 — connection details).
- **FR-002**: System MUST validate whether the clipboard content is a recognizable database connection string format (PostgreSQL, MySQL, SQLite, MongoDB, etc.).
- **FR-003**: System MUST pre-fill the Connection String field and switch to the Connection String tab when a valid connection string is detected.
- **FR-004**: System MUST parse the connection string into individual components (host, port, username, password, database) and also populate the Connection Form tab fields accordingly.
- **FR-005**: System MUST display a dismissible notice/banner when pre-fill from clipboard occurs, indicating the source of the data.
- **FR-006**: System MUST handle clipboard read failures (permission denied, empty clipboard, incompatible format) gracefully without errors or UI disruption.
- **FR-007**: System MUST provide a manual "Paste from clipboard" trigger on the Connection String field for users who copy their string after the modal is open.
- **FR-008**: System MUST suppress auto-detection when the modal is in "Edit Connection" mode to avoid overwriting existing data.
- **FR-009**: System MUST support all database types already supported by the connection form (PostgreSQL, MySQL, SQLite, and any others defined in `databaseSupports`).
- **FR-010**: System MUST use the `connection-string` npm library for parsing clipboard content into structured connection data.

### Key Entities

- **Connection String**: A URI-format string (e.g., `postgresql://user:pass@host:5432/db`) representing a full database connection. Parsed into protocol, host, port, user, password, and database name.
- **Clipboard Content**: Raw text obtained from the system clipboard. May or may not be a valid connection string.
- **Connection Form Data**: The structured set of fields (host, port, username, password, database, SSL, SSH) populated from either manual input or a parsed connection string.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users with a valid connection string in clipboard complete connection setup in under 30 seconds, compared to ~2 minutes of manual typing.
- **SC-002**: 100% of supported connection string formats (postgresql, mysql, sqlite, mongodb) are correctly detected and parsed into form fields.
- **SC-003**: Zero unhandled errors or UI crashes occur when clipboard is empty, access is denied, or content is not a connection string.
- **SC-004**: The pre-fill banner dismissal works on first click with no residual UI artifacts.
- **SC-005**: When the modal is in Edit mode, no clipboard auto-detection occurs — existing connection data is always preserved.
