# OrcaQ User Flows

**Document Type:** Business Analysis - User Flows  
**Product:** OrcaQ  
**Last Updated:** 2026-04-23

---

## Related Documents

- [Overview](./OVERVIEW.md)
- [Requirements](./REQUIREMENTS.md)
- [Workspace Module](./modules/WORKSPACE.md)
- [Connection Module](./modules/CONNECTION.md)
- [Quick Query Module](./modules/QUICK_QUERY.md)
- [Raw Query Module](./modules/RAW_QUERY.md)
- [Role & Permission Module](./modules/ROLE_PERMISSION.md)

## 1. Workspace Setup Flow

**Goal:** User creates a workspace that represents a project or business context.

```mermaid
flowchart TD
    Start["Open OrcaQ"] --> WorkspaceList["View workspace list"]
    WorkspaceList --> CreateWorkspace["Create workspace"]
    CreateWorkspace --> EnterDetails["Enter name, icon, and optional description"]
    EnterDetails --> SaveWorkspace["Save workspace"]
    SaveWorkspace --> WorkspaceHome["Open workspace home"]
    WorkspaceHome --> AddConnection["Prompt user to add first connection"]
```

### Business Notes

- A workspace should use user-friendly project language.
- The empty workspace state should guide users to create a connection.
- Workspace naming should not require database-specific terminology.

## 2. Connection Setup Flow

**Goal:** User creates a database connection inside a workspace.

```mermaid
flowchart TD
    WorkspaceHome["Workspace home"] --> CreateConnection["Create connection"]
    CreateConnection --> SelectDatabase["Select database type"]
    SelectDatabase --> SelectMethod["Choose connection method"]
    SelectMethod --> EnterConnection["Enter connection details"]
    EnterConnection --> AssignTags["Assign environment tag(s)"]
    AssignTags --> TestConnection["Test connection"]
    TestConnection --> Decision{"Connection successful?"}
    Decision -->|Yes| SaveConnection["Save connection"]
    Decision -->|No| ShowError["Show actionable error"]
    ShowError --> EditDetails["Edit details or save for later"]
    EditDetails --> TestConnection
    SaveConnection --> ConnectionReady["Connection available in workspace"]
```

### Business Notes

- Connection names should be understandable to non-backend users.
- Suggested naming pattern: `{project or system} - {environment}`.
- Connection test failure should not destroy user-entered details.
- Tags should be assignable during connection setup, not only after save.

## 3. Environment Tag Management Flow

**Goal:** Admin or project owner manages environment labels used across connections.

```mermaid
flowchart TD
    Settings["Open settings or tag management"] --> ViewTags["View environment tags"]
    ViewTags --> CreateTag["Create custom tag"]
    CreateTag --> ConfigureTag["Set name, color, and strict mode"]
    ConfigureTag --> SaveTag["Save tag"]
    SaveTag --> AssignTag["Assign tag to connection"]
    ViewTags --> EditTag["Edit existing tag"]
    ViewTags --> DeleteTag["Delete custom tag"]
    DeleteTag --> RemoveFromConnections["Remove tag from assigned connections"]
```

### Business Notes

- Default tags are local, dev, test, uat, and prod.
- System tags should remain available for consistent onboarding.
- Strict-mode tags should communicate higher risk.
- Production should be visibly different from lower-risk environments.

## 4. Environment-Aware Query Flow

**Goal:** User runs a query while remaining aware of the selected project and environment.

```mermaid
flowchart TD
    OpenConnection["Open tagged connection"] --> ShowContext["Show workspace, connection, and environment tag"]
    ShowContext --> ChooseQueryMode["Choose Quick Query or Raw Query"]
    ChooseQueryMode --> PrepareQuery["Prepare query or table action"]
    PrepareQuery --> RiskCheck{"Strict-mode or safe-mode applies?"}
    RiskCheck -->|No| ExecuteQuery["Execute query"]
    RiskCheck -->|Yes| ConfirmRisk["Show environment-aware confirmation"]
    ConfirmRisk --> UserDecision{"User confirms?"}
    UserDecision -->|Yes| ExecuteQuery
    UserDecision -->|No| CancelAction["Cancel action"]
    ExecuteQuery --> ShowResult["Show result, error, or history entry"]
```

### Business Notes

- The user should not need to remember which environment they selected.
- The app should keep environment context visible near risky actions.
- Warnings should be direct and specific, especially for production.

## 5. Schema Exploration Flow

**Goal:** User explores database structure without needing to write SQL first.

```mermaid
flowchart TD
    OpenConnection["Open connection"] --> LoadSchemas["Load schemas and objects"]
    LoadSchemas --> BrowseTree["Browse schema tree"]
    BrowseTree --> SelectObject["Select table, view, or function"]
    SelectObject --> OpenTab["Open object detail tab"]
    OpenTab --> InspectDetails["Inspect columns, structure, relations, or data"]
    InspectDetails --> OptionalAction["Run query, open ERD, export, or manage object where supported"]
```

### Business Notes

- Schema browsing is important for non-technical and semi-technical users.
- Object names and actions should be presented clearly.
- Unsupported database-specific actions should be hidden or explained.

## 6. Multi-Platform Access Flow

**Goal:** User starts OrcaQ from the platform that fits their situation.

```mermaid
flowchart LR
    Need["Need database client"] --> Web["Web app"]
    Need --> Npx["npx terminal start"]
    Need --> Docker["Docker self-hosted"]
    Need --> Desktop["Desktop app"]
    Web --> SameModel["Same workspace and connection model"]
    Npx --> SameModel
    Docker --> SameModel
    Desktop --> SameModel
    Desktop --> SQLite["Desktop-only SQLite file workflow"]
```

### Business Notes

- The product language should stay consistent across all platforms.
- Platform limitations should be documented and visible.
- Desktop can support local file workflows that browser-based runtimes cannot support.

## 7. Role and Permission Review Flow

**Goal:** Admin or technical user reviews database roles and adjusts permissions.

```mermaid
flowchart TD
    OpenConnection["Open connection"] --> UsersRoles["Open Users & Roles"]
    UsersRoles --> FetchRoles["Fetch roles for active connection"]
    FetchRoles --> RoleTree["Show categorized role tree"]
    RoleTree --> SelectRole["Select role"]
    SelectRole --> DetailTab["Open role detail tab"]
    DetailTab --> FetchDetail["Fetch attributes, inheritance, database permissions, object permissions"]
    FetchDetail --> Review["Review access"]
    Review --> Decision{"Need permission change?"}
    Decision -->|No| Done["Done"]
    Decision -->|Yes| GrantDialog["Open grant/update dialog"]
    GrantDialog --> SaveChange["Grant or revoke privileges"]
    SaveChange --> Refresh["Refresh role permissions"]
```

### Business Notes

- Role and permission workflows require an active connection.
- Create user should be disabled with a clear reason when the current role lacks privilege.
- Grant/revoke actions should be treated as administrative changes.
- Production-tagged connections may need stricter confirmation in future releases.
