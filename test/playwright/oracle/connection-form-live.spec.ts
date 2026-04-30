import { test } from '@playwright/test';
import {
  getOracleLiveConnection,
  hasOracleLiveConnection,
} from '../../support/db-fixtures';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('OracleDB live connection flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `Oracle Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('Oracle form connection test succeeds when live credentials are configured', async ({
    page,
  }) => {
    test.skip(
      !hasOracleLiveConnection(),
      'Oracle live credentials are not configured'
    );

    const oracleConnection = getOracleLiveConnection();
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Oracle');
    await connectionModal.fillConnectionName('Oracle Live');
    await connectionModal.selectConnectionFormTab();
    await connectionModal.fillFormCredentials({
      host: oracleConnection.host!,
      port: `${oracleConnection.port ?? 1521}`,
      username: oracleConnection.username!,
      password: oracleConnection.password!,
      database: oracleConnection.serviceName!,
    });

    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionSuccess();
  });

  test('Oracle connection can be created and connected into the SQL family shell', async ({
    page,
  }) => {
    test.skip(
      !hasOracleLiveConnection(),
      'Oracle live credentials are not configured'
    );

    const oracleConnection = getOracleLiveConnection();
    const connectionModal = new ConnectionModalPage(page);
    const connectionName = `Oracle Connect ${Date.now()}`;

    await connectionModal.completeStep1('Oracle');
    await connectionModal.fillConnectionName(connectionName);
    await connectionModal.selectConnectionFormTab();
    await connectionModal.fillFormCredentials({
      host: oracleConnection.host!,
      port: `${oracleConnection.port ?? 1521}`,
      username: oracleConnection.username!,
      password: oracleConnection.password!,
      database: oracleConnection.serviceName!,
    });

    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow(connectionName);
    await connectionModal.connectConnection(connectionName);
    await connectionModal.expectSqlFamilyLanding();
  });
});
