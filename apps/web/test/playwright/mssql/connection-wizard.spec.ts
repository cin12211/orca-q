import { expect, test } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('SQL Server Connection Wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `SQL Server Wizard Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('SQL Server selection shows its connection string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQL Server');
    await connectionModal.expectConnectionStringPlaceholder(/Server=/i);
  });

  test('SQL Server form defaults to port 1433', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQL Server');
    await connectionModal.selectConnectionFormTab();
    await connectionModal.expectPortPlaceholder('1433');
  });

  test('SQL Server form tells the minimum server version', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQL Server');

    await expect(
      page.getByTestId('connection-minimum-version-note')
    ).toContainText('Requires SQL Server 2017 or newer');
  });
});
