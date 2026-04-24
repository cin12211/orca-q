# Phase 0 Research: Query Workbench Reliability

## Decision 1: Make bind-parameter detection comment-aware before execution

**Decision**: Reuse the existing SQL normalization utilities and adjust parameter detection so only executable SQL can produce bind parameters; comment-only placeholders such as `:varname` must be ignored.

**Rationale**: The current raw-query flow already has comment stripping utilities in `server/infrastructure/agent/core/sql.ts`, and the closest existing test coverage lives in the raw-query execution suite. Tightening detection around executable SQL fixes the documented parser failure without introducing a new parsing stack for every database family.

**Alternatives considered**:

- Full AST parsing per database family: Rejected because the feature only requires comment-aware placeholder handling, while AST-by-dialect would add substantial complexity and uneven support across PostgreSQL, MySQL/MariaDB, SQLite, and Oracle.
- Ignore placeholder detection and require users to manage variables manually: Rejected because it would leave the reported failure in place and violate FR-002.

## Decision 2: Add a preview step to quick-query function and procedure saves instead of rerouting them through raw-query

**Decision**: Extend the existing quick-query update path with a read-only preview of the exact statement to be submitted, then confirm the current save flow only after the user accepts the preview.

**Rationale**: The current function detail editing path already owns the save interaction. Adding preview there keeps the UX local to the edit surface, exposes the exact submitted SQL as required by FR-003, and avoids broader coupling between quick-query editing and raw-query execution pipelines.

**Alternatives considered**:

- Route quick-query updates through the raw-query executor: Rejected because it would mix two separate UI flows, broaden the regression surface, and make save semantics depend on an editor that is not the origin of the change.
- Save immediately and expose only error details: Rejected because it does not satisfy the preview requirement and would keep users blind to generated update SQL.

## Decision 3: Move `short_type_name` aliasing out of SQL CASE blocks and into shared adapter-side rules

**Decision**: Create one maintained JavaScript/TypeScript alias rule set for short type names and apply it in metadata adapters for all currently supported database families.

**Rationale**: PostgreSQL currently hardcodes many aliases in SQL while MySQL, SQLite, and Oracle largely pass through raw types. A shared rule set removes duplication, makes behavior reviewable in code, and supports the feature requirement that type labels remain consistent anywhere `short_type_name` is shown.

**Alternatives considered**:

- Keep the PostgreSQL SQL CASE block and replicate equivalent CASE logic per database: Rejected because it duplicates mapping logic and makes cross-database consistency difficult to maintain.
- Leave aliases database-specific and rely on UI fallback to `type`: Rejected because it preserves the current inconsistency and fails FR-004/FR-005.

## Decision 4: Represent long schema loads as richer per-connection session state, not a new backend progress API

**Decision**: Extend the existing per-connection schema loading state from a simple boolean into a session object that can surface loading, waiting, completion, and failure messaging while keeping the current metadata endpoint contract.

**Rationale**: The store already tracks loading by connection, and the current fetch returns the schema payload in a single response. A richer client-side session state satisfies the user-facing feedback requirement without introducing a new progress endpoint or streaming protocol.

**Alternatives considered**:

- Add a backend progress API or streaming schema enumeration: Rejected because the current architecture does not expose incremental progress and the feature only requires visible long-load feedback, not true server-side progress percentages.
- Leave the boolean loading flag unchanged and add a generic spinner: Rejected because it does not provide enough state to distinguish long waits from a stalled UI.

## Decision 5: Implement tab shortcuts in the workspace tab layer, not in raw-query result tabs

**Decision**: Add the `sample.sql` shortcut and plus-tab creation menu in the persistent workspace tab layer using the existing tab/file stores.

**Rationale**: The requested actions are workspace-level navigation features. The codebase already separates persistent workspace tabs from raw-query result tabs, so placing shortcut behavior in the workspace tab layer avoids confusing execution-result UI with file/navigation UI.

**Alternatives considered**:

- Add the shortcut and menu to raw-query result tabs: Rejected because result tabs are created after execution and do not represent the full workspace navigation model.
- Create temporary tabs without persisted file backing: Rejected because the feature explicitly requires real `sample.sql` and `new-file(-n)` file behavior.

## Decision 6: Persist null ordering as a global default with a local quick-query control surface

**Decision**: Add a three-state null-order preference (`unset`, `nulls-first`, `nulls-last`) to persisted app config and expose it in both global settings and the quick-query control bar.

**Rationale**: The app already persists table appearance settings through app config. Extending that store keeps preference ownership consistent while still allowing the quick-query bar to surface or override the active choice per view.

**Alternatives considered**:

- Keep null ordering as a quick-query-only toggle: Rejected because the spec requires a global default.
- Encode database-specific sort syntax directly in the settings model: Rejected because the user-facing preference should remain database-agnostic while adapters/query builders handle dialect differences.

## Decision 7: Validate with targeted Vitest projects instead of broad mixed-project runs

**Decision**: Use focused `nuxt` tests for UI/store changes and focused `unit` tests for server-side alias utilities, keeping project runs separated.

**Rationale**: The repository already separates `unit`, `nuxt`, and `e2e` Vitest projects, and recent repo memory notes confirm that broad mixed-project runs can produce misleading timeouts. This keeps plan validation aligned with the current test harness.

**Alternatives considered**:

- Run all tests through a single generic Vitest command: Rejected because it is slower and less reliable for this repository layout.
- Rely only on manual verification: Rejected because parser, metadata, and persisted-setting changes need executable regression coverage.
