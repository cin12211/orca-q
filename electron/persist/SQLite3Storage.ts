import type Database from 'better-sqlite3';
import { BaseStorage } from '../../core/storage/base/BaseStorage';

export abstract class SQLite3Storage<
  T extends { id: string },
> extends BaseStorage<T> {
  abstract override readonly name: string;
  abstract readonly tableName: string;

  constructor(protected readonly db: Database.Database) {
    super();
  }

  abstract toRow(entity: T): Record<string, unknown>;
  abstract fromRow(row: Record<string, unknown>): T;

  async getOne(id: string): Promise<T | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.fromRow(row) : null;
  }

  async getMany(filters?: Partial<T>): Promise<T[]> {
    if (!filters || Object.keys(filters).length === 0) {
      const sql = this.addDefaultOrder(`SELECT * FROM ${this.tableName}`);
      const rows = this.db.prepare(sql).all() as Record<string, unknown>[];
      return rows.map(r => this.fromRow(r));
    }

    const entries = Object.entries(filters).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      const sql = this.addDefaultOrder(`SELECT * FROM ${this.tableName}`);
      const rows = this.db.prepare(sql).all() as Record<string, unknown>[];
      return rows.map(r => this.fromRow(r));
    }

    // Build WHERE clause from camelCase filter keys → snake_case column names
    const row = this.toRow(filters as T);
    const conditions = entries.map(([k]) => {
      const snakeKey = this.camelToSnake(k);
      return `${snakeKey} = ?`;
    });
    const values = entries.map(([k]) => row[this.camelToSnake(k)]);
    const sql = this.addDefaultOrder(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`
    );
    const rows = this.db.prepare(sql).all(...values) as Record<
      string,
      unknown
    >[];
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
    this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return existing;
  }

  async upsert(entity: T): Promise<T> {
    const row = this.toRow(entity);
    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(', ');
    const updates = cols
      .filter(c => c !== 'id')
      .map(c => `${c} = excluded.${c}`);
    this.db
      .prepare(
        `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}`
      )
      .run(...Object.values(row));
    return entity;
  }

  protected addDefaultOrder(sql: string): string {
    return `${sql} ORDER BY created_at ASC`;
  }

  protected applyTimestamps(entity: T): T {
    const now = new Date().toISOString();
    return {
      ...entity,
      createdAt: (entity as Record<string, unknown>).createdAt ?? now,
      updatedAt: now,
    };
  }

  private camelToSnake(s: string): string {
    return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
