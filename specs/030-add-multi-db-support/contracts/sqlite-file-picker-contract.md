# Desktop Contract: SQLite File Picker

**Feature**: 030-add-multi-db-support  
**Generated**: 2026-04-22  
**Research**: [../research.md](../research.md)

---

## Summary

This contract defines the Electron-only bridge used to select a SQLite database file from the local filesystem. The renderer must never access native dialogs directly; it goes through preload and a main-process IPC handler.

---

## 1. Main-Process Contract

**IPC channel**: `window:pick-sqlite-file`

**Handler location**: `electron/ipc/window.ts`

### Expected behavior

- Opens a native file dialog using `dialog.showOpenDialog(...)`
- Limits selection to a single file
- Applies SQLite-oriented filters such as `db`, `sqlite`, and `sqlite3`
- Returns either a selected absolute file path or a canceled result

### Return shape

```ts
type PickSqliteFileResult =
  | { canceled: true; filePath: null }
  | { canceled: false; filePath: string };
```

### Rules

- The handler MUST be available only in Electron runtime.
- The handler MUST NOT read file contents; it only returns the selected path.
- The handler MUST tolerate a missing main window and fail gracefully.

---

## 2. Preload Contract

**Surface**: `window.electronAPI.window.pickSqliteFile()`

**Exposure point**: `electron/preload.ts`

### Signature

```ts
pickSqliteFile(): Promise<PickSqliteFileResult>
```

### Security requirements

- Expose a narrow wrapper around `ipcRenderer.invoke('window:pick-sqlite-file')`
- Do not expose raw `ipcRenderer` or generic invoke capabilities to renderer code
- Keep the API grouped with existing `window.*` desktop helpers

---

## 3. Renderer Contract

**Primary consumer**: connection creation/edit flow in `components/modules/connection/`

### Expected behavior

- Renderer checks Electron availability before offering the SQLite file action
- On success, the selected absolute path populates the connection form
- On cancel, the current form state remains unchanged
- On non-Electron runtime, the action is unavailable rather than throwing

### UI states

| Runtime                | SQLite option                    | Picker action |
| ---------------------- | -------------------------------- | ------------- |
| Electron desktop       | Visible and selectable           | Enabled       |
| Browser / non-Electron | Hidden or explicitly unavailable | Not callable  |

---

## 4. Persistence Contract

- The selected file path is persisted on the connection profile as `filePath`.
- Reopening a saved SQLite connection reuses `filePath`; it does not require the user to re-pick the file if the file is still accessible.
- If the file is missing or unreadable later, the connection record remains intact and the runtime returns a clear error on open/test.

---

## 5. Failure Modes

| Condition                | Required result                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| User cancels dialog      | `{ canceled: true, filePath: null }`                                                          |
| File later deleted/moved | Health check/open flow returns actionable error                                               |
| Non-Electron runtime     | UI does not expose picker action                                                              |
| Dialog invocation fails  | Promise rejects or returns a structured failure that the UI converts into a user-facing error |
