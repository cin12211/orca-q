# Data Model: Query Workbench Reliability

## 1. Query Update Preview

**Purpose**: Represents the exact SQL that quick-query will submit for a save action before the user confirms it.

**Fields**:

- `connectionId`: Connection owning the edited object.
- `targetType`: `function`, `procedure`, or other future quick-query update target.
- `targetName`: Qualified object name shown to the user.
- `originalDefinition`: Current loaded source before editing.
- `editedDefinition`: Current editor content.
- `previewSql`: Exact SQL statement to be submitted if confirmed.
- `hasChanges`: Whether the edited definition produces a real update.
- `status`: `idle`, `generated`, `confirmed`, `cancelled`, or `failed`.
- `generatedAt`: Timestamp of the latest preview generation.

**Validation Rules**:

- `previewSql` is required when `hasChanges` is `true`.
- `targetType` must be one of the supported quick-query editable object types.
- `confirmed` state is only valid after a successful `generated` state.

**State Transitions**:

- `idle -> generated`
- `generated -> confirmed`
- `generated -> cancelled`
- `generated -> failed`

## 2. Type Alias Rule

**Purpose**: Normalizes raw database type strings into the shared `short_type_name` used across metadata and agent-facing views.

**Fields**:

- `databaseFamily`: `postgres`, `mysql`, `mariadb`, `sqlite`, or `oracle`.
- `matchKind`: `exact`, `prefix`, or `pattern`.
- `rawType`: Source type text or pattern to match.
- `alias`: Normalized short label to emit.
- `preserveModifier`: Whether type modifiers such as length/precision should be retained in the rendered alias.
- `priority`: Rule ordering for overlapping matches.

**Validation Rules**:

- `alias` must be non-empty.
- `priority` must be unique within a database family when rule overlaps are possible.
- `preserveModifier` may only be `true` when the alias format supports modifiers.

**Relationships**:

- Applied by metadata adapters when shaping column records.
- Produces `short_type_name` consumed by management, quick-query, and agent schema features.

## 3. Schema Load Session

**Purpose**: Tracks the user-visible lifecycle of schema enumeration for a connection.

**Fields**:

- `connectionId`: Connection being loaded.
- `status`: `idle`, `loading`, `waiting`, `completed`, or `failed`.
- `startedAt`: Load start timestamp.
- `updatedAt`: Last state update timestamp.
- `statusMessage`: User-facing feedback message.
- `schemaCount`: Number of schemas returned when known.
- `errorMessage`: Failure detail when load fails.

**Validation Rules**:

- `startedAt` is required for any non-`idle` state.
- `errorMessage` is required when `status` is `failed`.
- `schemaCount` may only be populated after payload arrival.

**State Transitions**:

- `idle -> loading`
- `loading -> waiting`
- `loading -> completed`
- `waiting -> completed`
- `loading|waiting -> failed`

## 4. Workspace SQL File

**Purpose**: Represents a persisted raw SQL document opened from workspace tab shortcuts or the plus-tab menu.

**Fields**:

- `workspaceId`: Owning workspace.
- `fileId`: Persisted file identifier.
- `name`: Visible filename such as `sample.sql` or `new-file-2.sql`.
- `content`: Raw SQL file body.
- `source`: `starter`, `manual-create`, or `existing`.
- `createdAt`: Creation timestamp.
- `updatedAt`: Last content update timestamp.

**Validation Rules**:

- `name` must be unique within a workspace.
- The reserved starter shortcut may only target `sample.sql`.
- Auto-generated names must follow the `new-file(-n)` pattern.

**Relationships**:

- Opened by one or more workspace tab views.
- Created and resolved through existing workspace file persistence APIs.

## 5. Null Ordering Preference

**Purpose**: Stores the default null ordering behavior applied to table-oriented result views.

**Fields**:

- `scope`: `global-default` or `view-override`.
- `value`: `unset`, `nulls-first`, or `nulls-last`.
- `source`: `settings` or `quick-query-bar`.
- `updatedAt`: Last time the preference changed.

**Validation Rules**:

- `value` must be one of the three supported states.
- `view-override` may only exist when attached to an active table/query view context.

**Relationships**:

- Global preference is persisted in app config.
- Quick-query bar reads the global default and may temporarily override it for the active view.
