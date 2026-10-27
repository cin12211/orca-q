import type { Knex } from 'knex';
import { createMcpSessionsTable } from '../../schema/index';

export async function up(knex: Knex): Promise<void> {
  await createMcpSessionsTable(knex);
}
