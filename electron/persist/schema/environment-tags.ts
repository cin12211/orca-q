import type { Knex } from 'knex';
import type { EnvironmentTag } from '~/core/types/entities';
import { createTableIfMissing, type ToSQLiteRow } from './shared';

export type EnvironmentTagRow = ToSQLiteRow<EnvironmentTag>;

export async function createEnvironmentTagsTable(knex: Knex): Promise<void> {
  await createTableIfMissing(knex, 'environment_tags', t => {
    t.text('id').primary();
    t.text('name').nullable();
    t.text('color').nullable();
    t.integer('strict_mode').nullable().defaultTo(0);
    t.integer('is_system').nullable().defaultTo(0);
    t.text('created_at').nullable();
    t.text('updated_at').nullable();
  });
}
