# Tasks: Import/Export Migration Compatibility Check

**Feature**: `022-import-export-migration-check`  
**Branch**: `022-import-export-migration-check`  
**Generated**: 2026-04-17  
**Context inputs**: user description + codebase exploration (021 migration system, useDataExport.ts, useDataImport.ts)

---

## Tóm tắt yêu cầu

Hiện tại flow backup/restore **không lưu thông tin schema version** vào file backup.  
Khi import một file backup cũ hơn hoặc mới hơn app hiện tại, dữ liệu có thể không tương thích.

**Hai trường hợp cần xử lý:**

| Trường hợp | Phát hiện | Hành động |
|---|---|---|
| Backup **cũ hơn** app | backup.schemaVersion ⊂ app migrations | Import → reset applied set → `runMigrations()` tự động bù gap |
| Backup **mới hơn** app | backup.schemaVersion có tên migration app chưa biết | Block import, hiện popup "Update App" |

---

## Design: Import Flow Mới

```
parse JSON
    │
    ├─ isValidBackup()?  ────── No ──▶ error: "Invalid backup file"
    │
    ├─ checkCompatibility(backup.schemaVersion)
    │       │
    │       ├─ has unknown migration names? ─── Yes ──▶ show IncompatibleBackupDialog (US2)
    │       │                                           (stop import)
    │       └─ compatible ────────────────── No ──▶ continue
    │
    ├─ replaceAll collections (existing code)
    │
    ├─ [NEW] localStorage[APPLIED_KEY] = backup.schemaVersion ?? []
    │
    ├─ [NEW] await runMigrations()  ← applies only gap migrations
    │
    └─ reload stores (existing code)
```

## Design: BackupData v1 (backward compat)

```typescript
export interface BackupData {
  version: number;         // stays 1
  exportedAt: string;
  schemaVersion: string[]; // NEW — applied migration names at export time
  persist: Record<PersistCollection, unknown[]>;
  agent: { histories: unknown[] };
}
```

`schemaVersion` is optional on read (old backups without it → treated as `[]` → all migrations run after import, safe).

---

## Phase 1 — Setup / Foundational

**Purpose**: Export `APPLIED_KEY` constant + create compatibility utility. Both are blocking prerequisites for all user stories.

- [X] T001 Export `APPLIED_KEY` constant from `core/persist/migration/MigrationRunner.ts` — change `const APPLIED_KEY` to `export const APPLIED_KEY = 'orcaq-applied-migrations-v1'`; also export `getApplied(): Set<string>` as a named export so both export hook and import hook can read the current applied set without duplicating localStorage logic
- [X] T002 Create `core/persist/migration/compatibility.ts` — export `checkImportCompatibility(backupSchemaVersion: string[]): { compatible: true } | { compatible: false; unknownMigrations: string[] }`; logic: `appKnownNames = new Set(ALL_MIGRATIONS.map(m => m.name))`; `unknown = backupSchemaVersion.filter(name => !appKnownNames.has(name))`; return `{ compatible: false, unknownMigrations: unknown }` if unknown.length > 0, else `{ compatible: true }`; import `ALL_MIGRATIONS` from `~/core/persist/migration`
- [X] T003 Re-export `checkImportCompatibility` from `core/persist/migration/index.ts` — add `export { checkImportCompatibility } from './compatibility'`

**Checkpoint**: Utilities ready → US1 export + US2 UI + US3 import logic can all begin

---

## Phase 2 — User Story 1: Stamp Schema Version on Export (P1)

**Goal**: File exported bởi `useDataExport.ts` chứa field `schemaVersion: string[]` = danh sách tên migration đã applied tại thời điểm export.

**Independent Test**: Export → mở JSON → kiểm tra `schemaVersion` là array các tên migration strings (ví dụ `["AddTagIdsToConnections1740477873001", ...]`).

- [X] T004 [US1] Update `BackupData` interface in `components/modules/settings/hooks/useDataExport.ts` — add `schemaVersion: string[]` field between `exportedAt` and `persist`; import `getApplied` from `~/core/persist/migration`
- [X] T005 [US1] Populate `schemaVersion` when building backup object in `useDataExport.ts` — inside `exportData()`, after collecting `persist`, add `schemaVersion: [...getApplied()]` to the `backup` object literal; ensure the field is serialised into the downloaded JSON

**Checkpoint**: Any newly created backup JSON contains `schemaVersion`. Old backups remain valid (field is absent = treated as `[]` on import).

---

## Phase 3 — User Story 2: Block Import of Incompatible Backups (P1)

**Goal**: Khi `backup.schemaVersion` chứa migration names mà app hiện tại chưa biết → hiển thị dialog thông báo không hỗ trợ, liệt kê các migration lạ, cung cấp nút "Update App". Import không thể tiến hành.

**Independent Test**: Tạo fake backup JSON với `schemaVersion: ["UnknownFutureMigration9999"]` → kéo thả vào RestoreDataPanel → popup xuất hiện, nút Confirm Import bị disabled, không có dữ liệu nào được ghi vào storage.

- [X] T006 [P] [US2] Create `components/modules/settings/components/backup-restore/IncompatibleBackupDialog.vue` — Dialog (shadcn) hiển thị: title "Backup Not Compatible", mô tả "This backup was created with a newer version of OrcaQ. Update the app to import it.", danh sách `unknownMigrations` prop (dạng code badges), nút primary "Update OrcaQ" (`href` tới GitHub releases page hoặc trigger electron auto-update), nút secondary "Cancel"; props: `open: boolean`, `unknownMigrations: string[]`; emit: `update:open`
- [X] T007 [P] [US2] Export `IncompatibleBackupDialog` from `components/modules/settings/components/backup-restore/index.ts`
- [X] T008 [US2] Update `isValidBackup()` in `useDataImport.ts` — remove strict `version === 1` check that would reject backups with `schemaVersion` field (the field is additive); keep checking `version` exists and `persist` exists; `schemaVersion` is optional (may be absent in old backups)
- [X] T009 [US2] Add `incompatibleMigrations` ref and `showIncompatibleDialog` ref to `useDataImport.ts` composable — `incompatibleMigrations: Ref<string[]>`; `showIncompatibleDialog: Ref<boolean>`; import `checkImportCompatibility` from `~/core/persist/migration`
- [X] T010 [US2] Add compatibility check inside `doImport()` in `useDataImport.ts` — after `isValidBackup()` passes, extract `backupSchemaVersion = rawData.schemaVersion ?? []`; call `checkImportCompatibility(backupSchemaVersion)`; if `!compatible`: set `incompatibleMigrations.value = unknownMigrations`, set `showIncompatibleDialog.value = true`, set `isImporting.value = false`, return early (do NOT write any data)
- [X] T011 [US2] Wire `IncompatibleBackupDialog` into `RestoreDataPanel.vue` — import dialog component; bind `v-model:open="showIncompatibleDialog"` and `:unknown-migrations="incompatibleMigrations"`; dialog should overlay on top of the restore panel without closing it

**Checkpoint**: Import of a "future" backup is fully blocked with informative UI. Compatible backups continue as before.

---

## Phase 4 — User Story 3: Auto-Apply Gap Migrations on Import (P1)

**Goal**: Khi backup đến từ app cũ hơn (hoặc không có `schemaVersion`), sau khi ghi dữ liệu vào storage, tự động chạy các migration còn thiếu. Người dùng không cần làm gì thêm.

**Logic chi tiết**:
1. Write imported data to storage (existing `replaceAll` calls)
2. Reset `localStorage[APPLIED_KEY]` = `backup.schemaVersion ?? []`
3. Call `runMigrations()` → runner reads applied set, runs only gap migrations in order
4. Applied set is now up-to-date in localStorage

**Vì sao an toàn**: Migration runner là idempotent, name-sorted, và chỉ chạy migration chưa có trong applied set. Bước 2 đặt applied set về đúng trạng thái của backup, bước 3 bù đúng phần còn thiếu.

**Independent Test**: Tạo backup với `schemaVersion: []` (mô phỏng backup rất cũ, chưa có migration nào) → import → sau khi import xong, `localStorage[APPLIED_KEY]` phải chứa tất cả migration names hiện tại của app → dữ liệu đã được migrate đúng.

- [X] T012 [US3] Import `APPLIED_KEY` and `runMigrations` into `useDataImport.ts` — add imports: `import { APPLIED_KEY, runMigrations } from '~/core/persist/migration'`
- [X] T013 [US3] After all `replaceAll` calls succeed in `doImport()`, reset the applied migrations set in localStorage — add: `const backupSchemaVersion = (rawData as BackupData).schemaVersion ?? []; localStorage.setItem(APPLIED_KEY, JSON.stringify(backupSchemaVersion));` — this MUST happen after data is written but before `runMigrations()`
- [X] T014 [US3] Call `await runMigrations()` immediately after resetting localStorage applied set — add `await runMigrations()` before store reload calls; this runs only the gap migrations needed to bring imported data up to current app schema; wrap in try/catch: if migration fails, set `error.value = 'Import succeeded but schema upgrade failed. Restart the app to retry.'`
- [X] T015 [US3] Update progress reporting in `doImport()` — adjust progress steps to account for the new migration step: data write = 10–75%, localStorage reset = 75%, `runMigrations()` = 75–90%, store reload = 90–100%

**Checkpoint**: Full import flow with migration gap handling is complete.

---

## Phase 5 — Polish & Verification

- [X] T016 [P] Verify TypeScript: run `npx vue-tsc --noEmit` — zero new errors; confirm `BackupData.schemaVersion` is typed as `string[]`; confirm `incompatibleMigrations` and `showIncompatibleDialog` are exported from `useDataImport` return value
- [X] T017 [P] Manual test — incompatible: craft a JSON with `{"version":1,"exportedAt":"...","schemaVersion":["FutureMigration9999"],"persist":{},"agent":{"histories":[]}}` → drag into RestoreDataPanel → dialog appears → no data written
- [X] T018 [P] Manual test — gap migration: clear all IDB data → import a backup where `schemaVersion:[]` → confirm `localStorage['orcaq-applied-migrations-v1']` = full migration list after import
- [X] T019 [P] Manual test — old backup (no schemaVersion): import a backup without `schemaVersion` field → import succeeds → migrations run → no error
- [X] T020 [P] Manual test — same version: export → immediately re-import → `runMigrations()` runs but applies 0 migrations (all already in applied set from backup's `schemaVersion`) → import succeeds, progress reaches 100%
- [X] T021 [P] Verify `getApplied` export does not break existing `runMigrations` boot-time call in `plugins/01.migration.client.ts` — run app in dev mode → migration screen completes without error

---

## Dependencies

```
T001 → T002 → T003           (foundation, must complete before all US)

T003 → T004 → T005           (US1: export chain)

T003 → T008
T003, T008 → T009
T003, T009 → T010            (US2: import validation)
T006 → T007 → T011           (US2: UI)
T010 + T011 → US2 complete

T001, T005 → T012
T012 → T013 → T014 → T015   (US3: gap migration, must run AFTER US1 export so schemaVersion exists)

T015 → T016–T021             (Polish: after all implementation complete)
```

## Parallel Execution per Story

```
US1 (T004 → T005)            — sequential (T005 needs BackupData interface from T004)
US2 (T006, T008 parallel → T009 → T010; T006 → T007 → T011)
US3 (T012 → T013 → T014 → T015) — sequential
Polish (T016–T021 all parallel after T015)
```

## Suggested MVP

**US1 + US2 only** (T001–T011, T016–T017) — covers the critical blocking case (import future backup) and stamps schemaVersion on export. US3 (gap migration) can be done in a second pass if needed urgently.
