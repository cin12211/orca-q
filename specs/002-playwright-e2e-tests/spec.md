# Feature Specification: Playwright Browser E2E Tests — Workspace & Connection Flow

**Feature Branch**: `002-playwright-e2e-tests`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "use playwright MCP to create end-to-end browser tests for the workspace and connection full flow — create workspace, add connection, open workspace with connection"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Workspace List Page Loads and Empty State Renders (Priority: P1)

A user navigates to the root URL (`/`) of the application. The workspace list page loads with either the empty-state message ("There's no workspaces") and a "New Workspace" button, or a grid of existing workspace cards when workspaces exist.

**Why this priority**: This is the application entry point. Browser-level confirmation that the page loads at all — with correct DOM structure — is the first gate for every downstream user flow.

**Independent Test**: Can be fully tested by navigating to `/` and asserting visible text or button presence. No authentication or database required.

**Acceptance Scenarios**:

1. **Given** a fresh browser session with no persisted workspaces, **When** the user navigates to `/`, **Then** the heading or text "There's no workspaces" is visible on the page.
2. **Given** a fresh browser session with no persisted workspaces, **When** the user navigates to `/`, **Then** a "New Workspace" button is visible and clickable.
3. **Given** any browser session, **When** the user navigates to `/`, **Then** the page title or app logo renders within 5 seconds without a JavaScript error.

---

### User Story 2 — Create a Workspace via Modal (Priority: P1)

A user clicks "New Workspace", fills in a workspace name in the modal dialog, and submits. The modal closes and the new workspace card appears in the grid. This is the core create-workspace happy path.

**Why this priority**: Without workspace creation, the application cannot be used at all. This is the first real user action.

**Independent Test**: Can be fully tested by clicking "New Workspace", typing a name, submitting, and asserting a workspace card with that name is now visible.

**Acceptance Scenarios**:

1. **Given** the workspace list is empty, **When** the user clicks "New Workspace" and the modal opens, **Then** the modal contains a name input field and a submit button.
2. **Given** the modal is open, **When** the user types "My Test Workspace" in the name field and clicks the submit button, **Then** the modal closes.
3. **Given** the modal has been submitted with a valid name, **When** the workspace list re-renders, **Then** a card with the text "My Test Workspace" is visible in the grid.
4. **Given** a workspace card exists, **When** the page is observed, **Then** the card shows the workspace name and an icon.

---

### User Story 3 — Search / Filter Workspaces (Priority: P2)

A user with multiple workspaces on the list page types in the search box. The visible workspace cards filter to match the query. Clearing the search restores all cards.

**Why this priority**: Search is a key usability feature for users with many workspaces. Browser tests confirm debounce behavior visually.

**Independent Test**: Can be tested by creating two workspaces with distinct names, then asserting only the matching card is visible after typing in the search box.

**Acceptance Scenarios**:

1. **Given** two workspaces with different names are visible, **When** the user types the name of one workspace in the search input, **Then** only the matching workspace card remains visible.
2. **Given** the search input has a query, **When** the user clears the input, **Then** all workspace cards become visible again.
3. **Given** the search input has a query that matches no workspace, **When** the page re-renders, **Then** the empty-state message becomes visible.

---

### User Story 4 — Open Connection Management for a Workspace (Priority: P1)

A user clicks on a workspace card (or its "Open" action), the connection management modal opens for that workspace. The modal displays a "Management Connections" heading and an "Add Connection" button.

**Why this priority**: This is the entry point to database connection management — the bridge between workspaces and actual query use.

**Independent Test**: Can be tested by creating a workspace, clicking on it, and asserting the connection modal title and "Add Connection" button are visible.

**Acceptance Scenarios**:

1. **Given** a workspace card is visible, **When** the user clicks to open the workspace, **Then** a modal or panel with heading "Management Connections" appears.
2. **Given** the connection management modal is open, **When** the user observes the modal, **Then** an "Add Connection" button is visible.
3. **Given** the connection management modal is open with no connections, **When** the user observes the list, **Then** an empty state or "no connections" indicator is visible.

---

### User Story 5 — Add a Connection (Step 1: Database Type Selection) (Priority: P1)

Inside the connection management modal, the user clicks "Add Connection". Step 1 of the wizard appears, showing available database type cards (PostgreSQL, MySQL, etc.). The user selects PostgreSQL and clicks Next to advance to step 2.

**Why this priority**: This is the first half of the add-connection user journey. Without it, no step-2 configuration can be tested.

**Independent Test**: Can be tested by navigating to connection modal → clicking "Add Connection" → asserting database type cards render → clicking "PostgreSQL" → asserting step 2 loads.

**Acceptance Scenarios**:

1. **Given** the connection modal is open, **When** the user clicks "Add Connection", **Then** a "select database type" step appears with at least one database type option.
2. **Given** step 1 is showing, **When** the user clicks the "PostgreSQL" option, **Then** it becomes visually selected (highlighted or checked).
3. **Given** a database type is selected, **When** the user clicks "Next" or "Continue", **Then** step 2 (credential form) appears.

---

### User Story 6 — Add a Connection (Step 2: Credentials & Test) (Priority: P2)

On step 2, the user sees form fields for connection name, host, port, username, password, and database (or a connection string input). They fill in credentials and click "Test Connection", which shows a success or failure status. On success, they save the connection.

**Why this priority**: This completes the add-connection journey. Verifies that the credential form renders correctly and the test-connection status feedback is visible.

**Independent Test**: Can be tested using a pre-configured connection string from environment variables. If not set, the test asserts the connection failure state is shown without crashing.

**Acceptance Scenarios**:

1. **Given** step 2 is showing, **When** the user observes the form, **Then** a connection name input and at least one credential field (host or connection string) are visible.
2. **Given** step 2 with a connection string input method selected, **When** the user enters a valid (or invalid) connection string and clicks "Test Connection", **Then** a test-result indicator (success or error) becomes visible.
3. **Given** the connection test has run, **When** the user clicks "Save" or "Connect", **Then** the connection modal closes and the connection appears in the connections list.

---

### Edge Cases

- What happens when the browser navigates directly to `/` with no prior state? → Empty workspace state renders correctly, no JS crash.
- What happens when the user clicks "New Workspace" and immediately closes the modal without filling a name? → Modal closes without creating any workspace.
- What happens when the workspace name is very long (100+ characters)? → The card truncates the text gracefully without overflowing the card bounds.
- What happens when the search box contains special regex characters (e.g., `(.*)`)? → The app does not crash; treated as a literal string search.
- What happens when the connection modal is closed before step 2 is completed? → No connection is created; the connection list remains unchanged.
- What happens if "Test Connection" is clicked with an empty connection string? → Appropriate error feedback is shown; the form does not crash.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A `playwright.config.ts` MUST be created at the repository root configuring: `baseURL` pointing to the Nuxt dev server (default `http://localhost:3000`), `testDir` pointing to `test/playwright/`, and Chromium as the default browser.
- **FR-002**: All Playwright test files MUST live in `test/playwright/` using the `.spec.ts` extension.
- **FR-003**: Tests MUST use Playwright's `page` fixture and the Page Object Model (POM) pattern with page objects in `test/playwright/pages/`.
- **FR-004**: A `WorkspacesPage` page object MUST encapsulate all workspace-list interactions: navigate, click "New Workspace", fill modal, submit, search.
- **FR-005**: A `ConnectionModalPage` page object MUST encapsulate all connection management modal interactions: assert open, click "Add Connection", select DB type, advance to step 2, fill credentials, test connection, save.
- **FR-006**: ARIA roles, `data-testid` attributes, or stable text selectors MUST be used; CSS class selectors and XPath MUST be avoided.
- **FR-007**: Tests MUST run against the locally running Nuxt dev server (`bun nuxt:dev`). A `webServer` config in `playwright.config.ts` MUST auto-start the dev server if not already running.
- **FR-008**: A `bun test:playwright` script MUST be added to `package.json` running `playwright test`.
- **FR-009**: Tests for US6 (connection credential form) MUST skip gracefully when the `PG_CONNECTION` environment variable is not set.
- **FR-010**: Each test MUST clean up created workspaces after itself (or use isolated browser storage contexts/`page.addInitScript`) to avoid inter-test state pollution.

### Key Entities

- **WorkspacesPage**: Page object for `/` — home page with the workspace grid, search, and create modal.
- **ConnectionModalPage**: Page object for the connection management modal — lists connections, opens create wizard, step 1 (DB type), step 2 (credentials + test).
- **Workspace**: A named container created via the create-workspace modal and visible as a card in the grid.
- **Connection**: A database connection created through the two-step wizard within a workspace's connection modal.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Running `bun test:playwright` completes all tests without failures on the first run, against a locally running dev server.
- **SC-002**: Each individual test can be run in isolation (`--grep`) without depending on state left by other tests.
- **SC-003**: All User Story acceptance scenarios (US1–US5) have at least one corresponding Playwright test case that passes.
- **SC-004**: Tests complete within 60 seconds total on a development machine.
- **SC-005**: No test uses `page.waitForTimeout()` with hardcoded delays > 500ms; all waits use Playwright's auto-waiting or `waitFor` with conditions.
- **SC-006**: The connection-credential test (US6) skips gracefully without `PG_CONNECTION` — no test failure, only a skip notice in output.

## Assumptions

- The Nuxt dev server runs in SPA mode (`ssr: false`) on `http://localhost:3000`; Playwright tests target this URL.
- The application uses **local storage / in-memory Electron IPC** for workspace and connection persistence. In web/SPA mode (`bun nuxt:dev`), state persists via the browser session. Tests use `page.evaluate(() => localStorage.clear())` or start with a fresh context to isolate.
- Playwright is already installed as a dev dependency (`playwright-core: ^1.58.2`); full `@playwright/test` package needs to be added to support `playwright.config.ts` and browser binaries.
- The Playwright MCP tool (`@playwright/mcp`) is available in the VS Code environment for browser inspection during development.
- No authentication layer — the application is open by default.
- CSS class names and component rendering use stable, human-readable text labels ("New Workspace", "Management Connections", "Add Connection") that serve as reliable selectors.
- Workspace and connection data created during tests relies on the browser's in-memory state for the duration of the test session; full persistence (Electron IPC) is not exercised in web-only Playwright tests.
