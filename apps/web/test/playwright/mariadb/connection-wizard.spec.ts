import { test } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('US7 — MariaDB Connection Wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `MariaDB Wizard Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('MariaDB selection uses a MariaDB connection string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('MariaDB');
    await connectionModal.expectConnectionStringPlaceholder(/mariadb:\/\//i);
  });

  test('MariaDB form keeps database targeting and 3306 defaults', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('MariaDB');
    await connectionModal.selectConnectionFormTab();
    await connectionModal.expectPortPlaceholder('3306');
    await connectionModal.expectStructuredTargetLabel(/database/i);
  });
});
