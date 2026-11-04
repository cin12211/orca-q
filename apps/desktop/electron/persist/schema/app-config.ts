import type { Knex } from 'knex';
import type { BlobRow } from './shared';
import { createTableIfMissing } from './shared';

export type AppConfigRow = BlobRow;

export async function createAppConfigTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'app_config', t => {
    t.text('id').primary();
    t.text('data').notNullable();
  });
}
