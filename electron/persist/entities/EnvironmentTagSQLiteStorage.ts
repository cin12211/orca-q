import type { EnvironmentTag } from '../../../core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getDB } from '../db';
import type { EnvironmentTagRow } from '../schema';

class EnvironmentTagSQLiteStorage extends SQLite3Storage<EnvironmentTag> {
  readonly name = 'environmentTagSQLite';
  readonly tableName = 'environment_tags';

  toRow(tag: EnvironmentTag): Record<string, unknown> {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      strict_mode: tag.strictMode ? 1 : 0,
      is_system: tag.isSystem ? 1 : 0,
      created_at: tag.createdAt,
      updated_at: tag.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): EnvironmentTag {
    const r = row as unknown as EnvironmentTagRow;
    return {
      id: r.id,
      name: r.name,
      color: r.color as EnvironmentTag['color'],
      strictMode: Boolean(r.strict_mode),
      isSystem: Boolean(r.is_system),
      createdAt: r.created_at,
      updatedAt: r.updated_at ?? undefined,
    };
  }

  async getAll(): Promise<EnvironmentTag[]> {
    return this.getMany();
  }

  async replaceAll(tags: EnvironmentTag[]): Promise<void> {
    const deleteAll = this.db.prepare(`DELETE FROM ${this.tableName}`);
    const replaceTransaction = this.db.transaction(() => {
      deleteAll.run();
      for (const tag of tags) {
        const row = this.toRow(tag);
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        this.db
          .prepare(
            `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})`
          )
          .run(...Object.values(row));
      }
    });
    replaceTransaction();
  }
}

export const environmentTagSQLiteStorage = new EnvironmentTagSQLiteStorage(
  getDB()
);
