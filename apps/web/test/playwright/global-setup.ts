import { chromium, type FullConfig } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getLatestVersion } from '../../core/data/changelogs/changelog';
import {
  getRedisFixtureConfig,
  getSqlFixtureCatalog,
  hasD1LiveConnection,
  hasOracleLiveConnection,
  hasTursoLiveConnection,
} from '../support/db-fixtures';

const APP_WARMUP_TIMEOUT_MS = 120_000;
const CHANGELOG_KEY = 'orcaq-last-seen-version';
const CHANGELOG_SEEN_VERSION = getLatestVersion();

function sanitizeSqlFixture(
  config: ReturnType<typeof getSqlFixtureCatalog>[keyof ReturnType<
    typeof getSqlFixtureCatalog
  >]
) {
  return {
    engine: config.engine,
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    source: config.source,
  };
}

function sanitizeRedisFixture(
  config: ReturnType<typeof getRedisFixtureConfig>
) {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    source: config.source,
  };
}

async function warmPlaywrightApp(baseURL: string) {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    await page.goto(baseURL, {
      waitUntil: 'domcontentloaded',
      timeout: APP_WARMUP_TIMEOUT_MS,
    });

    await page.evaluate(
      ({ changelogKey, changelogVersion }) => {
        localStorage.setItem(changelogKey, changelogVersion);
      },
      {
        changelogKey: CHANGELOG_KEY,
        changelogVersion: CHANGELOG_SEEN_VERSION,
      }
    );

    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: APP_WARMUP_TIMEOUT_MS,
    });

    const newWorkspaceButton = page
      .locator('button')
      .filter({ hasText: /new workspace/i })
      .first();

    const emptyStateText = page.getByText('No workspaces found', {
      exact: true,
    });

    const isButtonVisible = await newWorkspaceButton
      .waitFor({ state: 'visible', timeout: APP_WARMUP_TIMEOUT_MS })
      .then(() => true)
      .catch(() => false);

    if (!isButtonVisible) {
      await emptyStateText.waitFor({
        state: 'visible',
        timeout: APP_WARMUP_TIMEOUT_MS,
      });
    }
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig) {
  process.env.TZ = process.env.TZ || 'UTC';
  process.env.NUXT_TELEMETRY_DISABLED = '1';

  const outputDir = resolve(config.rootDir, 'test-results/playwright');
  const sqlFixtures = getSqlFixtureCatalog();
  const baseURL =
    typeof config.projects[0]?.use?.baseURL === 'string'
      ? config.projects[0].use.baseURL
      : process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    resolve(outputDir, 'runtime.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseURL,
        projects: config.projects.map(project => project.name),
        liveConnections: {
          postgres: Boolean(process.env.PG_CONNECTION),
          oracle: hasOracleLiveConnection(),
          d1: hasD1LiveConnection(),
          turso: hasTursoLiveConnection(),
        },
        fixtures: {
          postgres: sanitizeSqlFixture(sqlFixtures.postgres),
          mysql: sanitizeSqlFixture(sqlFixtures.mysql),
          mariadb: sanitizeSqlFixture(sqlFixtures.mariadb),
          redis: sanitizeRedisFixture(getRedisFixtureConfig()),
        },
      },
      null,
      2
    )
  );

  await warmPlaywrightApp(baseURL);
}
