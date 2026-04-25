# OrcaQ Business Requirements

**Document Type:** Business Analysis - Requirements  
**Product:** OrcaQ  
**Last Updated:** 2026-04-23

---

## Related Documents

- [Overview](./OVERVIEW.md)
- [Product Brief](./PRODUCT_BRIEF.md)
- [User Flows](./USER_FLOWS.md)
- [Module Detail Index](./README.md#module-detail-documents)

## 1. Business Goals

| ID    | Goal                                                                                   |
| ----- | -------------------------------------------------------------------------------------- |
| BG-01 | Provide a friendly database editor for technical and non-technical users               |
| BG-02 | Support multiple database engines through a consistent product experience              |
| BG-03 | Support multiple platform delivery models: web, npx, Docker, and desktop app           |
| BG-04 | Organize database work by workspace so each workspace can represent a project          |
| BG-05 | Allow each workspace to contain multiple connections representing project environments |
| BG-06 | Make environment context visible by assigning tags to connections                      |
| BG-07 | Reduce production mistakes by making high-risk environments clear before user actions  |

## 2. Personas

| Persona             | Description                                                             | Success Outcome                                                                  |
| ------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Technical user      | Developer, DBA, DevOps engineer, or analyst with SQL/database knowledge | Can connect, query, inspect schemas, and manage data efficiently                 |
| Semi-technical user | QA, support, implementation, or operations user                         | Can identify the right environment and inspect data safely                       |
| Non-technical user  | Product, business, or internal user with limited database knowledge     | Can navigate approved workflows without needing backend-specific knowledge       |
| Admin user          | Person responsible for organizing workspaces and connections            | Can set up project workspaces, assign environment tags, and manage safe defaults |

## 3. Functional Requirements

### 3.1 Workspace Management

| ID       | Requirement                                                                             | Priority |
| -------- | --------------------------------------------------------------------------------------- | -------- |
| FR-WS-01 | Users can create a workspace to represent a project or business context                 | Must     |
| FR-WS-02 | Users can view all workspaces from a workspace selection screen                         | Must     |
| FR-WS-03 | Users can update workspace name, icon, and description                                  | Should   |
| FR-WS-04 | Users can delete a workspace when it is no longer needed                                | Should   |
| FR-WS-05 | Deleting a workspace removes or invalidates its related connections and workspace state | Must     |

### 3.2 Connection Management

| ID        | Requirement                                                                                                      | Priority |
| --------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR-CON-01 | Users can create multiple connections inside a workspace                                                         | Must     |
| FR-CON-02 | Each connection belongs to exactly one workspace                                                                 | Must     |
| FR-CON-03 | Users can name a connection based on its environment or purpose                                                  | Must     |
| FR-CON-04 | Users can test a connection before or after saving it                                                            | Must     |
| FR-CON-05 | Users can create connections through supported methods such as connection string, form, or file where applicable | Must     |
| FR-CON-06 | Failed connection tests show actionable error messages without deleting saved connection data                    | Must     |
| FR-CON-07 | Users can edit or delete connections when project access changes                                                 | Should   |

### 3.3 Environment Tag Management

| ID        | Requirement                                                                                           | Priority |
| --------- | ----------------------------------------------------------------------------------------------------- | -------- |
| FR-TAG-01 | The app provides default environment tags: local, dev, test, uat, and prod                            | Must     |
| FR-TAG-02 | Users can assign one or more environment tags to a connection                                         | Must     |
| FR-TAG-03 | Users can visually identify connection tags in connection lists and relevant connection context areas | Must     |
| FR-TAG-04 | System tags cannot be deleted by users                                                                | Must     |
| FR-TAG-05 | Users can create custom environment tags for organization-specific environments                       | Should   |
| FR-TAG-06 | Users can configure tag color and strict-mode behavior                                                | Should   |
| FR-TAG-07 | Deleting a custom tag removes it from assigned connections                                            | Must     |
| FR-TAG-08 | Connections tagged with strict-mode tags require additional confirmation for risky actions            | Must     |

### 3.4 Multi-Database Support

| ID       | Requirement                                                                                            | Priority |
| -------- | ------------------------------------------------------------------------------------------------------ | -------- |
| FR-DB-01 | The app supports PostgreSQL connections                                                                | Must     |
| FR-DB-02 | The app supports MySQL connections                                                                     | Must     |
| FR-DB-03 | The app supports MariaDB connections                                                                   | Must     |
| FR-DB-04 | The app supports Oracle connections                                                                    | Must     |
| FR-DB-05 | The desktop app supports SQLite file connections                                                       | Must     |
| FR-DB-06 | Feature availability can vary by database engine when the database adapter does not support a workflow | Must     |
| FR-DB-07 | Unsupported workflows should be communicated clearly instead of failing silently                       | Should   |

### 3.5 Schema and Structure Exploration

| ID        | Requirement                                                                   | Priority |
| --------- | ----------------------------------------------------------------------------- | -------- |
| FR-SCH-01 | Users can browse database schemas and objects after selecting a connection    | Must     |
| FR-SCH-02 | Users can inspect tables, columns, views, and functions where supported       | Must     |
| FR-SCH-03 | Users can open object details in tabs                                         | Must     |
| FR-SCH-04 | Users can refresh schema metadata manually                                    | Should   |
| FR-SCH-05 | Users can understand database relationships through ERD views where supported | Should   |

### 3.6 Query Workflows

| ID        | Requirement                                                              | Priority |
| --------- | ------------------------------------------------------------------------ | -------- |
| FR-QRY-01 | Users can run raw SQL queries against a selected connection              | Must     |
| FR-QRY-02 | Users can inspect query results in a table format                        | Must     |
| FR-QRY-03 | Users can browse and edit table data through Quick Query where supported | Must     |
| FR-QRY-04 | Data mutations show confirmation when safe mode or strict mode applies   | Must     |
| FR-QRY-05 | Query errors are shown in a user-understandable way                      | Must     |
| FR-QRY-06 | Query history is available for traceability where supported              | Should   |

### 3.7 Platform Distribution

| ID         | Requirement                                                                                     | Priority |
| ---------- | ----------------------------------------------------------------------------------------------- | -------- |
| FR-PLAT-01 | Users can run OrcaQ as a web app                                                                | Must     |
| FR-PLAT-02 | Users can start OrcaQ through npx for quick local use                                           | Must     |
| FR-PLAT-03 | Users can run OrcaQ through Docker for self-hosted use                                          | Must     |
| FR-PLAT-04 | Users can run OrcaQ as a desktop app                                                            | Must     |
| FR-PLAT-05 | Platform-specific limitations must be documented, such as SQLite file access being desktop-only | Must     |

### 3.8 Role and Permission Management

| ID        | Requirement                                                                                  | Priority |
| --------- | -------------------------------------------------------------------------------------------- | -------- |
| FR-RLP-01 | Users can view database roles and users for the active connection                            | Should   |
| FR-RLP-02 | Roles are categorized as superusers, login users, and role-only entries                      | Should   |
| FR-RLP-03 | Users can search roles by role name                                                          | Should   |
| FR-RLP-04 | Users can open a role detail view from the role tree                                         | Should   |
| FR-RLP-05 | Role detail shows role attributes, inheritance, database permissions, and object permissions | Should   |
| FR-RLP-06 | Authorized users can create a role/user where the database adapter supports it               | Should   |
| FR-RLP-07 | Authorized users can delete a role/user where the database adapter supports it               | Should   |
| FR-RLP-08 | Authorized users can grant and revoke object permissions                                     | Should   |
| FR-RLP-09 | Role creation can include optional database, schema, and object grants                       | Could    |
| FR-RLP-10 | Unsupported role/permission workflows are clearly communicated                               | Must     |

## 4. Business Rules

| ID    | Rule                                                                           |
| ----- | ------------------------------------------------------------------------------ |
| BR-01 | A workspace is the top-level container for project database work               |
| BR-02 | A connection cannot exist without a workspace                                  |
| BR-03 | A workspace can have zero, one, or many connections                            |
| BR-04 | A connection can have zero, one, or many environment tags                      |
| BR-05 | Default system environment tags are seeded for first-time use                  |
| BR-06 | System environment tags cannot be deleted                                      |
| BR-07 | The `prod` tag uses strict mode by default                                     |
| BR-08 | Strict-mode tags should trigger extra confirmation before high-risk operations |
| BR-09 | A failed connection test must not remove a saved connection                    |
| BR-10 | SQLite file connections are available only in desktop runtime                  |
| BR-11 | Role and permission actions require an active connection                       |
| BR-12 | Create role/user requires adequate database privileges                         |
| BR-13 | Permission mutations should refresh displayed permission data after success    |

## 5. Non-Functional Requirements

| ID     | Requirement                                                                                     | Priority |
| ------ | ----------------------------------------------------------------------------------------------- | -------- |
| NFR-01 | The interface must be friendly and understandable for users who are not backend specialists     | Must     |
| NFR-02 | Environment context must remain visible enough to reduce accidental work in the wrong database  | Must     |
| NFR-03 | User-facing errors must be actionable and avoid raw driver-only language when possible          | Must     |
| NFR-04 | The app should feel fast when switching workspaces, connections, and tabs                       | Should   |
| NFR-05 | The product should use consistent terminology across web, desktop, Docker, and npx experiences  | Should   |
| NFR-06 | Workflows that are unavailable for a database engine or platform should provide clear messaging | Should   |

## 6. Acceptance Criteria

### Workspace and Connection Model

- Given a user creates a workspace, when they open it, then they can add multiple database connections inside it.
- Given a project has dev, test, uat, and prod databases, when the user creates connections, then each connection can be named and tagged by environment.
- Given a connection belongs to a workspace, when another workspace is opened, then the original connection is not mixed into the new workspace.

### Environment Tags

- Given a user opens tag management for the first time, when the app has no custom tags, then the default local, dev, test, uat, and prod tags are available.
- Given a connection is tagged as prod, when the user performs a risky action, then the app shows additional production-aware confirmation.
- Given a custom tag is deleted, when connections used that tag, then the tag is removed from those connections.

### Friendly User Experience

- Given a non-technical user opens a workspace, when they view connections, then they can identify the project and environment without reading technical connection details.
- Given a query fails, when the error is shown, then the message helps the user understand what went wrong or what to check next.
- Given a workflow is unsupported for a database type or platform, when the user attempts it, then the app explains the limitation.

### Role and Permission Management

- Given a user opens Users & Roles with an active connection, when roles load, then the app shows roles in categorized groups.
- Given a user lacks permission to create roles, when they inspect the create action, then the app explains why the action is disabled.
- Given a user grants or revokes privileges for a role, when the operation succeeds, then the role permissions are refreshed.
- Given a role is selected, when the detail tab opens, then the user can inspect attributes, inheritance, database permissions, and object permissions.

## 7. Open BA Questions

| ID    | Question                                                                                 |
| ----- | ---------------------------------------------------------------------------------------- |
| OQ-01 | Should non-technical users have a simplified read-only mode by workspace or connection?  |
| OQ-02 | Should environment tags map to permissions, or are they only visual and safety metadata? |
| OQ-03 | Should prod strict mode be mandatory, or can admins disable it?                          |
| OQ-04 | Should workspaces support team sharing and role assignment in future releases?           |
| OQ-05 | Should OrcaQ provide predefined workspace templates for common project setups?           |
