# Feature 025 — Cleanup Migration Legacy Patterns

> **Goal:** Vì đây là bản Electron đầu tiên nên không có legacy electron-store data → xóa v002 migration.
> Move `migration_state` DDL vào v001 initial schema. Xóa localStorage fallback khỏi `getApplied()`.
> Xóa FLAG pattern trong tất cả IDB migration versions vì migration runner đã tự track applied set.

---

## Phase 1 — Electron SQLite Schema Consolidation

**Goal:** Đưa `migration_state` table vào v001 initial schema (đúng chỗ), xóa v002 vì app chưa có user nào.

- [X] T001 Add `migration_state` DDL inside v001 initial schema in `electron/persist/migration/versions/v001-initial-schema.ts` — append `CREATE TABLE IF NOT EXISTS migration_state (id TEXT PRIMARY KEY, data TEXT NOT NULL);` vào cuối block `db.exec(...)` trước khi đóng backtick, cùng với các bảng khác trong initial schema

- [X] T002 Delete `electron/persist/migration/versions/v002-migrate-electron-store.ts` — file này migrate legacy electron-store JSON files sang SQLite, nhưng vì đây là bản app đầu tiên nên không có legacy data; cũng xóa `migration_state` DDL đã được thêm vào đây ở feature 024 (bây giờ nằm đúng chỗ trong v001)

- [X] T003 Update `electron/persist/migration/runner.ts` — remove `import { up as v002 } from './versions/v002-migrate-electron-store'`; update MIGRATIONS array thành chỉ còn `[{ version: 1, up: v001 }]`

---

## Phase 2 — MigrationRunner: Remove localStorage Fallback

**Goal:** `getApplied()` chỉ dùng IDB entity (feature 023). Không còn localStorage fallback vì đây là bản đầu tiên.

- [X] T004 Simplify `getApplied()` in `core/persist/migration/MigrationRunner.ts` — remove entire try/catch localStorage fallback block; remove `APPLIED_KEY` constant export; new implementation:
  ```ts
  export async function getApplied(): Promise<Set<string>> {
    const record = await migrationStateStorage.get();
    if (record) return new Set(record.names);
    return new Set();
  }
  ```

- [X] T005 Simplify `saveApplied()` in `core/persist/migration/MigrationRunner.ts` — remove `localStorage.setItem(APPLIED_KEY, ...)` dual-write; new implementation:
  ```ts
  async function saveApplied(names: Set<string>): Promise<void> {
    await migrationStateStorage.save([...names]);
  }
  ```

- [X] T006 Remove `APPLIED_KEY` re-export from `core/persist/migration/index.ts` — change `export { APPLIED_KEY, getApplied } from './MigrationRunner'` to `export { getApplied } from './MigrationRunner'`

---

## Phase 3 — IDB Migration Versions: Remove FLAG Pattern

**Goal:** Migration runner đã tự track applied set trong `migrationStateStorage` → FLAG dùng localStorage là redundant; xóa hết FLAG logic, giữ nguyên business logic của mỗi migration.

- [X] T007 [P] Remove FLAG from `MigrateLegacyAppConfig1740477873005.ts` in `core/persist/migration/versions/` — remove `const FLAG = 'orcaq-legacy-app-config-migrated-v1'`; remove `if (storage.getItem(FLAG) === 'true') return;` at top of `up()`; remove all `storage.setItem(FLAG, 'true')` calls (2 occurrences — one in the `if (existing)` branch, one at end); keep `const storage = getPlatformStorage()` và tất cả logic đọc/xóa legacy localStorage keys (`LEGACY_APP_CONFIG_STORAGE_KEY`) vì đó là business logic thật sự

- [X] T008 [P] Remove FLAG from `MigrateLegacyAgentState1740477873006.ts` in `core/persist/migration/versions/` — remove `const FLAG = 'orcaq-legacy-agent-state-migrated-v1'`; remove `if (storage.getItem(FLAG) === 'true') return;` at top; remove all `storage.setItem(FLAG, 'true')` calls (2 occurrences — one in `if (existing)` branch, one at end of function); keep `const storage = getPlatformStorage()` và toàn bộ logic đọc/xóa `LEGACY_AGENT_STORAGE_KEYS`

- [X] T009 [P] Remove FLAG from `MigrateRowQueryVariablesToFileMetadata1740477873007.ts` in `core/persist/migration/versions/` — remove `const FLAG = 'orcaq-row-query-variables-migrated-v1'`; remove `import { getPlatformStorage } from '~/core/persist/storage-adapter'` (không còn dùng storage); remove `const storage = getPlatformStorage();` line; remove `if (storage.getItem(FLAG) === 'true') return;` at top; remove cả 2 `storage.setItem(FLAG, 'true')` calls (một trong `if (!hasLegacyVariables)` block, một ở cuối); giữ nguyên toàn bộ `getAll`/`replaceAll` data migration logic

- [X] T010 [P] Remove FLAG from `MigrateLegacyQueryBuilderState1740477873008.ts` in `core/persist/migration/versions/` — remove `LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG` from import (chỉ giữ `isQueryBuilderPersistedState`); remove `import { getPlatformStorage } from '~/core/persist/storage-adapter'`; remove `const storage = getPlatformStorage();` line; remove `if (storage.getItem(LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG) === 'true') return;` at top; remove `storage.setItem(LEGACY_QUERY_BUILDER_STATE_MIGRATION_FLAG, 'true')` at end; giữ nguyên toàn bộ localStorage key scan và IDB save logic

---

## Phase 4 — TypeScript Verification

- [X] T011 Run `npx vue-tsc --noEmit` from project root — verify 0 new errors introduced by changes above; only the 2 pre-existing `@typed-router/__paths` errors in `useTabManagement.ts` and `useTabViewsStore.ts` are expected

---

## Dependencies

```
T001 → (standalone)
T002 → T001 (migration_state phải có trong v001 trước khi xóa v002)
T003 → T002 (cập nhật runner sau khi xóa v002)
T004, T005 → (standalone, cùng file)
T006 → T004 (remove re-export sau khi remove constant)
T007, T008, T009, T010 → (parallel — độc lập nhau)
T011 → all (final check)
```

## Parallel Execution

- T001, T004, T005, T007, T008, T009, T010 có thể chạy song song (file khác nhau)
- T002 phải sau T001
- T003 phải sau T002
- T006 phải sau T004
- T011 phải chạy cuối cùng

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | T001–T003 | Electron SQLite: move DDL to v001, delete v002, update runner |
| 2 | T004–T006 | MigrationRunner: drop localStorage fallback + APPLIED_KEY |
| 3 | T007–T010 | IDB versions: drop redundant FLAG pattern |
| 4 | T011 | TypeScript verification |

**Total: 11 tasks**
