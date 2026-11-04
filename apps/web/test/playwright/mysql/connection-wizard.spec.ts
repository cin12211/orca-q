import { test } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('US7 — MySQL Connection Wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `MySQL Wizard Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('MySQL selection uses a MySQL connection string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('MySQL');
    await connectionModal.expectConnectionStringPlaceholder(/mysql:\/\//i);
  });

  test('MySQL form keeps database targeting and 3306 defaults', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('MySQL');
    await connectionModal.selectConnectionFormTab();
    await connectionModal.expectPortPlaceholder('3306');
    await connectionModal.expectStructuredTargetLabel(/database/i);
  });
});
