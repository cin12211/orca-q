import { test } from '@playwright/test';
import {
  getD1LiveConnection,
  getTursoLiveConnection,
  hasD1LiveConnection,
  hasTursoLiveConnection,
} from '../../support/db-fixtures';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('US7 — Managed SQLite Live Flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `Managed SQLite Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('Cloudflare D1 managed connection test succeeds when live credentials are configured', async ({
    page,
  }) => {
    test.skip(!hasD1LiveConnection(), 'D1 live credentials are not configured');

    const d1Connection = getD1LiveConnection();
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName('Cloudflare D1 Live');
    await connectionModal.fillManagedD1Credentials({
      accountId: d1Connection.accountId!,
      databaseId: d1Connection.databaseId!,
      apiToken: d1Connection.apiToken!,
    });

    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionSuccess();
  });

  test('Cloudflare D1 managed connection can be created and connected into the SQL family shell', async ({
    page,
  }) => {
    test.skip(!hasD1LiveConnection(), 'D1 live credentials are not configured');

    const d1Connection = getD1LiveConnection();
    const connectionModal = new ConnectionModalPage(page);
    const connectionName = `Cloudflare D1 Connect ${Date.now()}`;

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName(connectionName);
    await connectionModal.fillManagedD1Credentials({
      accountId: d1Connection.accountId!,
      databaseId: d1Connection.databaseId!,
      apiToken: d1Connection.apiToken!,
    });

    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow(connectionName);
    await connectionModal.connectConnection(connectionName);
    await connectionModal.expectSqlFamilyLanding();
  });

  test('Turso managed connection test succeeds when live credentials are configured', async ({
    page,
  }) => {
    test.skip(
      !hasTursoLiveConnection(),
      'Turso live credentials are not configured'
    );

    const tursoConnection = getTursoLiveConnection();
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName('Turso Live');
    await connectionModal.fillManagedTursoCredentials({
      url: tursoConnection.url!,
      authToken: tursoConnection.authToken!,
      branchName: tursoConnection.branchName,
    });

    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionSuccess();
  });

  test('Turso managed connection can be created and connected into the SQL family shell', async ({
    page,
  }) => {
    test.skip(
      !hasTursoLiveConnection(),
      'Turso live credentials are not configured'
    );

    const tursoConnection = getTursoLiveConnection();
    const connectionModal = new ConnectionModalPage(page);
    const connectionName = `Turso Connect ${Date.now()}`;

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName(connectionName);
    await connectionModal.fillManagedTursoCredentials({
      url: tursoConnection.url!,
      authToken: tursoConnection.authToken!,
      branchName: tursoConnection.branchName,
    });

    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow(connectionName);
    await connectionModal.connectConnection(connectionName);
    await connectionModal.expectSqlFamilyLanding();
  });
});
