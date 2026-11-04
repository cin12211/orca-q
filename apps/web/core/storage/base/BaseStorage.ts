export abstract class BaseStorage<T extends { id: string }> {
  /** Unique store identifier (used as localforage name / SQLite table name) */
  abstract readonly name: string;

  /** Retrieve a single record by primary key. Returns null if not found. */
  abstract getOne(id: string): Promise<T | null>;

  /** Retrieve all records, optionally filtered. Returns empty array if none exist. */
  abstract getMany(filters?: Partial<T>): Promise<T[]>;

  /** Create a new record. Sets createdAt/updatedAt timestamps if not provided. */
  abstract create(entity: T): Promise<T>;

  /**
   * Update an existing record by merging partial fields.
   * Returns null if record does not exist.
   */
  abstract update(entity: Partial<T> & { id: string }): Promise<T | null>;

  /** Delete a record by id. Returns the deleted record, or null if not found. */
  abstract delete(id: string): Promise<T | null>;

  /**
   * Insert or replace a record (upsert semantics).
   * If record exists: replaces it. If not: creates it.
   */
  abstract upsert(entity: T): Promise<T>;
}
