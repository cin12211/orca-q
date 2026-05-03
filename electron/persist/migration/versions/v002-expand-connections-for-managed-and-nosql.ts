import type { Knex } from 'knex';

async function addNullableTextColumn(
  knex: Knex,
  tableName: string,
  columnName: string
) {
  const hasColumn = await knex.schema.hasColumn(tableName, columnName);

  if (hasColumn) {
    return;
  }

  await knex.schema.alterTable(tableName, table => {
    table.text(columnName).nullable();
  });
}

export async function up(knex: Knex): Promise<void> {
  await addNullableTextColumn(knex, 'connections', 'provider_kind');
  await addNullableTextColumn(knex, 'connections', 'managed_sqlite');
}
