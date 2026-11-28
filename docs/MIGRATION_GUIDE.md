# Migration Guide

How OrcaQ upgrades locally persisted data between releases. For where data is
stored in the first place, see [STORAGE_ARCHITECTURE.md](./STORAGE_ARCHITECTURE.md).

## 1. Two Migration Systems

| System                     | Runs in                    | Changes                                   | Tracks progress in                                          |
| -------------------------- | -------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| **Data migrations**        | Renderer (web and desktop) | Document shapes (add/rename/remove field) | List of applied migration names (`migrationState`)          |
| **SQLite schema versions** | Electron main process      | SQLite tables and columns (desktop only)  | `_schema_versions` table, row `table_name = 'app'`, integer |

Desktop users go through both: the main process upgrades the SQLite schema at
startup, then the renderer runs data migrations against that database.

## 2. Data Migrations (Renderer)

### Files

```
core/persist/migration/
├── MigrationInterface.ts   ← abstract class Migration { name; up(); down() }
├── MigrationRunner.ts      ← executeMigrations(), getApplied()
├── platformOps.ts          ← getPlatformOps(): getAll / replaceAll for IDB or Electron
├── compatibility.ts        ← checkImportCompatibility() for backup import
├── index.ts                ← ALL_MIGRATIONS + runMigrations()
└── versions/
    └── <PascalCaseName><timestamp>.ts   ← one class per migration
```

Boot wiring:

- `plugins/01.migration.client.ts` calls `runMigrations()` and reports progress
  to `core/composables/useMigrationState.ts`.
- `components/base/migration-screen/MigrationScreen.vue` (mounted in `app.vue`)
  shows a blocking overlay while the phase is `pending` or `running`.
- `plugins/02.app-initialization.client.ts` hydrates the stores afterwards.

### How the runner works

1. Sorts `ALL_MIGRATIONS` by `name` (ascending). The numeric suffix
   (`...1740477873001`) is what makes the order chronological.
2. Reads the applied names from `migrationStateStorage`
   (`core/storage/entities/MigrationStateStorage.ts`, record id
   `applied-migrations`).
3. For each name not yet applied: awaits `up()`, adds the name, saves the list
   right away, then calls `onStep`.
4. If `up()` throws, the name is not saved, so it is retried on the next boot.
   The plugin catches the error, sets the phase to `error`, and lets the app
   mount anyway.

`down()` exists on every migration but nothing calls it automatically.

### Writing a data migration

1. Create `core/persist/migration/versions/<Name><suffix>.ts`. Use a suffix
   larger than the last one in `index.ts`, so it sorts last.

   ```ts
   import { Migration } from '../MigrationInterface';
   import { getPlatformOps } from '../platformOps';

   export class AddColorToWorkspaces1740477873008 extends Migration {
     readonly name = 'AddColorToWorkspaces1740477873008';

     public async up(): Promise<void> {
       const { getAll, replaceAll } = getPlatformOps();
       const docs = await getAll<{ id: string } & Record<string, unknown>>(
         'workspaces'
       );
       if (docs.every(d => 'color' in d)) return; // idempotent
       await replaceAll(
         'workspaces',
         docs.map(d => ({ ...d, color: d.color ?? null }))
       );
     }

     public async down(): Promise<void> {
       const { getAll, replaceAll } = getPlatformOps();
       const docs = await getAll<{ id: string } & Record<string, unknown>>(
         'workspaces'
       );
       await replaceAll(
         'workspaces',
         docs.map(({ color: _, ...rest }) => rest)
       );
     }
   }
   ```

2. Register it in `core/persist/migration/index.ts` by importing the class and
   adding `new AddColorToWorkspaces1740477873008()` to `ALL_MIGRATIONS`.
3. Add a unit test next to `test/unit/core/persist/migration/MigrationRunner.spec.ts`
   (that file shows how to mock `migrationStateStorage`; mock `platformOps` the
   same way to test `up()` on sample documents).

Collection names come from `PERSIST_COLLECTIONS` in `core/storage/idbRegistry.ts`.

### Rules

- **Never rename or remove a shipped migration.** Its `name` is stored in users'
  data and in backup files. An unknown name in a backup blocks the import.
- **Never change a shipped `up()`.** Users who already ran it will not run it again.
- **Make `up()` idempotent.** It can run again after a partial failure, and
  after a backup import (see §4).
- **Use `getPlatformOps()`**, not the IDB entities, so the migration also works
  on desktop, where `getAll` / `replaceAll` go through IPC to SQLite.
- **On desktop, data migrations cannot add columns.** A field that maps to its
  own SQLite column also needs a schema version (§3) and `toRow` / `fromRow`
  updates; otherwise it is silently dropped on write.

### Does the change need a data migration?

| Change                                                  | Data migration?                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| New optional field the code tolerates being `undefined` | No                                                                       |
| New field the code reads as always present              | Yes, backfill it                                                         |
| Rename, type change, or moving data between collections | Yes                                                                      |
| New field in `appConfig` / `agentState`                 | No: add a default in `core/persist/normalize.ts`                         |
| New collection                                          | No (see STORAGE_ARCHITECTURE §6)                                         |
| New SQLite column (desktop)                             | Schema version (§3), plus a data migration only if old rows need a value |

`appConfig` and `agentState` are single JSON records run through
`normalizeAppConfigState()` / `normalizeAgentState()` on every load, which
fills missing fields from the defaults. Prefer that over a migration.

## 3. SQLite Schema Versions (Electron Main)

### Files

```
electron/persist/
├── knex-db.ts                     ← getKnex(): better-sqlite3 at <userData>/orcaq.db
│                                     (dev: <repo>/.sqlite3/orcaq.db); camelCase ↔ snake_case
├── schema/<table>.ts              ← create<Table>Table(knex) via createTableIfMissing
└── migration/
    ├── runner.ts                  ← MIGRATIONS list + runMigrations(knex)
    └── versions/vNNN-<slug>.ts    ← export async function up(knex)
```

`electron/main.ts` calls `runMigrations(getKnex())` at startup. The runner
creates `_schema_versions` if needed, reads the version of the `app` row, and
runs each newer step in its own transaction, recording the version after it.

Current steps: `v001-initial-schema`, `v002-expand-connections-for-managed-and-nosql`,
`v003-create-mcp-sessions`, `v004-add-connection-broker`.

### Adding a schema version

1. Create `electron/persist/migration/versions/v005-<slug>.ts`:

   ```ts
   import type { Knex } from 'knex';

   export async function up(knex: Knex): Promise<void> {
     if (await knex.schema.hasColumn('workspaces', 'color')) return;
     await knex.schema.alterTable('workspaces', table => {
       table.text('color').nullable();
     });
   }
   ```

2. Add `{ version: 5, up: v005 }` to `MIGRATIONS` in `runner.ts`. Versions are
   consecutive integers.
3. For a new table, add `create<Table>Table()` in `electron/persist/schema/`,
   export it from `schema/index.ts`, and call it from the new version (as
   `v003-create-mcp-sessions` does). Do not edit `v001`.
4. Update the entity in `electron/persist/entities/` (`toRow` / `fromRow`, and
   the row type in `schema/`).

Rules: never edit a shipped version; guard with `hasColumn` / `hasTable` (or
`createTableIfMissing`) so a rerun is harmless.

## 4. Backup Import And Migrations

- Export (`components/modules/settings/hooks/useDataExport.ts`) writes the
  applied data-migration names into the backup (`schemaVersion`, and the
  `migrationState` collection).
- Import (`useDataImport.ts`) calls `checkImportCompatibility()` first. A backup
  that contains a migration name this build does not know (made by a newer
  version) is rejected.
- After import, the applied-name lists are merged and `runMigrations()` runs
  again, so data from an older backup is upgraded. This is why `up()` must be
  idempotent.

## 5. Checklist

```
□ Data migration: class in core/persist/migration/versions/, unique name with a
  larger suffix, registered in ALL_MIGRATIONS
□ up() idempotent and uses getPlatformOps()
□ Desktop: new column? → vNNN schema step + entity toRow/fromRow
□ Unit test for up()
□ bun run typecheck && bun test:unit
□ Test on a profile with old data (web: existing IndexedDB; desktop: an old orcaq.db)
```
