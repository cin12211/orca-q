import type { Knex } from 'knex';
import { BaseStorage } from './base/BaseStorage';

export abstract class SQLite3Storage<
  T extends { id: string },
> extends BaseStorage<T> {
  abstract override readonly name: string;
  abstract readonly tableName: string;

  constructor(protected readonly db: Knex) {
    super();
  }

  abstract toRow(entity: T): Record<string, unknown>;
  abstract fromRow(row: Record<string, unknown>): T;

  async getOne(id: string): Promise<T | null> {
    const row = await this.db(this.tableName)
      .where({ id })
      .first<Record<string, unknown> | undefined>();
    return row ? this.fromRow(row) : null;
  }

  async getMany(filters?: Partial<T>): Promise<T[]> {
    const orderByColumn = this.getOrderByColumn();
    const entries = filters
      ? Object.entries(filters).filter(([, v]) => v !== undefined)
      : [];

    let query = this.db(this.tableName).select('*');

    if (entries.length > 0) {
      const row = this.toRow(filters as T);
      const where: Record<string, unknown> = {};
      for (const [k] of entries) {
        where[k] = row[k];
      }
      query = query.where(where);
    }

    if (orderByColumn) {
      query = query.orderBy(orderByColumn, this.getOrderDirection());
    }

    const rows = (await query) as Record<string, unknown>[];
    return rows.map(r => this.fromRow(r));
  }

  async create(entity: T): Promise<T> {
    const stamped = this.applyTimestamps(entity);
    await this.upsert(stamped);
    return stamped;
  }

  async update(entity: Partial<T> & { id: string }): Promise<T | null> {
    const existing = await this.getOne(entity.id);
    if (!existing) return null;
    const merged = this.applyTimestamps({ ...existing, ...entity } as T);
    await this.upsert(merged);
    return merged;
  }

  async delete(id: string): Promise<T | null> {
    const existing = await this.getOne(id);
    if (!existing) return null;
    await this.db(this.tableName).where({ id }).del();
    return existing;
  }

  async upsert(entity: T): Promise<T> {
    const row = this.normalizeRow(this.toRow(entity));
    await this.db(this.tableName).insert(row).onConflict('id').merge();
    return entity;
  }

  /**
   * Returns the logical camelCase column name to order by,
   * or null if no ordering should be applied.
   */
  protected getOrderByColumn(): string | null {
    return 'createdAt';
  }

  protected getOrderDirection(): 'asc' | 'desc' {
    return 'asc';
  }

  protected applyTimestamps(entity: T): T {
    const now = new Date().toISOString();
    return {
      ...entity,
      createdAt: (entity as Record<string, unknown>).createdAt ?? now,
      updatedAt: now,
    };
  }

  protected normalizeRow(
    row: Record<string, unknown>
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, value ?? null])
    );
  }
}
