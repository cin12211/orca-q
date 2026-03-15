# Feature Specification: E2E Test Coverage — Workspace & Connection Full Flow

**Feature Branch**: `001-e2e-workspace-connection`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "test e2e full flow for module workspace, connection — in this model I allow user can create multiple workspaces, each workspace has multiple connections (I just setup vitest and I use bun as package manager)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Workspace CRUD Full Flow (Priority: P1)

A user arrives at the workspace list screen. They have no workspaces yet. They create a new workspace by filling in a name, optional description, and icon. The workspace appears immediately in the grid. They then edit the workspace's name and verify the update is reflected. Finally, they delete the workspace and confirm the list is empty again.

**Why this priority**: Workspace management is the entry point to the entire application. Without it, none of the connection or query features are reachable.

**Independent Test**: Can be fully tested through `useWorkspaceForm` hook tests (create + update + validation) and `useWorkspaces` state tests (search filtering, list state), delivering full CRUD confidence without any connection context.

**Acceptance Scenarios**:

1. **Given** the workspace list is empty, **When** the user clicks "New Workspace", fills in a name, and submits, **Then** a new workspace card appears in the grid and a success toast is shown.
2. **Given** an existing workspace, **When** the user opens the edit modal, changes the name, and submits, **Then** the workspace card reflects the updated name.
3. **Given** an existing workspace, **When** the user opens the delete confirmation modal and confirms, **Then** the workspace is removed from the list.
4. **Given** multiple workspaces, **When** the user types in the search box, **Then** only workspaces whose names match the query are displayed (debounced).
5. **Given** the create form, **When** the user submits without a name, **Then** a validation error is shown and the workspace is not created.

---

### User Story 2 — Connection CRUD Inside a Workspace (Priority: P1)

After selecting a workspace, the user opens the connection management modal. They add a new database connection using either a connection string or the form-based method (host, port, credentials). They test the connection, see a success status, save it, and find it listed. They then edit the connection and delete it.

**Why this priority**: Connections are the bridge between workspaces and actual databases. Without connection CRUD, the application has no value beyond the workspace screen.

**Independent Test**: Can be fully tested through `useConnectionForm` hook tests (step navigation, form-to-payload mapping, reset behavior) and `ConnectionsList` component tests (rendered rows, edit/delete emit events), independently of any open workspace or routing.

**Acceptance Scenarios**:

1. **Given** a workspace with no connections, **When** the "Add Connection" button is clicked, **Then** the create connection modal opens at step 1 (database type selection).
2. **Given** step 1 of the modal, **When** the user selects a database type and clicks Next, **Then** the modal advances to step 2 (credentials form).
3. **Given** step 2 with valid host/port/credentials filled, **When** the user clicks "Test Connection", **Then** the API health-check is called and a success or failure status is shown.
4. **Given** a successfully tested connection, **When** the user saves, **Then** the connection appears in the connections list table with name, type, and creation date.
5. **Given** an existing connection in the list, **When** the user clicks Edit, fills updated fields, and saves, **Then** the list reflects the new values.
6. **Given** an existing connection, **When** the user clicks Delete and confirms, **Then** the connection is removed from the list.
7. **Given** step 2 with connection method set to "Connection String", **When** a valid connection string is entered, **Then** the form correctly maps host, port, user, password, and database from the string.

---

### User Story 3 — Full End-to-End Journey: Create Workspace → Connect → Open (Priority: P2)

A user creates a workspace, adds a connection to it, and then opens the workspace with that connection, which navigates to the main query view. This covers the complete happy path that a new user would follow.

**Why this priority**: This is the canonical new-user journey. It validates the integration between the workspace module, connection module, and the routing/navigation layer.

**Independent Test**: Can be tested by asserting that `openWorkspaceWithConnection` is called with the correct workspace ID and connection ID after the user completes all steps, verifying method invocation independently of actual routing.

**Acceptance Scenarios**:

1. **Given** an empty application, **When** the user creates a workspace, adds a connection, and clicks to open the workspace, **Then** the `openWorkspaceWithConnection` function is triggered with the correct workspace and connection IDs.
2. **Given** a workspace with multiple connections, **When** the user clicks on the workspace card and selects a connection from the popup selector, **Then** that specific connection is used to open the workspace.
3. **Given** a workspace with no connections, **When** the user attempts to open it, **Then** the connection management modal opens automatically so the user can add one.

---

### User Story 4 — API Health-Check E2E for Connection Testing (Priority: P2)

The `/api/managment-connection/health-check` endpoint is tested end-to-end with real database credentials (from environment variables), verifying it accepts both connection strings and form-based payloads, and correctly returns `{ isConnectedSuccess: true/false }`.

**Why this priority**: The connection test API is the single server-side critical path. It must behave correctly independently of the UI layer.

**Independent Test**: Standalone Vitest e2e project (`test/e2e/`) calling the server API via `$fetch` from `@nuxt/test-utils/e2e`. No UI required.

**Acceptance Scenarios**:

1. **Given** a valid PostgreSQL connection string in `PG_CONNECTION` env, **When** a POST is sent with `{ stringConnection }`, **Then** the response is `{ isConnectedSuccess: true }`.
2. **Given** a valid connection broken into individual fields (host, port, user, password, database), **When** a POST is sent with those fields, **Then** the response is `{ isConnectedSuccess: true }`.
3. **Given** an invalid/unreachable host, **When** a POST is sent, **Then** the response is `{ isConnectedSuccess: false }` without throwing a 500 error.

---

### Edge Cases

- What happens when a workspace name is empty or only whitespace? → Zod validation must reject it before submission.
- What happens when two workspaces share the same name? → System allows duplicate names (no uniqueness constraint specified); both are created.
- What happens when a connection form is reset mid-completion? → All fields return to defaults, step resets to 1, database type resets to PostgreSQL.
- What happens when the connection test API times out? → The test status returns to `error` state; the user is informed without a crash.
- What happens when a workspace is deleted that has connections? → The workspace is removed; orphaned connection records should not appear elsewhere (store cleanup verified in tests).
- What happens when the search input is cleared? → All workspaces reappear immediately after the debounce interval.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Tests MUST cover the `useWorkspaceForm` hook for create, update, and validation failure cases.
- **FR-002**: Tests MUST cover the `useWorkspaces` hook for search filtering (debounce-aware) and workspace list state.
- **FR-003**: Tests MUST cover the `useWorkspaceCard` hook for the delete confirmation flow and connection retrieval by workspace ID.
- **FR-004**: Tests MUST cover the `useConnectionForm` hook for both connection methods (string and form), step navigation (step 1 → step 2), and form reset behavior.
- **FR-005**: Tests MUST cover the `connectionService.healthCheck` API call, asserting the correct payload structure and handling of success and failure responses.
- **FR-006**: Tests MUST cover the `ManagementConnection` container: add, edit, and delete connection operations in isolation using mocked store and service.
- **FR-007**: Tests MUST include a Vitest e2e test (under `test/e2e/`) invoking the `/api/managment-connection/health-check` endpoint with a PostgreSQL connection string from environment variables, gracefully skipping when `PG_CONNECTION` is absent.
- **FR-008**: All tests MUST use Bun as the runner (compatible with the existing `vitest.config.ts` multiproject setup: `unit`, `nuxt`, `e2e`).
- **FR-009**: Hook tests MUST be placed under `test/nuxt/` or the module's `__tests__/` folder and run in the `nuxt` Vitest environment (with `happy-dom`).
- **FR-010**: Service and pure utility tests MUST be placed under `test/unit/` and run in the `node` environment.
- **FR-011**: Tests MUST mock the Pinia store (`workspaceStore`, `connectionStore`) and `useAppContext` to isolate hook logic from real persistence.
- **FR-012**: Tests MUST verify that deleting a workspace removes it from `workspaceStore` and does not leave orphaned connections visible.

### Key Entities

- **Workspace**: An organizational container with `id`, `name`, `desc` (optional), `icon`, and `createdAt`. Belongs to no parent — a user can have many workspaces.
- **Connection**: A database connection configuration with `id`, `workspaceId`, `name`, `type` (PostgreSQL, etc.), connection credentials (host/port/user/pass/db or connection string), and optional SSL/SSH settings. Belongs to one workspace; a workspace can have many connections.
- **ConnectionMethod**: Enum — `STRING` (single URI) or `FORM` (individual credential fields).
- **TestStatus**: The transient state of a connection test — `idle | testing | success | error`. Not persisted.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The entire test suite (unit + nuxt + e2e projects) completes without failures when run with `bun vitest run`.
- **SC-002**: Hook tests for `useWorkspaceForm`, `useWorkspaces`, `useWorkspaceCard`, and `useConnectionForm` achieve at least 80% branch coverage for their respective hook files.
- **SC-003**: Every acceptance scenario listed in each User Story above has a corresponding test case that passes.
- **SC-004**: The API e2e test for connection health-check passes when the `PG_CONNECTION` environment variable is set, and skips gracefully (no failure) when it is not set.
- **SC-005**: No test relies on real browser automation or a running server, except for the `e2e` Vitest project which uses `@nuxt/test-utils/e2e` for HTTP-level API testing.
- **SC-006**: All tests can be run independently — no shared mutable state between test files.

## Assumptions

- The Pinia stores (`workspaceStore`, `connectionStore`) use an in-memory model perfectly suitable for mocking in tests; no IndexedDB or filesystem persistence is involved in test context.
- The connection health-check endpoint (`/api/managment-connection/health-check`) returns a safe `{ isConnectedSuccess: false }` rather than throwing on network failure — this is already observed in the existing `connection.test.ts`.
- Duplicate workspace names are permitted by design; tests will not assert uniqueness unless a constraint is introduced.
- The `nuxt` Vitest environment (`happy-dom`) is sufficient for hook and component tests; Playwright browser automation is out of scope for this feature.
- SSH and SSL configuration fields in the connection form are included in form-reset tests but not in integration API tests (server-side SSH/SSL testing requires a live tunnel environment).
- The `PG_CONNECTION` environment variable (PostgreSQL connection string) is available in CI via `.env.e2e`; tests skip gracefully without it in local dev.
