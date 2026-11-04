import type { MigrationState } from '~/core/types/entities/migration-state.entity';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { MigrationStateRow } from '../schema';

// Alias the entity directly — no separate record shape needed.
// Mirrors the IDB counterpart: core/storage/entities/MigrationStateStorage.ts
type MigrationStateRecord = MigrationState;

class MigrationStateSQLiteStorage extends SQLite3Storage<MigrationStateRecord> {
  readonly name = 'migrationStateSQLite';
  readonly tableName = 'migration_state';
  private static readonly KEY = 'applied-migrations' as const;

  toRow(record: MigrationStateRecord): Record<string, unknown> {
    return { id: record.id, data: JSON.stringify(record.names) };
  }

  fromRow(row: Record<string, unknown>): MigrationStateRecord {
    const r = row as unknown as MigrationStateRow;
    return {
      id: 'applied-migrations',
      names: JSON.parse(r.data) as string[],
    };
  }

  async get(): Promise<MigrationState | null> {
    return this.getOne(MigrationStateSQLiteStorage.KEY);
  }

  async save(names: string[]): Promise<void> {
    await this.upsert({ id: MigrationStateSQLiteStorage.KEY, names });
  }

  async clear(): Promise<void> {
    await this.delete(MigrationStateSQLiteStorage.KEY);
  }

  // No timestamp columns on this table
  protected override applyTimestamps(
    entity: MigrationStateRecord
  ): MigrationStateRecord {
    return entity;
  }

  protected override getOrderByColumn(): string | null {
    return null;
  }
}

export const migrationStateSQLiteStorage = new MigrationStateSQLiteStorage(
  getKnex()
);
