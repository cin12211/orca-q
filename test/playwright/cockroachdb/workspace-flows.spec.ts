import { getCockroachFixtureConfig } from '../../support/db-fixtures';
import { defineFixtureSqlWorkspaceFlowTests } from '../helpers/sql-workspace';

defineFixtureSqlWorkspaceFlowTests({
  title: 'CockroachDB',
  dbTypeLabel: 'CockroachDB',
  fixture: getCockroachFixtureConfig(),
  instanceInsightsTabs: ['Overview', 'Sessions', 'Configuration'],
  rawQuery: 'select title from film order by film_id limit 1;',
  rawQueryAssertions: ['FILM 1'],
  tableName: 'film',
  viewName: 'film_list',
  backupSupported: false,
  nullOrderTableName: 'payment_log',
  nullOrderColumnName: 'note',
});
