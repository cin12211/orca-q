import type { Knex } from 'knex';
import {
  createAgentStateTable,
  createAppConfigTable,
  createConnectionsTable,
  createEnvironmentTagsTable,
  createMigrationStateTable,
  createQuickQueryLogsTable,
  createRowQueryFileContentsTable,
  createRowQueryFilesTable,
  createTabViewsTable,
  createWorkspacesTable,
  createWorkspaceStatesTable,
} from '../../schema/index';

export async function up(knex: Knex): Promise<void> {
  await createWorkspacesTable(knex);
  await createConnectionsTable(knex);
  await createWorkspaceStatesTable(knex);
  await createTabViewsTable(knex);
  await createQuickQueryLogsTable(knex);
  await createRowQueryFilesTable(knex);
  await createRowQueryFileContentsTable(knex);
  await createEnvironmentTagsTable(knex);
  await createAppConfigTable(knex);
  await createAgentStateTable(knex);
  await createMigrationStateTable(knex);
}
