import type { EnvironmentTag } from '~/core/types/entities';
import { SQLite3Storage } from '../SQLite3Storage';
import { getKnex } from '../knex-db';
import type { EnvironmentTagRow } from '../schema';

class EnvironmentTagSQLiteStorage extends SQLite3Storage<EnvironmentTag> {
  readonly name = 'environmentTagSQLite';
  readonly tableName = 'environment_tags';

  toRow(tag: EnvironmentTag): Record<string, unknown> {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      strictMode: tag.strictMode ? 1 : 0,
      isSystem: tag.isSystem ? 1 : 0,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt ?? null,
    };
  }

  fromRow(row: Record<string, unknown>): EnvironmentTag {
    const r = row as unknown as EnvironmentTagRow;
    return {
      id: r.id,
      name: r.name,
      color: r.color as EnvironmentTag['color'],
      strictMode: Boolean(r.strictMode),
      isSystem: Boolean(r.isSystem),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? undefined,
    };
  }

  async getAll(): Promise<EnvironmentTag[]> {
    return this.getMany();
  }

  async replaceAll(tags: EnvironmentTag[]): Promise<void> {
    await this.db.transaction(async trx => {
      await trx(this.tableName).delete();
      for (const tag of tags) {
        await trx(this.tableName).insert(this.normalizeRow(this.toRow(tag)));
      }
    });
  }
}

export const environmentTagSQLiteStorage = new EnvironmentTagSQLiteStorage(
  getKnex()
);
