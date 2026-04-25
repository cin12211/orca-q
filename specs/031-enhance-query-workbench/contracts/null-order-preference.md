# Null Order Preference Contract

## Global Preference

**Owner**: Application configuration.

**Allowed Values**:

- `unset`
- `nulls-first`
- `nulls-last`

**Contract**:

- The settings UI persists one global default.
- The persisted default is loaded for future workspaces and sessions using the existing app-config persistence path.
- The user-facing labels remain database-agnostic even when SQL dialect handling differs internally.

## Quick Query Bar Exposure

**Owner**: Active quick-query/table view.

**Contract**:

- The quick-query bar shows the currently effective null-order preference.
- The control can adopt the global default and may provide a local override for the active view.
- If the current database/view cannot apply the requested null ordering directly, the UI must preserve the selected preference while showing that the current result cannot honor it exactly.

## Persistence and Consistency

**Contract**:

- Saving the global preference updates all future views that do not hold an explicit local override.
- Existing table-oriented views must remain stable until the user applies or confirms a change in that view.
