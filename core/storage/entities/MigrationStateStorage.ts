import type { MigrationState } from '~/core/types/entities/migration-state.entity';
import { MIGRATION_STATE_IDB } from '../idbRegistry';
import { IDBStorage } from '../base/IDBStorage';

type MigrationStateRecord = MigrationState;

class MigrationStateStorage extends IDBStorage<MigrationStateRecord> {
  readonly name = 'migrationState';
  private static readonly KEY = 'applied-migrations' as const;

  constructor() {
    super(MIGRATION_STATE_IDB);
  }

  async get(): Promise<MigrationState | null> {
    return this.getOne(MigrationStateStorage.KEY);
  }

  async save(names: string[]): Promise<void> {
    await this.upsert({ id: MigrationStateStorage.KEY, names });
  }

  async clear(): Promise<void> {
    await this.delete(MigrationStateStorage.KEY);
  }

  // No auto-timestamps for this single-record entity
  protected override applyTimestamps(
    entity: MigrationStateRecord
  ): MigrationStateRecord {
    return entity;
  }
}

export const migrationStateStorage = new MigrationStateStorage();
