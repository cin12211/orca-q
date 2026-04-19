# Tasks — 024: Fix Migration State DDL — Consolidate into v002

**Context:** Feature 023 created `v003-add-migration-state.ts` (SQLite DDL for `migration_state`
table) but **never registered it in `electron/persist/migration/runner.ts`**. The table does not
exist in SQLite. Since the app has not shipped yet, a separate v003 migration file is unnecessary.

**Audit result — two runtime paths:**

| Check | Web (IDB) | Electron (SQLite via IPC) |
|---|---|---|
| `migrationState` in `PERSIST_COLLECTIONS` | ✅ | ✅ (both union types updated) |
| Entity/storage class | ✅ `MigrationStateStorage` (IDBStorage) | ✅ `MigrationStateSQLiteStorage` |
| Storage registered in factory | ✅ `createIDBStorageApis()` | ✅ `createElectronStorageApis()` via IPC |
| `migration_state` table in SQLite | — | ❌ **MISSING** — v003 never registered |
| `getApplied()` / `saveApplied()` | ✅ IDB primary + localStorage fallback | ✅ IDB (no-op in Electron renderer) |
| Export includes `migrationState` | ✅ auto via PERSIST_COLLECTIONS | ❌ would crash: "no such table" |
| Import restores `migrationState` | ✅ + seed fallback | ❌ would crash: "no such table" |
| `schemaVersion` backward-compat field | ✅ `[...await getApplied()]` | ✅ |

**Root cause:** v003 file was created but MIGRATIONS array in `runner.ts` only has v1 and v2. Any
Electron IPC call to `persistGetAll/ReplaceAll('migrationState')` reaches main process →
`migrationStateSQLiteStorage.get()` → `SELECT * FROM migration_state WHERE id = ?` →
**SQLite error: "no such table: migration_state"**.

**Fix:** Merge the DDL into `v002-migrate-electron-store.ts`; delete `v003-add-migration-state.ts`.

---

## Phase 1 — Fix: Merge DDL into v002 and delete v003

- [X] T001 Add `CREATE TABLE IF NOT EXISTS migration_state` DDL to
  `electron/persist/migration/versions/v002-migrate-electron-store.ts`:
  - Rename function parameter `_db` → `db` (it is now used)
  - At the top of the function body, before the file-migration loop, add:
    ```ts
    db.exec(`
      CREATE TABLE IF NOT EXISTS migration_state (
        id   TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
    `);
    ```
  - Rationale: app not yet delivered → no separate migration version needed;
    `CREATE TABLE IF NOT EXISTS` is idempotent so safe to add here

- [X] T002 Delete `electron/persist/migration/versions/v003-add-migration-state.ts`
  (the DDL it contained is now in v002; it was never registered in runner.ts)

---

## Phase 2 — Audit Verification (no-code)

These tasks are read-verify only — confirm current code is correct after T001/T002.

- [X] T003 Verify `electron/persist/migration/runner.ts` — MIGRATIONS array has exactly
  `[{ version: 1, up: v001 }, { version: 2, up: v002 }]`; v003 is correctly absent;
  `runMigrations(getDB())` is called in `electron/main.ts` BEFORE `createWindow()` ✅

- [X] T004 Verify `electron/persist/store.ts` — `getAdapter('migrationState')` returns
  `migrationStateSQLiteStorage`; `persistGetAll('migrationState')` has special-case; 
  `persistReplaceAll('migrationState', ...)` has special-case with `.save(names)` / `.clear()` ✅

- [X] T005 Verify `electron/persist/entities/MigrationStateSQLiteStorage.ts` — `toRow` stores
  `data: JSON.stringify(record.names)`; `fromRow` parses `JSON.parse(row['data'])`;
  `applyTimestamps` and `addDefaultOrder` are both overridden to return entity/sql unchanged ✅

- [X] T006 Verify `core/persist/adapters/electron/primitives.ts` — `PersistCollection` type
  includes `'migrationState'`; IPC calls route through `window.electronAPI.persist` ✅

- [X] T007 Verify `core/storage/factory.ts`:
  - IDB path: `migrationStateStorage` wired directly from IDB class singleton ✅
  - Electron path: uses `electronPersistGetAll<...>('migrationState')` + `persistReplaceAll`
    (IPC proxy to main process, NOT direct SQLite import from renderer) ✅
  - No `~/electron/persist/...` imports left in factory.ts ✅

- [X] T008 Verify `core/persist/migration/MigrationRunner.ts`:
  - `getApplied()` is async: reads IDB first → localStorage fallback ✅
  - `saveApplied()` is async: dual-writes IDB + localStorage ✅
  - `executeMigrations()` awaits both calls ✅
  - **Note:** In Electron renderer, IDB data migrations are no-ops (all stores empty); this is
    correct and expected — IDB runner runs harmlessly with empty results ✅

- [X] T009 Verify `core/persist/adapters/idb/primitives.ts`:
  - `PersistCollection` union includes `'migrationState'` ✅
  - `PERSIST_COLLECTIONS` array includes `'migrationState'` ✅
  - `IDB_STORES` has `migrationState: localforage.createInstance(...)` entry ✅

- [X] T010 Verify `electron/persist/store.ts` `PersistCollection` union includes `'migrationState'` ✅

- [X] T011 Verify `useDataExport.ts` — `schemaVersion: [...(await getApplied())]` ✅;
  `migrationState` is auto-included in `persist` via `PERSIST_COLLECTIONS` loop ✅;
  both IDB (`collectIdbData`) and Electron (`collectElectronData`) paths covered ✅

- [X] T012 Verify `useDataImport.ts`:
  - Reads `persist.migrationState[0].names` first (023+ format) ✅
  - Falls back to `schemaVersion` (022 format) ✅
  - Seed fallback: if `migrationStateStorage.get()` is null AND `backupSchemaVersion.length > 0`
    → saves to IDB migrationStateStorage ✅
  - No `APPLIED_KEY` import remaining ✅
  - No manual `localStorage.setItem` remaining ✅

---

## Phase 3 — TypeScript Verification

- [X] T013 Run `npx vue-tsc --noEmit` from repo root — verify 0 new errors
  (2 pre-existing `@typed-router/__paths` errors are unrelated and expected)

---

## Dependency Graph

```
T001 → T002 → T003..T012 (verify) → T013
```

T003–T012 are read-only audits with no code changes; run in parallel after T001/T002.

## Summary

| Phase | Tasks | Description |
|---|---|---|
| Fix | T001–T002 | Merge DDL into v002, delete v003 |
| Audit Web | T003, T006–T012 | Verify IDB path is correct end-to-end |
| Audit Electron | T003–T007 | Verify SQLite path after DDL fix |
| TypeScript | T013 | Green build |
| **Total** | **13 tasks** | |
