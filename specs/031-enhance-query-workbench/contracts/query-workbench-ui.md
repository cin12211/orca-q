# Query Workbench UI Contract

## 1. Quick-Query Update Preview Contract

**Actor**: User editing a function or procedure in quick query.

**Trigger**: User requests save or preview from the editable detail view.

**Contract**:

- The UI generates the exact SQL statement that would be submitted for the current edit.
- The preview is read-only.
- No mutation is committed until the user explicitly confirms the save from the preview flow.
- If no effective change exists, the preview must state that no update will be submitted.

**Success Response**:

- Preview content matches the submitted statement exactly.
- Confirming the preview continues the existing save flow.

**Failure Response**:

- Invalid or unsupported updates produce an inline error or modal error state without mutating the underlying object.

## 2. Raw Query Commented Placeholder Contract

**Actor**: User running raw SQL with optional bind variables.

**Input**:

- SQL text that may include executable placeholders and comment-only placeholder examples.
- Variable JSON/value payload from the existing raw-query workflow.

**Contract**:

- Placeholder detection must inspect executable SQL only.
- `:name` text inside valid SQL comments must not be treated as a required parameter.
- Executable placeholders continue to bind using the current database-family transport rules.

**Success Response**:

- The query executes when the executable SQL is valid and the required real parameters are present.

**Failure Response**:

- Errors identify true executable-SQL issues, not comment-only placeholder text.

## 3. Workspace Tab Shortcut Contract

**Actor**: User navigating from the workspace tab header.

**Triggers**:

- Click first-tab `SQL` shortcut.
- Open plus-tab menu.

**Contract**:

- The first-tab shortcut opens `sample.sql` for the active workspace, creating it only if absent.
- The plus-tab menu exposes three actions: create raw SQL file, open schema browser, open instance insight.
- New raw SQL files use the next collision-free `new-file(-n)` name and open immediately after creation.
- Schema browser and instance insight open as new workspace tabs without mutating the active file content.

## 4. Schema Loading Feedback Contract

**Actor**: User opening or refreshing schema browsing for a large connection.

**Contract**:

- The UI must show a loading state immediately when schema enumeration starts.
- If loading becomes long-running, the UI must continue showing that work is active through a waiting/progress message.
- Completion and failure states must replace the waiting state explicitly.
