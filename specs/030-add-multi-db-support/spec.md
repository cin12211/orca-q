# Feature Specification: Expanded Database Type Support

**Feature Branch**: `030-add-multi-db-support`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "i want to support my app can support db type for mysql , mariadb, sqlite3 file (only for app version), oracledb"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect to MySQL and MariaDB (Priority: P1)

A user wants to manage a MySQL or MariaDB database from the app. They can choose the database type, enter connection information, confirm that the connection works, save it, reopen it later, and immediately use the app's core exploration and query workflows.

**Why this priority**: MySQL and MariaDB are common relational databases, and the app already shows signs of partial support. Turning this into a working end-user flow delivers immediate value to a broad set of users.

**Independent Test**: Create one MySQL connection and one MariaDB connection, test each connection, save both, reopen them, and confirm that a user can browse available structures or run a simple query from each saved connection.

**Acceptance Scenarios**:

1. **Given** a user is creating a new connection, **When** they choose MySQL or MariaDB, **Then** the app shows the connection inputs relevant to that database type and allows the user to test the connection.
2. **Given** valid MySQL or MariaDB connection details, **When** the user tests and saves the connection, **Then** the connection is stored and appears as a reusable connection in the app.
3. **Given** invalid credentials or an unreachable MySQL or MariaDB server, **When** the user tests or saves the connection, **Then** the app shows a clear failure message and does not treat the connection as usable.
4. **Given** a saved MySQL or MariaDB connection, **When** the user opens it later, **Then** the app allows the user to browse available structures and run direct queries.
5. **Given** a saved MySQL or MariaDB connection, **When** the user edits or deletes it, **Then** the connection list reflects the change and deleted entries are no longer reusable.
6. **Given** a connected MySQL or MariaDB source, **When** the user opens a secondary feature that is not available for that database type, **Then** the app clearly explains the limitation instead of exposing broken behavior.

---

### User Story 2 - Connect to Oracle Databases (Priority: P2)

A user works with an Oracle database and wants to manage it through the same connection flow they already use for other supported databases. They can create a connection, validate it, save it, reopen it later, and use the core database workflows without switching to a different tool.

**Why this priority**: Oracle support expands the app into environments where users often need a single tool to work across multiple database vendors.

**Independent Test**: Create an Oracle connection, validate it, save it, reopen it, and confirm that a user can browse available structures or run a simple query.

**Acceptance Scenarios**:

1. **Given** a user is creating a new connection, **When** they choose Oracle and provide valid connection information, **Then** the app confirms the connection can be established and allows the user to save it.
2. **Given** a saved Oracle connection, **When** the user opens it later, **Then** the app allows the user to browse available structures and run direct queries.
3. **Given** required Oracle connection information is missing or invalid, **When** the user tests or saves the connection, **Then** the app identifies the problem before creating an unusable saved connection.

---

### User Story 3 - Open a Local SQLite File in the Desktop App (Priority: P3)

A desktop user wants to inspect and query a local SQLite database file directly from the app. They can choose SQLite as the database type, select a local file, test the connection, save it, and reopen it later. Users outside the desktop app are not offered a broken local-file workflow.

**Why this priority**: SQLite file access is valuable for local and offline workflows, but it is intentionally limited to the desktop app where local file access is available.

**Independent Test**: In the desktop app, create a SQLite connection from a local database file, validate it, save it, reopen it, and confirm that a user can browse available structures or run a simple query. In a non-desktop runtime, confirm the SQLite file option is unavailable or clearly marked unsupported.

**Acceptance Scenarios**:

1. **Given** the user is in the desktop app, **When** they choose SQLite, **Then** the app allows them to select a local database file and test it before saving.
2. **Given** a valid saved SQLite file connection in the desktop app, **When** the user opens it later, **Then** the app reconnects to the file and allows the user to browse available structures and run direct queries.
3. **Given** the app is running in a runtime that cannot access local files, **When** the user creates a new connection, **Then** the SQLite file option is unavailable or clearly identified as unsupported in that runtime.
4. **Given** a previously selected SQLite file is missing, moved, locked, or unreadable, **When** the user tests or opens that connection, **Then** the app explains the problem and preserves the saved connection record without corrupting other data.

### Edge Cases

- A user pastes a MySQL, MariaDB, or Oracle connection string that is incomplete or conflicts with other entered connection details.
- A user edits a saved connection and changes it from one database type to another, leaving stale values that no longer apply.
- A saved SQLite connection points to a file that has been renamed, deleted, moved, or had its permissions changed since the last successful use.
- A connection succeeds, but a secondary feature is not yet available for that database type.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST present MySQL, MariaDB, Oracle, and SQLite as supported database choices during connection creation, subject to platform availability rules.
- **FR-002**: For MySQL, MariaDB, and Oracle, users MUST be able to provide connection information using either a connection string or structured connection details.
- **FR-003**: For SQLite in the desktop app, users MUST be able to choose a local database file instead of entering server-based connection details.
- **FR-004**: System MUST validate that all required connection information for the selected database type is present before testing or saving the connection.
- **FR-005**: System MUST allow users to test a connection before saving it and MUST provide a clear success or failure result.
- **FR-006**: System MUST allow users to save, reopen, edit, and delete connection profiles for MySQL, MariaDB, Oracle, and desktop SQLite connections.
- **FR-007**: Successfully connected MySQL, MariaDB, Oracle, and desktop SQLite sources MUST support the app's primary database workflows: opening the connection, viewing available structures, and running direct queries.
- **FR-008**: System MUST distinguish MySQL and MariaDB as separate user-selectable database types in connection setup and saved connection metadata.
- **FR-009**: SQLite file connections MUST only be available in the desktop app version and MUST not appear as usable options in runtimes that cannot access local files.
- **FR-010**: When a connection cannot be established, the system MUST show an actionable error that reflects the selected database type or file state.
- **FR-011**: When a connected database type does not support a secondary feature, the system MUST clearly communicate that limitation instead of exposing broken or misleading interactions.
- **FR-012**: Existing connection flows and saved connections for already supported database types MUST continue working without requiring users to recreate them.

### Key Entities _(include if feature involves data)_

- **Connection Profile**: A saved database entry that includes a user-visible name, selected database type, access method, connection details or file reference, and current validation state.
- **Database Type Option**: A user-selectable database engine with its own connection expectations, availability rules, and user-facing label.
- **Data Source Capability**: The set of workflows the app can perform for a connected source, including core supported actions and any clearly communicated limitations.
- **SQLite File Source**: A local database file selected in the desktop app, including the chosen file reference and its current accessibility state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create, validate, and save a MySQL, MariaDB, or Oracle connection in under 3 minutes using the standard connection flow.
- **SC-002**: Desktop users can connect to a valid SQLite database file in under 2 minutes without leaving the app to configure extra tooling.
- **SC-003**: At least 90% of acceptance-test users can successfully browse available structures or run a simple query on one of the newly supported database types on their first attempt.
- **SC-004**: In acceptance testing, 100% of non-desktop runtimes prevent users from starting a SQLite file connection flow.
- **SC-005**: 100% of previously supported connection types can reopen an existing saved connection and run a simple query after release without requiring the user to recreate that connection.

## Assumptions

- "Primary database workflows" for this feature mean creating, testing, saving, and reopening a connection, then browsing available structures and running direct queries.
- Desktop app users are able to grant access to local database files stored on their device.
- MariaDB users expect a dedicated selection option even when the connection experience is similar to MySQL from a user perspective.

## Out of Scope

- Adding any new database types beyond MySQL, MariaDB, Oracle, and desktop SQLite.
- Delivering every advanced database-administration feature for each new database type in the first release.
- Supporting SQLite file connections in runtimes that cannot access local files.
- Automatic migration or conversion between database engines.
