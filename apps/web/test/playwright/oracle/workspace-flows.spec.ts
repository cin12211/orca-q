import { getOracleFixtureConfig } from '../../support/db-fixtures';
import { defineFixtureSqlWorkspaceFlowTests } from '../helpers/sql-workspace';

defineFixtureSqlWorkspaceFlowTests({
  title: 'Oracle',
  dbTypeLabel: 'Oracle',
  fixture: getOracleFixtureConfig(),
  instanceInsightsTabs: ['Overview', 'Sessions & Locks', 'Configuration'],
  rawQuery: 'select title from film order by film_id fetch first 1 rows only;',
  rawQueryAssertions: ['ACADEMY DINOSAUR'],
  variableRawQuery:
    'select title from film where film_id = :filmId order by film_id fetch first 1 rows only;',
  tableName: 'FILM',
  viewName: 'FILM_LIST',
  quickQueryTableName: 'ACTOR',
  quickQueryRelationTableName: 'FILM_ACTOR',
  firstNameColumn: 'FIRST_NAME',
  lastNameColumn: 'LAST_NAME',
  nullOrderTableName: 'ADDRESS',
  nullOrderColumnName: 'POSTAL_CODE',
  backupSupported: false,
});
