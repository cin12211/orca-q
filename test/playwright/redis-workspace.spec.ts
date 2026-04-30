import { expect, test } from '@playwright/test';
import { createClient } from 'redis';
import { getRedisFixtureConfig } from '../support/nosql-fixtures';
import { ConnectionModalPage } from './pages/ConnectionModalPage';
import { WorkspacesPage } from './pages/WorkspacesPage';

const redisFixture = getRedisFixtureConfig();

async function seedRedisFixture() {
  const client = createClient({ url: redisFixture.url });
  await client.connect();

  try {
    await client.flushDb();
    await client.set('orders:1', 'draft');
    await client.hSet('orders:2', {
      status: 'paid',
      customer: 'cinny',
    });
  } finally {
    await client.quit();
  }
}

async function createRedisWorkspaceAndConnection(
  page: import('@playwright/test').Page
) {
  const workspacesPage = new WorkspacesPage(page);
  const connectionModal = new ConnectionModalPage(page);
  const workspaceName = `Redis Workspace ${Date.now()}`;
  const connectionName = 'Redis Fixture Connection';

  await workspacesPage.goto();
  await page.evaluate(() => {
    localStorage.setItem(
      'activity-bar',
      JSON.stringify({ activityActive: 'Explorer' })
    );
  });
  await page.reload();
  await workspacesPage.createWorkspace(workspaceName);
  await workspacesPage.openWorkspace(workspaceName);

  await connectionModal.completeStep1('Redis');
  await connectionModal.fillConnectionName(connectionName);
  await connectionModal.selectConnectionStringTab();
  await connectionModal.fillConnectionString(redisFixture.url);
  await connectionModal.clickCreate();
  await connectionModal.expectConnectionRow(connectionName);

  return {
    workspaceName,
    connectionName,
  };
}

async function connectRedis(
  page: import('@playwright/test').Page,
  connectionName: string
) {
  const connectionModal = new ConnectionModalPage(page);

  await Promise.all([
    page.waitForURL(/\/[^/]+\/[^/]+(?:\/.*)?$/, { timeout: 15_000 }),
    connectionModal.connectConnection(connectionName),
  ]);
}

test.describe('US2 — Redis workspace routing workflow', () => {
  test.beforeEach(async () => {
    await seedRedisFixture();
  });

  test('connecting a Redis fixture lands on the Redis family shell', async ({
    page,
  }) => {
    const { connectionName } = await createRedisWorkspaceAndConnection(page);

    await connectRedis(page, connectionName);

    await expect(
      page.getByText('No Redis workspace tab is open', { exact: true })
    ).toBeVisible({ timeout: 30_000 });
  });

  test('Redis connection does not render SQL-family empty-state copy', async ({
    page,
  }) => {
    const { connectionName } = await createRedisWorkspaceAndConnection(page);

    await connectRedis(page, connectionName);

    await expect(
      page.getByText('No Redis workspace tab is open', { exact: true })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText('No table is open', { exact: true })
    ).toHaveCount(0);
  });

  test('reloading an active Redis session preserves Redis-family landing', async ({
    page,
  }) => {
    const { connectionName } = await createRedisWorkspaceAndConnection(page);

    await connectRedis(page, connectionName);
    await expect(
      page.getByText('No Redis workspace tab is open', { exact: true })
    ).toBeVisible({ timeout: 30_000 });

    await page.reload();

    await expect(
      page.getByText('No Redis workspace tab is open', { exact: true })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText('No table is open', { exact: true })
    ).toHaveCount(0);
  });
});
