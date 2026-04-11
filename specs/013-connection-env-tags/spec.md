# Feature Specification: Connection Environment Tags

**Feature Branch**: `013-connection-env-tags`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "when user create connection add field enviroment tag for user choose env tag for this connection ( i want default have tag prod , uat , test , dev , local ) allow user assign max 3 tag for a connection allow user create more tag,tag have filed id, name , color , strickMode init default production tag strickMode true for case connection have tag strickMode true when user connect to this connection just show popup and foce user enter 'this is production' to make user ensure this production"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Assign Environment Tags to a Connection (Priority: P1)

As a database administrator, when I create or edit a connection, I want to assign one or more environment tags (such as "prod", "dev", "uat") so that I and my team can immediately identify which environment a connection belongs to.

**Why this priority**: This is the core value of the feature. Without the ability to assign tags to connections, all other functionality (strict mode, custom tags) has no foundation. Delivering this story alone provides immediate visual clarity about connection environments.

**Independent Test**: Can be fully tested by creating a new connection, selecting tags from the environment tag picker, saving the connection, and verifying the assigned tags appear on the connection card/list. Delivers visible environment context for every connection.

**Acceptance Scenarios**:

1. **Given** a user is on the connection creation form, **When** they interact with the environment tag field, **Then** they see a list of available tags including the 5 defaults (prod, uat, test, dev, local) and any user-created tags.
2. **Given** a user is selecting tags for a connection, **When** they have already selected 3 tags, **Then** the system prevents selecting any additional tags and shows a clear message that the maximum of 3 tags has been reached.
3. **Given** a user saves a connection with tags assigned, **When** they view the connection in the connection list, **Then** the assigned tags are visually displayed alongside the connection name with their respective colors.
4. **Given** a user edits an existing connection, **When** they open the connection form, **Then** the previously assigned tags are pre-selected in the tag field.

---

### User Story 2 - Strict Mode Confirmation on Connect (Priority: P2)

As a database administrator, when I attempt to connect to a connection that has at least one strict-mode tag (such as "prod"), I want to see a confirmation dialog requiring me to type a confirmation phrase before the connection is established, so that accidental connections to critical environments are prevented.

**Why this priority**: This is the primary safety mechanism of the feature. It directly prevents costly mistakes in production environments. It depends only on Story 1 (tags assigned to connections) and the default "prod" tag having strictMode enabled, making it deliverable early.

**Independent Test**: Can be fully tested by creating a connection with the default "prod" tag, clicking Connect, and verifying the strict-mode confirmation dialog appears and blocks connection until the correct phrase is entered.

**Acceptance Scenarios**:

1. **Given** a connection has at least one tag with strictMode enabled, **When** the user initiates a connection to it, **Then** a modal dialog appears before any connection is established, showing which strict-mode tag(s) triggered the check.
2. **Given** the strict-mode confirmation dialog is open, **When** the user types the exact phrase "this is production", **Then** the system proceeds with the connection.
3. **Given** the strict-mode confirmation dialog is open, **When** the user types anything other than the exact phrase "this is production", **Then** the confirm button remains disabled and the connection is not established.
4. **Given** the strict-mode confirmation dialog is open, **When** the user clicks Cancel or dismisses the dialog, **Then** the connection attempt is aborted and no connection is made.
5. **Given** a connection has no tags or only tags where strictMode is false, **When** the user initiates a connection, **Then** no confirmation dialog appears and the connection proceeds normally.

---

### User Story 3 - Manage Custom Environment Tags (Priority: P3)

As a database administrator, I want to create, view, and delete custom environment tags with a name, color, and strictMode setting, so that I can tailor environment categorization to my team's workflow beyond the 5 built-in defaults.

**Why this priority**: Enhances flexibility for teams with non-standard environments. The feature is fully useful with default tags alone, making this a valuable but non-critical addition.

**Independent Test**: Can be fully tested by navigating to the tag management area, clicking the create action to open the create-tag modal, creating a new tag with a name, color, and strictMode choice, then verifying it appears in the tag picker when creating a connection.

**Acceptance Scenarios**:

1. **Given** a user accesses the tag management area, **When** they click the create action and submit a new tag with a name, color, and strictMode value, **Then** the new tag is saved and immediately available for assignment to connections.
2. **Given** a user creates a new tag, **When** they provide a name that already exists (case-insensitive), **Then** the system rejects the creation with a clear duplicate-name error.
3. **Given** a user views the tag list, **When** they look at the 5 default tags (prod, uat, test, dev, local), **Then** those tags are visible and the "prod" tag shows strictMode as enabled.
4. **Given** a user attempts to delete a tag that is not assigned to any connection, **When** they click delete, **Then** the tag is deleted immediately without an extra confirmation step.
5. **Given** a user attempts to delete a tag that is currently assigned to one or more connections, **When** they click delete, **Then** the system shows a confirmation dialog explaining that deleting it will also remove the tag from those connections.
6. **Given** a user confirms deletion of a tag that is assigned to one or more connections, **When** the deletion completes, **Then** the tag is removed from the tag library and unassigned from all connections that used it.
7. **Given** a user attempts to delete one of the 5 default system tags, **Then** they can delete it (it is treated as a regular tag, no special protection).

---

### Edge Cases

- What happens if a user removes a tag from the library that was previously used as a strict-mode trigger for a connection? The connection's strict-mode behavior should reflect only remaining assigned tags.
- What happens when a connection has 3 tags and the user tries to add a 4th during an edit? The UI must prevent this without losing the existing 3 tags.
- What happens if the user pastes text into the strict-mode confirmation input rather than typing it? The phrase check should still validate regardless of input method.
- What if two assigned tags both have strictMode enabled? A single confirmation dialog should be shown (not one per strict-mode tag), and it should indicate all strict-mode tags that apply.
- What happens when the confirmation phrase check is case-sensitive? The phrase "this is production" should be matched exactly (case-sensitive) to maximize intentionality.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The connection creation and edit form MUST include an environment tag selection field.
- **FR-002**: The tag selection field MUST display all available tags (defaults + user-created) with their names and colors.
- **FR-003**: A connection MUST support a maximum of 3 assigned environment tags; the system MUST prevent assigning more.
- **FR-004**: The system MUST ship with 5 pre-defined default tags: **prod**, **uat**, **test**, **dev**, **local**.
- **FR-005**: The default **prod** tag MUST have `strictMode` set to `true` upon initialization.
- **FR-006**: All other default tags (uat, test, dev, local) MUST have `strictMode` set to `false` upon initialization.
- **FR-007**: When a user initiates a connection to a workspace that has at least one assigned tag with `strictMode = true`, the system MUST display a confirmation dialog BEFORE establishing the connection.
- **FR-008**: The strict-mode confirmation dialog MUST require the user to type the exact phrase **"this is production"** (case-sensitive) before the confirm action becomes available.
- **FR-009**: The strict-mode dialog MUST be dismissible; dismissing or cancelling it MUST abort the connection attempt entirely.
- **FR-010**: Users MUST be able to create custom tags by providing a name, a color, and a strictMode setting (true/false).
- **FR-011**: Tag names MUST be unique (case-insensitive) across the tag library.
- **FR-012**: Each tag MUST have the following fields: `id` (unique identifier), `name` (display label), `color` (visual identifier), `strictMode` (boolean safety flag).
- **FR-013**: Users MUST be able to delete any tag from the library; deleted tags MUST be automatically unassigned from all connections.
- **FR-013a**: If a tag is not currently assigned to any connection, the system MUST delete it immediately when the user clicks delete.
- **FR-013b**: If a tag is currently assigned to one or more connections, the system MUST show a confirmation dialog before deletion and MUST explain that the tag will also be removed from those connections.
- **FR-014**: The assigned tags for a connection MUST be visually displayed on the connection list/card using the tag's name and color.
- **FR-015**: The strict-mode confirmation dialog MUST clearly communicate which strict-mode tag(s) triggered the check.

### Key Entities

- **EnvironmentTag**: Represents a categorization label for connections. Fields: `id` (unique), `name` (unique, human-readable label), `color` (visual identifier), `strictMode` (boolean — when true, requires user confirmation before connecting). The system starts with 5 pre-seeded tags.
- **Connection**: An existing entity that gains a new relationship — a list of up to 3 assigned `EnvironmentTag` references. The connection's behavior at connect-time is influenced by the strictMode of its assigned tags.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can assign environment tags to a connection in under 30 seconds during connection creation or editing.
- **SC-002**: 100% of connection attempts to connections bearing at least one strict-mode tag are intercepted by the confirmation dialog — no connection bypasses the check.
- **SC-003**: The strict-mode confirmation dialog blocks the connection until the correct phrase is entered; zero connections to strict-mode-tagged environments are established without explicit user confirmation.
- **SC-004**: Users can create a custom tag and have it available for assignment within a single flow, without navigating away from their current task.
- **SC-005**: The 5 default tags and the prod tag's strictMode setting are present on every fresh installation without any manual setup required.
- **SC-006**: Deleting a tag from the library is reflected consistently — the tag no longer appears in any connection's tag list within the same session.

## Assumptions

- Tag management (create/delete) is accessible from a settings or configuration area; the exact location within the app UI is determined during planning.
- The confirmation phrase "this is production" is fixed and not user-configurable in this iteration.
- Tags are stored globally (shared across all connections in the app), not scoped per workspace.
- Color selection for tags uses a pre-defined color palette rather than a free-form color picker, to ensure consistent visual design. This can be revisited.
- The 5 default tags can be deleted by users; there is no hard protection on system defaults.
- If multiple strict-mode tags are assigned to the same connection, a single confirmation dialog handles all of them together.
