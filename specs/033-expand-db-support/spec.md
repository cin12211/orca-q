# Feature Specification: Expanded Database Support

**Feature Branch**: `[033-expand-db-support]`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "support connection sqlite with Cloudflare D1, Turso; support connection with Redis and MongoDB; Redis should feel like RedisInsight, and MongoDB should use a MongoDB Compass-style workflow"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect New Data Sources (Priority: P1)

As a HeraQ user, I want to add and validate Cloudflare D1, Turso, Redis, and MongoDB connections so I can work with those systems from the same workspace I already use for existing databases.

**Why this priority**: Without trusted connection setup, none of the browsing, querying, or admin workflows are usable. This is the minimum viable slice that unlocks immediate value for all four new data-source families.

**Independent Test**: Can be fully tested by creating one valid connection for each source type, reconnecting to it from saved state, and confirming that HeraQ routes the user into the correct workspace for that source.

**Acceptance Scenarios**:

1. **Given** a user has the remote identifiers and delegated credentials for a Cloudflare D1 database, **When** they create and test a new connection, **Then** HeraQ saves it as a managed SQLite connection and opens the standard SQL browsing/query workspace instead of the local file flow.
2. **Given** a user has a Turso database URL, auth token, and access to one or more database branches, **When** they choose a branch and connect, **Then** HeraQ opens the selected branch and keeps the active branch visible during the session.
3. **Given** a user enters a valid Redis or MongoDB connection through a connection string or structured form, **When** they save and connect, **Then** HeraQ opens the matching Redis or MongoDB workspace and retains the connection for later reuse.
4. **Given** a user enters invalid, expired, or insufficiently privileged credentials for any newly supported source, **When** they test or open the connection, **Then** HeraQ blocks the session and shows an actionable error that explains what needs to be corrected.
5. **Given** a user opens a connection whose data model differs from the previous one, **When** the workspace loads, **Then** HeraQ hides incompatible family-specific features and lands the user on a compatible view instead of leaving SQL-only or NoSQL-only tools visible.

---

### User Story 2 - Explore and Operate Redis Data (Priority: P2)

As a Redis user, I want a RedisInsight-like workflow for browsing keys, inspecting values, running commands, and diagnosing performance so I can manage Redis data without switching tools.

**Why this priority**: Redis support is not useful if it stops at raw connectivity. Users expect fast key browsing, type-aware editing, and operational insight because Redis data and command behavior are hard to manage from a generic SQL-style interface.

**Independent Test**: Can be fully tested by connecting to a Redis instance with mixed key types, browsing and filtering keys, editing at least one value, running commands, and reviewing live or historical operational diagnostics.

**Acceptance Scenarios**:

1. **Given** a connected Redis instance with multiple namespaces and key types, **When** the user filters by namespace, logical database, or key type, **Then** HeraQ updates the key browser without leaving the Redis workspace.
2. **Given** a user opens a Redis key, **When** they inspect or edit the value, **Then** HeraQ uses a type-aware viewer/editor appropriate to that key's data structure and confirms successful changes.
3. **Given** a user wants to work beyond basic browsing, **When** they open the Redis command workspace, **Then** HeraQ provides guided command entry, formatted results, and visual output where the server supports richer result types.
4. **Given** a user initiates a bulk delete, live monitoring session, or performance review, **When** the action could affect production data or visibility, **Then** HeraQ requires explicit confirmation and reports the outcome in a way the user can audit.

---

### User Story 3 - Explore MongoDB Documents and Shape (Priority: P3)

As a MongoDB user, I want a MongoDB Compass-style workflow for navigating collections, filtering documents, understanding schema shape, and running aggregations so I can inspect document data visually and safely.

**Why this priority**: MongoDB users need document-native workflows, not a table-only abstraction. Familiar collection navigation, query filters, schema analysis, and aggregation pipelines are the core tasks that make Compass valuable.

**Independent Test**: Can be fully tested by connecting to a MongoDB deployment, selecting a collection, filtering documents, inspecting schema statistics, and creating or rerunning an aggregation pipeline.

**Acceptance Scenarios**:

1. **Given** a connected MongoDB deployment, **When** the user selects a database and collection from the sidebar, **Then** HeraQ shows document results and collection context in a dedicated MongoDB workspace.
2. **Given** a user enters a filter or builds one interactively, **When** they run the query, **Then** HeraQ refreshes the result set and lets the user continue working in document-oriented views.
3. **Given** a user opens schema analysis for a collection, **When** HeraQ analyzes sampled documents, **Then** it summarizes field types, nested structures, sparsity, and representative value distributions.
4. **Given** a user creates a multi-stage aggregation, **When** they run or save the pipeline, **Then** HeraQ preserves the pipeline definition and shows the resulting output in the same workspace.

### Edge Cases

- A Cloudflare D1 connection can authenticate, but the user lacks permission to query the selected database or the remote endpoint is temporarily unavailable.
- A Turso connection succeeds, but the previously saved branch no longer exists or the user no longer has access to it.
- A Redis user can authenticate but lacks permission for metadata or operational commands needed for browser, profiler, slow-log, or analysis views.
- A Redis or MongoDB dataset is too large for full enumeration, requiring search-first browsing, pagination, or sampling instead of loading everything at once.
- A MongoDB deployment supports basic reads but not schema, aggregation, or index inspection for the current user role.
- A user attempts a destructive change while the connection is in read-only mode or while the workspace has not confirmed the target scope.
- A user switches from a SQL connection to Redis or MongoDB while a SQL-only sidebar tab or route is still active from the previous session.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create, save, edit, test, and reconnect Cloudflare D1, Turso, Redis, and MongoDB connection profiles.
- **FR-002**: System MUST present Cloudflare D1 and Turso as managed SQLite connection options and open them in HeraQ's standard SQL browsing and query workflows rather than the local-file workflow.
- **FR-003**: System MUST collect and validate the remote identifiers and delegated credentials required to connect to a Cloudflare D1 database.
- **FR-004**: System MUST collect and validate the remote database URL and auth token required to connect to a Turso database.
- **FR-005**: When a Turso account exposes more than one branch or equivalent database variant, users MUST be able to select which variant they open and the active variant MUST remain visible during the session.
- **FR-006**: D1 and Turso sessions MUST support schema browsing, table browsing, query execution, and result inspection using the same core workflow locations used for existing SQL connections, unless the target service blocks that action.
- **FR-007**: When D1 or Turso behavior differs from local SQLite, the product MUST explain the limitation before or immediately after the attempted action.
- **FR-008**: Redis connections MUST support both connection-string and structured connection entry, including authenticated and encrypted connection settings.
- **FR-009**: Redis workspace MUST provide list and tree views of keys, namespace grouping, key search, key-type filters, and logical database switching when the target server exposes multiple logical databases.
- **FR-010**: Redis workspace MUST support viewing and editing strings, hashes, lists, sets, sorted sets, streams, and JSON values when those data types are available on the target server.
- **FR-011**: Redis workspace MUST provide a command workbench with inline command guidance, completion assistance, and formatted result views.
- **FR-012**: Redis workspace MUST provide operational tools for live command monitoring, slow-operation review, memory/keyspace analysis, and bulk key actions with explicit confirmation before destructive changes.
- **FR-013**: MongoDB connections MUST support standard and DNS seedlist connection strings plus advanced connection settings for authentication, transport security, and cluster targeting.
- **FR-014**: MongoDB workspace MUST provide sidebar navigation of databases and collections and allow users to inspect documents in both grid-like and JSON-oriented views.
- **FR-015**: MongoDB workspace MUST allow users to filter, sort, limit, project, and page document results using MongoDB-native query syntax and user-assisted query building.
- **FR-016**: MongoDB workspace MUST provide collection schema analysis based on sampled documents, including field types, nested structures, sparsity, common values, and distribution summaries.
- **FR-017**: MongoDB workspace MUST provide an aggregation workflow where users can compose, run, inspect, and save multi-stage pipelines.
- **FR-018**: MongoDB workspace MUST surface collection metadata that affects query behavior and safe data changes, including index visibility when the connected user is permitted to see it.
- **FR-019**: All new workspaces MUST support read-only operation and require confirmation for destructive actions.
- **FR-020**: When the connected account lacks permission or the target service omits an optional capability, the product MUST show an actionable unavailable-state or error instead of failing silently.
- **FR-021**: System MUST derive visible navigation, panels, and tools from the active connection family so SQL/RDS-only features are hidden for Redis and MongoDB connections, and Redis/MongoDB-only surfaces are hidden for SQL-family connections.

### Key Entities _(include if feature involves data)_

- **Connection Profile**: A saved set of connection details, display metadata, safety mode, and last-known capability context for a specific data source.
- **Managed SQLite Session**: A live HeraQ session for a remote SQLite-compatible service such as Cloudflare D1 or Turso, including its active database identity and, for Turso, the active branch or variant.
- **Redis Workspace Session**: A Redis-focused workspace containing the selected logical database, browser filters, command history, and operational tool state.
- **MongoDB Workspace Session**: A MongoDB-focused workspace containing the selected database, collection, query state, schema analysis state, and saved aggregation context.
- **Capability State**: The set of allowed, blocked, read-only, or unavailable actions HeraQ derives from the connected service, edition, and user privileges.

### Assumptions

- Existing HeraQ SQL workflows remain the baseline experience for Cloudflare D1 and Turso after connection.
- Manual connection entry is required for the first release; vendor-side discovery or provisioning flows may be added later but are not required here.
- "RedisInsight-like" and "MongoDB Compass-style" mean familiar task flows and information architecture, not a pixel-identical recreation of branded layouts or assets.
- Large Redis and MongoDB datasets will be handled through filtering, pagination, and sampling rather than full eager loading.

### Dependencies

- Users must have the Cloudflare, Turso, Redis, or MongoDB credentials and permissions needed for the actions they attempt.
- Cloudflare D1 remote query access must be available for the selected account and database.
- Turso branch-aware workflows depend on the selected account exposing more than one accessible branch or equivalent variant.
- Redis and MongoDB advanced views depend on the connected service exposing the commands, metadata, and privileges those views require.

### Out of Scope

- Creating vendor accounts or provisioning new Cloudflare D1, Turso, Redis, or MongoDB infrastructure from inside HeraQ.
- Reproducing Redis Copilot, Redis Data Integration authoring, or other vendor-specific assistant features.
- Pixel-for-pixel cloning of RedisInsight or MongoDB Compass branding, proprietary artwork, or exact layout chrome.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of pilot users can create and validate a working connection for each newly supported source type in under 3 minutes using the credentials normally provided by their host or platform.
- **SC-002**: During launch validation, at least 95% of browse or query actions against small-to-medium datasets return either an initial result set or an actionable error within 5 seconds.
- **SC-003**: Pilot users can reach a meaningful first data view after connecting in two or fewer navigation steps for Redis and MongoDB, and in one workspace switch for D1 and Turso.
- **SC-004**: At least 90% of pilot users who already use RedisInsight or MongoDB Compass report that HeraQ feels familiar enough to complete their first key or document inspection without outside help.
- **SC-005**: Fewer than 5% of pilot sessions end with an unrecoverable permission or capability error that does not also tell the user what to do next.
