# Tasks — 023: Migration State Entity Storage

**Goal:** Replace `localStorage` tracking of applied IDB migrations with a dedicated `MigrationState` entity
persisted through the standard storage layer (IDB browser / SQLite Electron). Once part of
`PERSIST_COLLECTIONS`, migration version data is automatically included in every export and
correctly restored on import — without special-case `localStorage.setItem` logic.

**User Stories:**

- **US1** — As a developer, I want `migrationState` to be a first-class storage entity (IDB + SQLite)
  so it is included in `PERSIST_COLLECTIONS` and exported/imported like every other collection.
- **US2** — As a developer, I want `MigrationRunner` to read/write the applied set from
  `migrationStateStorage` (primary) with a localStorage fallback, eliminating the dependency on
  raw `localStorage` for migration tracking.
- **US3** — As a user, when I import a backup the migration state is restored via the normal
  collection flow, so gap migrations run automatically and no manual `localStorage.setItem` hack
  is needed in `useDataImport.ts`.

---

## Phase 1 — Setup

- [X] T001 Create `specs/023-migration-state-entity/` directory (this file is the artifact)

---

## Phase 2 — Foundation: Entity Type + Collection Registration

**Goal:** register `migrationState` as a first-class collection across both IDB and Electron layers.

- [X] T002 Define `MigrationState` entity interface in `core/types/entities/migration-state.entity.ts`
  ```ts
  // id is always 'applied-migrations' (single-record entity)
  // names: sorted list of migration names applied at export time
  export interface MigrationState { id: 'applied-migrations'; names: string[] }
  ```

- [X] T003 [P] Export `MigrationState` from `core/types/entities/index.ts`

- [X] T004 Add `'migrationState'` to `PersistCollection` union type, `PERSIST_COLLECTIONS` array,
  and `IDB_STORES` record (with a new localforage instance `migrationStateIDB / migrationState`)
  in `core/persist/adapters/idb/primitives.ts`

- [X] T005 Add `'migrationState'` to the `PersistCollection` union type in
  `electron/persist/store.ts` so Electron's generic store functions recognise the collection

---

## Phase 3 — US1: IDB Storage Class

**Story goal:** A `MigrationStateStorage` class backed by localforage that exposes `get()` / `save()` / `clear()` — mirroring the pattern of `AppConfigStorage`.

**Independent test criteria:** After calling `migrationStateStorage.save(['m-001', 'm-002'])`, a subsequent `migrationStateStorage.get()` returns `{ id: 'applied-migrations', names: ['m-001', 'm-002'] }`.

- [X] T006 [P] [US1] Create `MigrationStateStorage` class in `core/storage/entities/MigrationStateStorage.ts`
  - extends `IDBStorage<{ id: string; names: string[] }>` (or `IDBStorage<MigrationState>`)
  - `readonly KEY = 'applied-migrations'`
  - `get(): Promise<MigrationState | null>` — reads the single record
  - `save(names: string[]): Promise<void>` — upserts `{ id: KEY, names }`
  - `clear(): Promise<void>` — deletes the single record
  - constructor: `super({ dbName: 'migrationStateIDB', storeName: 'migrationState' })`

- [X] T007 [US1] Export `migrationStateStorage` singleton from `core/storage/entities/index.ts`

- [X] T008 [US1] Add `MigrationStateStorageApi` interface to `core/storage/types.ts`:
  ```ts
  export interface MigrationStateStorageApi {
    get(): Promise<MigrationState | null>;
    save(names: string[]): Promise<void>;
    clear(): Promise<void>;
  }
  ```
  Add `migrationStateStorage: MigrationStateStorageApi` property to `StorageApis`

- [X] T009 [US1] Wire `migrationStateStorage` into `createIDBStorageApis()` in `core/storage/factory.ts`:
  ```ts
  migrationStateStorage: {
    get: () => migrationStateStorage.get(),
    save: names => migrationStateStorage.save(names),
    clear: () => migrationStateStorage.clear(),
  },
  ```

---

## Phase 4 — US1: Electron SQLite Storage

**Story goal:** A `MigrationStateSQLiteStorage` class backed by a `migration_state` SQLite table, wired into `electron/persist/store.ts` so `persistGetAll('migrationState')` and `persistReplaceAll('migrationState', [...])` work correctly.

**Independent test criteria:** After `persistReplaceAll('migrationState', [{ id: 'applied-migrations', names: ['m-001'] }])`, a call to `persistGetAll('migrationState')` returns the same record.

- [X] T010 [P] [US1] Create `electron/persist/migration/versions/v003-add-migration-state.ts`:
  ```sql
  CREATE TABLE IF NOT EXISTS migration_state (
    id   TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  ```
  Export a `up(db)` function following the pattern of `v001-initial-schema.ts`

- [X] T011 [P] [US1] Create `MigrationStateSQLiteStorage` in
  `electron/persist/entities/MigrationStateSQLiteStorage.ts`
  - extends `SQLite3Storage<{ id: string; names: string[] }>`
  - `tableName = 'migration_state'`
  - `toRow(record)` → `{ id: record.id, data: JSON.stringify(record.names) }`
  - `fromRow(row)` → `{ id: row.id, names: JSON.parse(row.data as string) }`
  - `get(): Promise<MigrationState | null>` — `getOne('applied-migrations')`
  - `save(names: string[]): Promise<void>` — `upsert({ id: 'applied-migrations', names })`
  - `clear(): Promise<void>` — `delete('applied-migrations')`
  - Override `applyTimestamps` to return entity unchanged (no timestamp columns)
  - Override `addDefaultOrder` to return sql unchanged (single record)

- [X] T012 [US1] Export `migrationStateSQLiteStorage` singleton from `electron/persist/entities/index.ts`

- [X] T013 [US1] Handle `migrationState` in `electron/persist/store.ts`:
  - Import `migrationStateSQLiteStorage` from `./entities`
  - Add `case 'migrationState':` to `getAdapter()` returning `migrationStateSQLiteStorage`
  - Add special-case to `persistGetAll()`:
    ```ts
    if (collection === 'migrationState') {
      const record = await migrationStateSQLiteStorage.get();
      return record ? [record as unknown as RecordValue] : [];
    }
    ```
  - Add special-case to `persistReplaceAll()`:
    ```ts
    if (collection === 'migrationState') {
      if (values.length > 0) await migrationStateSQLiteStorage.save(
        (values[0] as { names: string[] }).names ?? []
      );
      else await migrationStateSQLiteStorage.clear();
      return;
    }
    ```

- [X] T014 [US1] Wire `migrationStateSQLiteStorage` into `createElectronStorageApis()` in
  `core/storage/factory.ts`:
  ```ts
  migrationStateStorage: {
    get: () => migrationStateSQLiteStorage.get() as Promise<MigrationState | null>,
    save: names => migrationStateSQLiteStorage.save(names),
    clear: () => migrationStateSQLiteStorage.clear(),
  },
  ```
  Add required imports for `migrationStateSQLiteStorage` and `MigrationState`

---

## Phase 5 — US2: MigrationRunner Reads from Entity Storage

**Story goal:** `getApplied()` becomes async and reads from `migrationStateStorage` (IDB) with a
localStorage fallback for users upgrading from a pre-023 install. `saveApplied()` dual-writes to
both to keep localStorage in sync during the transition window.

**Independent test criteria:** Clearing `localStorage['orcaq-applied-migrations-v1']` and seeding
`migrationStateStorage` with `['m-001']` causes `getApplied()` to return `Set { 'm-001' }`.

- [X] T015 [US2] Update `MigrationRunner.ts`:
  - Import `migrationStateStorage` from `~/core/storage/entities/MigrationStateStorage`
  - Change `getApplied()` to `async`:
    ```ts
    export async function getApplied(): Promise<Set<string>> {
      // Primary: IDB entity storage
      const record = await migrationStateStorage.get();
      if (record && record.names.length > 0) return new Set(record.names);
      // Fallback: legacy localStorage (pre-023 installs)
      try {
        const raw = localStorage.getItem(APPLIED_KEY) ?? '[]';
        return new Set(JSON.parse(raw) as string[]);
      } catch { return new Set(); }
    }
    ```
  - Change `saveApplied(names: Set<string>)` to `async`:
    ```ts
    async function saveApplied(names: Set<string>): Promise<void> {
      const arr = [...names];
      await migrationStateStorage.save(arr);                  // primary
      localStorage.setItem(APPLIED_KEY, JSON.stringify(arr)); // compat fallback
    }
    ```
  - In `executeMigrations()`: change `const applied = getApplied()` → `const applied = await getApplied()`
  - Change `saveApplied(applied)` → `await saveApplied(applied)` (inside the loop)

- [X] T016 [US2] Update `core/persist/migration/index.ts`:
  - `getApplied` is re-exported from `MigrationRunner` — the async signature propagates automatically
  - Remove `APPLIED_KEY` from the public re-export if no external callers need it after Phase 6
    (keep if `useDataImport.ts` still references it after T017)

---

## Phase 6 — US3: Import / Export Flow Update

**Story goal:** `useDataExport.ts` awaits the now-async `getApplied()`. `useDataImport.ts` drops
the manual `localStorage.setItem(APPLIED_KEY, ...)` step — migration state is restored via the
normal `replaceAll` flow. Old backups (pre-022) are handled via a one-time seed fallback.

**Independent test criteria:**
- Importing a new-format backup (has `persist.migrationState`) restores the migration list without touching `localStorage` manually.
- Importing an old-format backup (has `schemaVersion` only) seeds `migrationStateStorage` from `schemaVersion` before calling `runMigrations()`, so no extra migrations run.

- [X] T017 [US3] Update `useDataExport.ts` in
  `components/modules/settings/hooks/useDataExport.ts`:
  - Change `schemaVersion: [...getApplied()]` → `schemaVersion: [...await getApplied()]`
    (kept for backward compat with older app versions reading this backup)
  - No other changes needed — `migrationState` is now in `PERSIST_COLLECTIONS` so it appears
    automatically in `persist` via `collectIdbData()` / `collectElectronData()`

- [X] T018 [US3] Update `useDataImport.ts` in
  `components/modules/settings/hooks/useDataImport.ts`:

  **Compatibility check source** — update to use new primary source:
  ```ts
  const migrationRecord = (rawData as BackupData).persist?.migrationState?.[0] as
    { names?: string[] } | undefined;
  const backupSchemaVersion =
    migrationRecord?.names ?? (rawData as BackupData).schemaVersion ?? [];
  ```

  **Remove the manual localStorage reset** — delete the line:
  ```ts
  localStorage.setItem(APPLIED_KEY, JSON.stringify(backupSchemaVersion));
  ```

  **Add seed fallback for old backups** — after the collections restore loop, add:
  ```ts
  // Old backups (pre-023) have no migrationState collection. Seed from schemaVersion
  // so the runner skips already-applied migrations instead of re-running them all.
  const restoredMigState = await migrationStateStorage.get();
  if (!restoredMigState && backupSchemaVersion.length > 0) {
    await migrationStateStorage.save(backupSchemaVersion);
  }
  ```

  **Remove `APPLIED_KEY` import** — no longer used in this file

  Add import: `import { migrationStateStorage } from '~/core/storage/entities/MigrationStateStorage'`

---

## Phase 7 — Polish

- [X] T019 Run `npx vue-tsc --noEmit` from repo root — verify 0 new TypeScript errors
  (2 pre-existing `@typed-router/__paths` errors are expected and unrelated)

---

## Dependencies

```
T002 → T003 → T004                   Foundation types
T006 → T007 → T008 → T009            IDB storage chain (US1-browser)
T010, T011 → T012 → T013 → T014      SQLite storage chain (US1-electron)
T004, T009, T014 → T015 → T016       Runner update (US2) — needs storage wired first
T016 → T017                           Export await (US3)
T015, T016 → T018                     Import cleanup (US3)
T009, T014, T015, T017, T018 → T019  Final type check
```

## Parallel Execution per Story

**US1 (IDB + SQLite can be done in parallel):**
```
T006 (IDB class) ∥ T010 (SQLite DDL) ∥ T011 (SQLite class)
then T007 → T008 → T009  (IDB wire-up)
     T012 → T013 → T014  (SQLite wire-up)
```

**US2 (sequential — depends on US1 complete):**
```
T015 → T016
```

**US3 (T017 ∥ T018 once US2 done):**
```
T017 ∥ T018 → T019
```

## Implementation Strategy

**MVP scope (US1 + US2):** T002–T016 — entity exists, runner uses it, data is in backup automatically.
**US3** adds the import simplification; without it the import still works (old `localStorage` path runs in parallel).

## Summary

| Phase | Tasks | Description |
|---|---|---|
| Foundation | T002–T005 | Type + collection registration (IDB + Electron) |
| US1 IDB | T006–T009 | `MigrationStateStorage` class + factory wire |
| US1 SQLite | T010–T014 | `MigrationStateSQLiteStorage` + store.ts + factory |
| US2 Runner | T015–T016 | Async `getApplied` / `saveApplied` |
| US3 Flow | T017–T018 | Export `await`, import cleanup + seed fallback |
| Polish | T019 | Type check |
| **Total** | **18 tasks** | |
