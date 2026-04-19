import path from 'node:path';
import { normalizeAppConfigState } from '../../../core/persist/store-state';
import type { AppConfigPersistedState } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { AppConfigRow } from '../schema';

interface AppConfigRecord {
  id: string;
  data: AppConfigPersistedState;
}

class AppConfigSQLiteStorage extends SQLite3Storage<AppConfigRecord> {
  readonly name = 'appConfigSQLite';
  readonly tableName = 'app_config';
  private static readonly KEY = 'app-config';

  toRow(record: AppConfigRecord): Record<string, unknown> {
    return { id: record.id, data: JSON.stringify(record.data) };
  }

  fromRow(row: Record<string, unknown>): AppConfigRecord {
    const r = row as unknown as AppConfigRow;
    return { id: r.id, data: JSON.parse(r.data) };
  }

  async get(): Promise<AppConfigPersistedState> {
    const record = await this.getOne(AppConfigSQLiteStorage.KEY);
    return normalizeAppConfigState(record?.data ?? {});
  }

  async save(state: AppConfigPersistedState): Promise<void> {
    await this.upsert({
      id: AppConfigSQLiteStorage.KEY,
      data: normalizeAppConfigState(state),
    });
  }

  async deleteConfig(): Promise<void> {
    await this.delete(AppConfigSQLiteStorage.KEY);
  }

  // No timestamps for blob records
  protected override applyTimestamps(entity: AppConfigRecord): AppConfigRecord {
    return entity;
  }

  protected override addDefaultOrder(sql: string): string {
    return sql;
  }
}

export const appConfigSQLiteStorage = new AppConfigSQLiteStorage(getDB());
