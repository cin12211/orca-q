import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from 'redis';
import { getRedisFixtureConfig } from '../../support/db-fixtures';
import { seedRedisSampleData } from '../../support/seed-redis-sample';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

const redisFixture = getRedisFixtureConfig();
const redisPubSubChannel = 'orders.events';
const redisPubSubPayload = '{"event":"order.created","source":"e2e"}';
const redisSampleData = JSON.parse(
  readFileSync(
    path.resolve(
      process.cwd(),
      'test/fixtures/datasets/redis/redis-sample-data.json'
    ),
    'utf8'
  )
) as {
  core: {
    ordersString: { key: string; value: string };
    ordersHash: { key: string; value: Record<string, string> };
    ordersQueue: { key: string; value: string[] };
    enabledFeatures: { key: string; value: string[] };
  };
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const redisBrowserScenarios = [
  {
    key: redisSampleData.core.ordersString.key,
    previewLabel: 'string key preview',
    assertionMode: 'textarea',
    assertions: [redisSampleData.core.ordersString.value],
  },
  {
    key: redisSampleData.core.ordersHash.key,
    previewLabel: 'hash key preview',
    assertionMode: 'table',
    assertions: [
      `status ${redisSampleData.core.ordersHash.value.status} Remove`,
      `customer ${redisSampleData.core.ordersHash.value.customer} Remove`,
    ],
  },
  {
    key: redisSampleData.core.ordersQueue.key,
    previewLabel: 'list key preview',
    assertionMode: 'table',
    assertions: [
      `0 ${redisSampleData.core.ordersQueue.value[0]} Remove`,
      `${redisSampleData.core.ordersQueue.value.length - 1} ${
        redisSampleData.core.ordersQueue.value.at(-1) as string
      } Remove`,
    ],
  },
  {
    key: redisSampleData.core.enabledFeatures.key,
    previewLabel: 'set key preview',
    assertionMode: 'table',
    assertions: redisSampleData.core.enabledFeatures.value
      .slice(0, 2)
      .map(value => `${value} Remove`),
  },
] as const;
const redisRawCommandScenarios = [
  {
    command: 'PING',
    assertions: ['PONG'],
  },
  {
    command: `GET ${redisSampleData.core.ordersString.key}`,
    assertions: [redisSampleData.core.ordersString.value],
  },
  {
    command: `HGET ${redisSampleData.core.ordersHash.key} status`,
    assertions: [redisSampleData.core.ordersHash.value.status],
  },
  {
    command: `LLEN ${redisSampleData.core.ordersQueue.key}`,
    assertions: [`${redisSampleData.core.ordersQueue.value.length}`],
  },
] as const;

type RedisSidebarActivity = 'Explorer' | 'Schemas' | 'DatabaseTools';

async function seedRedisFixture() {
  const client = createClient({ url: redisFixture.url });
  await client.connect();

  try {
    await seedRedisSampleData(client);
  } finally {
    await client.quit();
  }
}

async function createRedisWorkspaceAndConnection(page: Page) {
  const workspacesPage = new WorkspacesPage(page);
  const connectionModal = new ConnectionModalPage(page);
  const workspaceName = `Redis Workspace ${Date.now()}`;
  const connectionName = 'Redis Fixture Connection';

  await workspacesPage.goto();
  await setPersistedActivityBar(page, 'Explorer');
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

async function connectRedis(page: Page, connectionName: string) {
  const connectionModal = new ConnectionModalPage(page);

  await Promise.all([
    page.waitForURL(/\/[^/]+\/[^/]+(?:\/.*)?$/, { timeout: 15_000 }),
    connectionModal.connectConnection(connectionName),
  ]);
}

async function setPersistedActivityBar(
  page: Page,
  activityActive: RedisSidebarActivity
) {
  await page.evaluate(nextActivity => {
    localStorage.setItem(
      'activity-bar',
      JSON.stringify({ activityActive: nextActivity })
    );
  }, activityActive);

  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function expectRedisLanding(page: Page) {
  await expect(
    page.getByText('No Redis workspace tab is open', { exact: true })
  ).toBeVisible({ timeout: 30_000 });
}

async function openConnectedRedisWorkspace(page: Page) {
  const { connectionName } = await createRedisWorkspaceAndConnection(page);

  await connectRedis(page, connectionName);
  await expectRedisLanding(page);
}

async function openRedisBrowser(page: Page) {
  await openConnectedRedisWorkspace(page);
  await setPersistedActivityBar(page, 'Schemas');

  await expect(page.getByText('Redis Browser', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('tab', { name: 'List view' }).click();
}

async function openRedisBrowserKey(page: Page, key: string) {
  const searchInput = page.getByPlaceholder('Search keys...');

  await searchInput.fill(key);
  await page.getByText(key, { exact: true }).click();

  await expect(page).toHaveURL(/\/redis\/redis-browser-[^/]+$/, {
    timeout: 30_000,
  });
  await expect(page.getByText(key, { exact: true }).last()).toBeVisible({
    timeout: 30_000,
  });
}

async function executeRedisCommand(
  page: Page,
  command: string,
  queryIndex: number
) {
  const editor = page.locator('.cm-content').first();

  await expect(editor).toBeVisible({ timeout: 30_000 });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(command);
  await page.getByRole('button', { name: 'Execute current' }).click();

  await expect(page.getByText(/Query success: 1 rows/i)).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText(`Query ${queryIndex} - ${command}`, { exact: true })
  ).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('Redis workspace flows', () => {
  test.beforeEach(async () => {
    await seedRedisFixture();
  });

  test('connecting a Redis fixture lands on the Redis family shell', async ({
    page,
  }) => {
    await openConnectedRedisWorkspace(page);
  });

  test('Redis connection does not render SQL-family empty-state copy', async ({
    page,
  }) => {
    await openConnectedRedisWorkspace(page);

    await expect(
      page.getByText('No table is open', { exact: true })
    ).toHaveCount(0);
  });

  test('reloading an active Redis session preserves Redis-family landing', async ({
    page,
  }) => {
    await openConnectedRedisWorkspace(page);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expectRedisLanding(page);
    await expect(
      page.getByText('No table is open', { exact: true })
    ).toHaveCount(0);
  });

  test('Redis Browser opens sample keys from fixture data with matching previews', async ({
    page,
  }) => {
    await openRedisBrowser(page);

    for (const scenario of redisBrowserScenarios) {
      await test.step(`browser key ${scenario.key}`, async () => {
        await openRedisBrowserKey(page, scenario.key);
        await expect(
          page.getByText(scenario.previewLabel, { exact: false })
        ).toBeVisible({ timeout: 30_000 });

        if (scenario.assertionMode === 'textarea') {
          await expect(page.locator('textarea').first()).toHaveValue(
            scenario.assertions[0]
          );
        } else if (scenario.assertionMode === 'table') {
          for (const assertion of scenario.assertions) {
            await expect(
              page.getByRole('row', {
                name: new RegExp(
                  `^${escapeRegExp(assertion).replace(/ /g, '\\s+')}$`
                ),
              })
            ).toBeVisible({
              timeout: 30_000,
            });
          }
        } else {
          for (const assertion of scenario.assertions) {
            await expect(
              page.getByText(assertion, { exact: true })
            ).toBeVisible({
              timeout: 30_000,
            });
          }
        }

        await expect(
          page.getByRole('button', { name: 'Update TTL' })
        ).toBeVisible();
        await expect(
          page.getByText('Auto refresh', { exact: true })
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Save Changes' })
        ).toBeVisible();
      });
    }
  });

  test('Redis Pub/Sub subscribes to a channel and captures a published message', async ({
    page,
  }) => {
    await openConnectedRedisWorkspace(page);
    await setPersistedActivityBar(page, 'DatabaseTools');

    await expect(page.getByText('Redis Tools', { exact: true })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByText('Pub/Sub', { exact: true }).click();

    await expect(page).toHaveURL(/\/redis\/redis-pubsub-[^/]+$/, {
      timeout: 30_000,
    });

    await page.locator('#redis-pubsub-target').fill(redisPubSubChannel);
    await page.getByRole('button', { name: 'Add target' }).click();

    await expect(
      page.getByText(redisPubSubChannel, { exact: true })
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('1 channels', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('0 patterns', { exact: true })).toBeVisible();
    await expect(
      page.getByText('1 active target', { exact: true })
    ).toBeVisible();

    await page.locator('#redis-pubsub-channel').fill(redisPubSubChannel);
    await page.locator('#redis-pubsub-payload').fill(redisPubSubPayload);

    const publishCard = page
      .locator('#redis-pubsub-payload')
      .locator(
        'xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]'
      );

    await publishCard.getByRole('button', { name: /^Publish$/i }).click();

    await expect(
      page.getByText(redisPubSubPayload, { exact: true })
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test('Redis Instance Insight loads overview metrics from Redis tools', async ({
    page,
  }) => {
    await openConnectedRedisWorkspace(page);
    await setPersistedActivityBar(page, 'DatabaseTools');

    await page.getByText('Redis Instance Insight', { exact: true }).click();

    await expect(page).toHaveURL(/\/instance-insights$/, {
      timeout: 30_000,
    });
    await expect(page.getByText('Overview', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('Redis version', { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText('Connected clients', { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText('Total keys', { exact: true })).toBeVisible();
  });

  test('Explorer creates a file and executes multiple Redis commands from fixture data', async ({
    page,
  }) => {
    await openConnectedRedisWorkspace(page);
    await setPersistedActivityBar(page, 'Explorer');

    const fileName = `redis-ping-${Date.now()}`;

    await expect(page.getByText('Explorer', { exact: true })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'New File' }).click();
    await page.waitForFunction(() => {
      const activeElement = document.activeElement;

      return (
        activeElement instanceof HTMLInputElement &&
        !/search/i.test(activeElement.placeholder)
      );
    });

    await page.keyboard.type(fileName);
    await page.keyboard.press('Enter');

    await expect(page.getByText(fileName, { exact: true })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByText(fileName, { exact: true }).click();

    await expect(page).toHaveURL(/\/explorer\/[^/]+$/, {
      timeout: 30_000,
    });

    for (const [index, scenario] of redisRawCommandScenarios.entries()) {
      await test.step(`execute ${scenario.command}`, async () => {
        await executeRedisCommand(page, scenario.command, index + 1);

        for (const assertion of scenario.assertions) {
          await expect(page.getByText(assertion, { exact: true })).toBeVisible({
            timeout: 30_000,
          });
        }
      });
    }
  });
});
