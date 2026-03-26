# Feature Specification: Connection Form E2E Tests (SSH + SSL)

**Feature Branch**: `003-connection-form-e2e`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "E2E Playwright tests for connection creation using form input with SSH tunnel and SSL configuration support"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Form Tab Navigation & Basic Field Rendering (Priority: P1)

A user opens the Add Connection wizard, advances to step 2, and switches from the default "Connection String" tab to the "Connection Form" tab. They verify that all required fields (Host, Port, Username, Password, Database, Connection Name) are visible and empty by default.

**Why this priority**: This is the entry point for form-based connection creation. Every other user story depends on this tab being navigable and fields being rendered correctly.

**Independent Test**: Can be fully tested by opening the modal, clicking Next, clicking "Connection Form" tab, and asserting all field labels and inputs are present — delivers confidence that the UI surface is correct.

**Acceptance Scenarios**:

1. **Given** the Add Connection wizard is open on step 2, **When** the user clicks the "Connection Form" tab, **Then** fields for Host, Port, Username, Password, and Database are visible.
2. **Given** the form tab is active, **When** no data has been entered, **Then** all credential fields are empty and the Test / Create buttons are disabled.
3. **Given** the form tab is active, **When** the user inspects the Port field, **Then** it shows the correct default placeholder for the selected database type (e.g., 5432 for PostgreSQL).

---

### User Story 2 — Complete Form-Based Connection Creation (Priority: P1)

A user fills in all required connection fields (Connection Name, Host, Port, Username, Password, Database) using the form tab and creates a connection. The newly created connection appears in the connection list.

**Why this priority**: Core happy-path scenario — verifies the form-based flow produces a persistent, working connection record.

**Independent Test**: Can be fully tested by filling the form, clicking Create, and asserting the new connection card appears in the list.

**Acceptance Scenarios**:

1. **Given** all required fields are filled, **When** the user clicks Create, **Then** the modal closes and the new connection appears in the connection list.
2. **Given** only some required fields are filled (e.g., missing Database), **When** the user attempts to click Create or Test, **Then** both buttons remain disabled.
3. **Given** all required fields are filled, **When** the user clicks Test before creating, **Then** a status indicator displays either a success or error result.

---

### User Story 3 — SSL Configuration Expansion & Field Entry (Priority: P2)

A user expands the "SSL Configuration" accordion on the connection form tab, enables SSL, selects an SSL mode, and optionally pastes certificate content into the CA Certificate, Client Certificate, and SSL Key fields.

**Why this priority**: SSL is a critical security requirement for production database connections. Testing the accordion toggle and field entry ensures the SSL surface is usable.

**Independent Test**: Can be fully tested without a live database — enable SSL toggle, select a mode, and assert the certificate text areas appear and accept input.

**Acceptance Scenarios**:

1. **Given** the SSL Configuration accordion is collapsed, **When** the user clicks it, **Then** the accordion expands and shows the "Enable SSL" toggle.
2. **Given** SSL is disabled (toggle off), **When** the user checks the SSL section, **Then** SSL mode and certificate fields are not visible.
3. **Given** the user enables SSL (toggle on), **When** the section renders, **Then** an SSL Mode selector and the CA Certificate, Client Certificate, and SSL Key text areas are all visible.
4. **Given** SSL is enabled, **When** the user selects "require" from the SSL Mode dropdown, **Then** the selected value is reflected in the dropdown.
5. **Given** SSL is enabled, **When** the user pastes a certificate string into the CA Certificate field, **Then** the field retains the pasted content.

---

### User Story 4 — SSH Tunnel Configuration Expansion & Field Entry (Priority: P2)

A user expands the "SSH Tunnel" accordion, enables the "Over SSH" toggle, and fills in SSH server details (host, port, username, password). They optionally enable SSH key authentication and paste a private key.

**Why this priority**: SSH tunnels are commonly required for connecting to databases behind firewalls. Testing the SSH accordion ensures the feature is functional.

**Independent Test**: Can be fully tested without a live SSH server — enable the toggle, fill fields, and assert input persistence.

**Acceptance Scenarios**:

1. **Given** the SSH Tunnel accordion is collapsed, **When** the user clicks it, **Then** the accordion expands and shows the "Over SSH" toggle.
2. **Given** SSH is disabled (toggle off), **When** the user checks the SSH section, **Then** SSH host/port/user/password fields are not visible.
3. **Given** the user enables "Over SSH", **When** the section renders, **Then** Server, Port, User, and Password fields appear.
4. **Given** SSH is enabled, **When** the user fills SSH host as "ssh.example.com" and port as "22", **Then** those values are retained in the fields.
5. **Given** SSH is enabled, **When** the user checks "SSH Key Authentication", **Then** a Private Key text area appears.
6. **Given** SSH key auth is enabled, **When** the user pastes a private key string, **Then** the textarea retains the content.

---

### User Story 5 — Combined Form + SSL + SSH: Full Flow (Priority: P3)

A user fills in all connection form fields, enables both SSL and SSH tunneling with valid-looking configuration, then clicks Test Connection. A status message indicates whether the connection attempt succeeded or failed.

**Why this priority**: This verifies the combined configuration surface works end-to-end. Lower priority because it depends on a live database environment.

**Independent Test**: The UI portion (form renders correctly with all sections filled) can be tested without a real database. The Test Connection result requires the `PG_CONNECTION`-equivalent env vars for SSH/SSL.

**Acceptance Scenarios**:

1. **Given** form fields, SSL, and SSH are all configured, **When** the user clicks Test, **Then** the Test button shows a loading indicator while testing.
2. **Given** a valid combined configuration, **When** the test completes successfully, **Then** a success status message is displayed.
3. **Given** an invalid configuration (wrong host), **When** the test completes with an error, **Then** an error status message is displayed.

---

### Edge Cases

- What happens when the user enables SSH but leaves required SSH fields empty — does the Test button remain disabled or does it attempt the connection?
- What happens when the user pastes an invalid certificate format into the SSL CA field — is there client-side validation or is it accepted as-is?
- What happens when the user switches from "Connection Form" tab back to "Connection String" tab — are form values preserved?
- What happens when the user navigates Back to step 1 and returns to step 2 — are previously entered form values cleared or preserved?
- How does the form behave when Port field contains non-numeric input?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to switch to the "Connection Form" tab in step 2 of the Add Connection wizard.
- **FR-002**: The form tab MUST display fields for Connection Name, Host, Port, Username, Password, and Database.
- **FR-003**: The Test and Create buttons MUST remain disabled until all required fields (Connection Name, Host, Port, Username, Database) are filled.
- **FR-004**: The Port field MUST display a database-appropriate placeholder (e.g., 5432 for PostgreSQL, 3306 for MySQL).
- **FR-005**: Users MUST be able to expand the "SSL Configuration" accordion and toggle SSL on/off.
- **FR-006**: When SSL is enabled, users MUST be able to select an SSL Mode and enter CA Certificate, Client Certificate, and SSL Key content.
- **FR-007**: Users MUST be able to expand the "SSH Tunnel" accordion and toggle "Over SSH" on/off.
- **FR-008**: When SSH is enabled, users MUST be able to enter SSH Server, Port, Username, and Password.
- **FR-009**: When SSH Key Authentication is enabled, users MUST be able to paste a private key into the Private Key text area.
- **FR-010**: After successfully creating a connection via the form, the new connection record MUST appear in the connection list for the workspace.
- **FR-011**: The Test Connection button MUST display a loading state while a connection test is in progress.
- **FR-012**: A clear success or error status message MUST be displayed after a Test Connection attempt completes.

### Key Entities

- **Connection**: A named database connection record belonging to a workspace, created via either connection string or form-based input, with optional SSH and SSL configuration.
- **ConnectionFormData**: The structured field set collected from the form tab — host, port, username, password, database, plus nested SSH and SSL config objects.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All form field inputs (Connection Name, Host, Port, Username, Password, Database) render and accept input within the form tab — verified by 100% of UI-only tests passing without a live database.
- **SC-002**: The SSL accordion expands, the toggle enables SSL fields, and all three certificate text areas accept multi-line input — verified by dedicated SSL UI tests.
- **SC-003**: The SSH accordion expands, the toggle reveals SSH credential fields, SSH Key Authentication checkbox reveals the private key textarea — verified by dedicated SSH UI tests.
- **SC-004**: Test and Create buttons are disabled when required fields are incomplete and enabled once all required fields are filled — verified by button state assertion tests.
- **SC-005**: A complete connection created via the form appears in the connection list immediately after modal close — verified by the full happy-path test.
- **SC-006**: Test Connection produces a visible success message within 30 seconds when given a valid database host, or a visible error message when given an unreachable host — verified by credential-dependent tests gated behind environment variables.

## Assumptions

- Tests are written for the Playwright browser E2E framework already configured in `playwright.config.ts` (Feature 002).
- A workspace must exist before the connection modal can be opened; tests create a workspace in `beforeEach` or reuse the existing Page Object pattern from Feature 002.
- SSL and SSH UI tests (accordion expansion, field entry) require no live database or SSH server — they verify UI rendering only.
- Full Test Connection tests that verify success/error responses require environment variables (`PG_CONNECTION` or equivalent) and are gated with `test.skip`.
- The "Connection Form" tab is the secondary tab (default is "Connection String"); switching to it is an explicit user action.
- Port field accepts string input in the UI (the underlying form model handles type coercion).
- SSH key drag-and-drop file upload is a separate interaction not covered by this spec — only manual text-paste is tested.
- SSL certificate drag-and-drop file upload is excluded for the same reason.
