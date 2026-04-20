import type { Knex } from 'knex';

export type ToSQLiteValue<V> = [V] extends [boolean]
  ? number
  : [V] extends [object]
    ? string
    : V;

export type ToSQLiteRow<T> = {
  [K in keyof T]-?: undefined extends T[K]
    ? ToSQLiteValue<NonNullable<T[K]>> | null
    : ToSQLiteValue<T[K]>;
};

export type BlobRow = { id: string; data: string };

export async function createTableIfMissing(
  knex: Knex,
  tableName: string,
  build: (table: Knex.CreateTableBuilder) => void
): Promise<void> {
  const exists = await knex.schema.hasTable(tableName);
  if (exists) return;
  await knex.schema.createTable(tableName, build);
}
