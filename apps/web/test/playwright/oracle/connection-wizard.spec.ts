import { expect, test } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('Oracle Connection Wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `Oracle Wizard Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('Oracle selection shows its connection string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Oracle');
    await connectionModal.expectConnectionStringPlaceholder(/oracledb/i);
  });

  test('Oracle form defaults to port 1521', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Oracle');
    await connectionModal.selectConnectionFormTab();
    await connectionModal.expectPortPlaceholder('1521');
  });

  test('Oracle form tells the minimum server version', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Oracle');

    await expect(
      page.getByTestId('connection-minimum-version-note')
    ).toContainText('Requires Oracle 19c or newer');
  });
});
