import { test } from '@playwright/test';
import {
  getOracleLiveConnection,
  hasOracleLiveConnection,
} from '../../support/db-fixtures';
import {
  createExplorerFolder,
  executeRawQuery,
  expectDatabaseToolsLaunchers,
  expectFunctionDetail,
  expectInstanceInsightsFromSidebar,
  expectManagementErdTableList,
  expectRawQueryFormatByButton,
  expectRawQueryFormatByShortcut,
  expectRawQueryResultTabs,
  expectTableStructure,
  expectViewStructure,
  getActiveSchemaCatalog,
  getActiveSchemaTables,
  getOpenQuickQueryTableTabs,
  openConnectedOracleSqlWorkspace,
  openExplorerRawQueryFile,
  openExplorerRawQueryFileInFolder,
  openQuickQueryTable,
  openSchemaItem,
  openSchemasSidebar,
  setRawQueryVariables,
} from '../helpers/sql-workspace';

test.describe('Oracle workspace flows', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !hasOracleLiveConnection(),
      'Oracle live credentials are not configured'
    );

    await openConnectedOracleSqlWorkspace(page, {
      connectionName: `Oracle Flow ${Date.now()}-${testInfo.retry}`,
      workspaceName: `Oracle Workspace Flow ${Date.now()}-${testInfo.retry}`,
      oracleConnection: getOracleLiveConnection(),
    });
  });

  test('executes a raw query from Explorer', async ({ page }) => {
    await openExplorerRawQueryFile(page, `oracle-raw-${Date.now()}`);
    await executeRawQuery(page, "select 'ORACLE_OK' as result from dual", [
      'ORACLE_OK',
    ]);
  });

  test('creates files and folders from Explorer for Oracle workspaces', async ({
    page,
  }) => {
    const nonce = `oracle-${Date.now()}`;
    const folderName = `${nonce}-queries`;
    const rootFileName = `${nonce}-root`;
    const nestedFileName = `${nonce}-nested`;

    await createExplorerFolder(page, folderName);
    await openExplorerRawQueryFile(page, rootFileName);
    await openExplorerRawQueryFileInFolder(page, folderName, nestedFileName);
  });

  test('supports Oracle raw query variables, formatting, and result tabs', async ({
    page,
  }) => {
    await openExplorerRawQueryFile(page, `oracle-advanced-${Date.now()}`);

    await setRawQueryVariables(
      page,
      JSON.stringify({ probe: 'ORACLE_VAR' }, null, 2)
    );
    await executeRawQuery(page, 'select :probe as result from dual', [
      'ORACLE_VAR',
    ]);

    await expectRawQueryFormatByButton(
      page,
      "select 'formatted' as result from dual"
    );
    await expectRawQueryFormatByShortcut(
      page,
      "select 'one' as result from dual;select 'two' as result from dual;"
    );
    await expectRawQueryResultTabs(page, [
      "select 'tab-one' as result from dual",
      "select 'tab-two' as result from dual",
      'select 1 as probe from dual',
    ]);
  });

  test('opens table, view, and function detail flows from Schemas', async ({
    page,
  }) => {
    const catalog = await getActiveSchemaCatalog(page);

    test.skip(
      !(catalog.tableName && catalog.viewName && catalog.functionName),
      'Oracle schema store does not expose a table, view, and function'
    );

    await openSchemasSidebar(page);
    await openSchemaItem(page, {
      folderName: 'Tables',
      itemName: catalog.tableName!,
    });
    await expectTableStructure(page);

    await openSchemasSidebar(page);
    await openSchemaItem(page, {
      folderName: 'Views',
      itemName: catalog.viewName!,
    });
    await expectViewStructure(page);

    await openSchemasSidebar(page);
    await openSchemaItem(page, {
      folderName: 'Functions',
      itemName: catalog.functionName!,
    });
    await expectFunctionDetail(page, catalog.functionName!);
  });

  test('loads Oracle instance insights from Database Tools', async ({
    page,
  }) => {
    await expectInstanceInsightsFromSidebar(page, {
      expectedTabs: [
        'Overview',
        'Sessions & Locks',
        'Memory & Limits',
        'Configuration',
        'Data Guard',
      ],
    });
  });

  test('opens multiple Oracle table tabs and lists schema tables in ERD', async ({
    page,
  }) => {
    const schemaTables = await getActiveSchemaTables(page);

    test.skip(
      schemaTables.length < 3,
      'Oracle schema does not expose enough tables'
    );

    const tablesToOpen = schemaTables.slice(0, 3);

    for (const tableName of tablesToOpen) {
      await openQuickQueryTable(page, tableName);
    }

    await expect
      .poll(
        async () => {
          const openTables = await getOpenQuickQueryTableTabs(page);
          return tablesToOpen.filter(tableName =>
            openTables.includes(tableName)
          ).length;
        },
        { timeout: 30_000 }
      )
      .toBe(tablesToOpen.length);

    await expectManagementErdTableList(page, schemaTables);
  });

  test('opens Oracle Database Tools launchers', async ({ page }) => {
    await expectDatabaseToolsLaunchers(page);
  });
});
