import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('connections', 'broker');

  if (hasColumn) {
    return;
  }

  await knex.schema.alterTable('connections', table => {
    table.text('broker').nullable();
  });
}
