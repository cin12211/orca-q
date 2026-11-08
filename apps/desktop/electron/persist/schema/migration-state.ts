import type { Knex } from 'knex';
import type { BlobRow } from './shared';
import { createTableIfMissing } from './shared';

export type MigrationStateRow = BlobRow;

export async function createMigrationStateTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'migration_state', t => {
    t.text('id').primary();
    t.text('data').notNullable();
  });
}
