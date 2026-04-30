import { getMariaDbFixtureConfig } from '../../support/db-fixtures';
import { defineFixtureSqlWorkspaceFlowTests } from '../helpers/sql-workspace';

defineFixtureSqlWorkspaceFlowTests({
  title: 'MariaDB',
  dbTypeLabel: 'MariaDB',
  fixture: getMariaDbFixtureConfig(),
  rawQuery: 'select title from film order by film_id limit 1;',
  rawQueryAssertions: ['ACADEMY DINOSAUR'],
  tableName: 'film',
  viewName: 'actor_info',
  functionName: 'inventory_in_stock',
});
