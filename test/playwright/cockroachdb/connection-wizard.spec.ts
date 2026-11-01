import { expect, test } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('CockroachDB Connection Wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `CockroachDB Wizard Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('CockroachDB selection shows its connection string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('CockroachDB');
    await connectionModal.expectConnectionStringPlaceholder(/postgresql/i);
  });

  test('CockroachDB form defaults to port 26257', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('CockroachDB');
    await connectionModal.selectConnectionFormTab();
    await connectionModal.expectPortPlaceholder('26257');
  });

  test('CockroachDB form tells the minimum server version', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('CockroachDB');

    await expect(
      page.getByTestId('connection-minimum-version-note')
    ).toContainText('Requires CockroachDB v23.2 or newer');
  });
});
