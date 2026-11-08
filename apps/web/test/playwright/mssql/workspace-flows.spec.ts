import { getMssqlFixtureConfig } from '../../support/db-fixtures';
import { defineFixtureSqlWorkspaceFlowTests } from '../helpers/sql-workspace';

defineFixtureSqlWorkspaceFlowTests({
  title: 'SQL Server',
  dbTypeLabel: 'SQL Server',
  fixture: getMssqlFixtureConfig(),
  instanceInsightsTabs: ['Overview', 'Sessions', 'Configuration'],
  rawQuery: 'select top 1 title from film order by film_id;',
  rawQueryAssertions: ['ACADEMY DINOSAUR'],
  variableRawQuery:
    'select top 1 title from film where film_id = :filmId order by film_id;',
  tableName: 'film',
  viewName: 'film_list',
  backupSupported: false,
});
