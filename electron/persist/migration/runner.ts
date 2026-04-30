import type { Knex } from 'knex';
import type { SchemaVersionRow } from '../schema/schema-versions';
import { createTableIfMissing } from '../schema/shared';
import { up as v001 } from './versions/v001-initial-schema';
import { up as v002 } from './versions/v002-expand-connections-for-managed-and-nosql';

interface Migration {
  version: number;
  up: (knex: Knex) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  { version: 1, up: v001 },
  { version: 2, up: v002 },
];

export async function runMigrations(knex: Knex): Promise<void> {
  // Ensure migration tracking table exists
  await createTableIfMissing(knex, '_schema_versions', t => {
    t.text('table_name').primary();
    t.integer('version').notNullable().defaultTo(0);
    t.text('applied_at').notNullable();
  });

  const row = await knex('_schema_versions')
    .where({ tableName: 'app' })
    .first<SchemaVersionRow | undefined>();

  const currentVersion = row?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    await knex.transaction(async trx => {
      await migration.up(trx);
      await trx('_schema_versions')
        .insert({
          tableName: 'app',
          version: migration.version,
          appliedAt: new Date().toISOString(),
        })
        .onConflict('tableName')
        .merge();
    });
  }
}
