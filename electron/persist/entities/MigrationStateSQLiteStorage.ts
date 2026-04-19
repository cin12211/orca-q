import type { MigrationState } from '../../../core/types/entities/migration-state.entity';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';

interface MigrationStateRecord {
  id: string;
  names: string[];
}

class MigrationStateSQLiteStorage extends SQLite3Storage<MigrationStateRecord> {
  readonly name = 'migrationStateSQLite';
  readonly tableName = 'migration_state';
  private static readonly KEY = 'applied-migrations' as const;

  toRow(record: MigrationStateRecord): Record<string, unknown> {
    return { id: record.id, data: JSON.stringify(record.names) };
  }

  fromRow(row: Record<string, unknown>): MigrationStateRecord {
    return {
      id: row['id'] as string,
      names: JSON.parse(row['data'] as string) as string[],
    };
  }

  async get(): Promise<MigrationState | null> {
    const record = await this.getOne(MigrationStateSQLiteStorage.KEY);
    if (!record) return null;
    return { id: 'applied-migrations', names: record.names };
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

  protected override addDefaultOrder(sql: string): string {
    return sql;
  }
}

export const migrationStateSQLiteStorage = new MigrationStateSQLiteStorage(
  getDB()
);
