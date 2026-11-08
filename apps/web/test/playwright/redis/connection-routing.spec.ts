import { expect, test } from '@playwright/test';
import { getRedisFixtureConfig } from '../../support/db-fixtures';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

const redisFixture = getRedisFixtureConfig();

test.describe('US7 — Redis Connection Wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `Redis Wizard Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('Redis form uses Redis defaults and connection-string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Redis');
    await connectionModal.expectConnectionStringPlaceholder(/redis:\/\//i);
    await connectionModal.selectConnectionFormTab();
    await connectionModal.expectPortPlaceholder('6379');
    await connectionModal.expectStructuredTargetLabel(/database/i);
  });

  test('stale SQL-only activity state falls back to the Redis browser under Explorer after connect', async ({
    page,
  }) => {
    const workspacesPage = new WorkspacesPage(page);
    const connectionModal = new ConnectionModalPage(page);
    const workspaceName = `Redis Fallback Workspace ${Date.now()}`;
    const connectionName = 'Redis Fallback Connection';

    await workspacesPage.goto();
    await page.evaluate(() => {
      localStorage.setItem(
        'activity-bar',
        JSON.stringify({ activityActive: 'ERDiagram' })
      );
    });
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);

    await connectionModal.completeStep1('Redis');
    await connectionModal.fillConnectionName(connectionName);
    await connectionModal.selectConnectionStringTab();
    await connectionModal.fillConnectionString(redisFixture.url);
    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow(connectionName);
    await connectionModal.connectConnection(connectionName);

    await expect(page.getByText('Redis Browser', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('No Redis workspace tab is open', { exact: true })
    ).toBeVisible();
  });
});

test.describe('US7 — Redis Family Routing (local fixtures)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `Redis Routing Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('Redis connections land on the Redis workspace shell', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Redis');
    await connectionModal.fillConnectionName('Redis Live Route');
    await connectionModal.selectConnectionStringTab();
    await connectionModal.fillConnectionString(redisFixture.url);
    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow('Redis Live Route');
    await connectionModal.connectConnection('Redis Live Route');

    await expect(
      page.getByText(/Redis (Browser|Tools)/, { exact: false })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText('No Redis workspace tab is open', { exact: true })
    ).toBeVisible();
  });
});
