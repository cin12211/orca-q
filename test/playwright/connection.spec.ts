import { test, expect } from '@playwright/test';
import { getRedisFixtureConfig } from '../support/nosql-fixtures';
import { ConnectionModalPage } from './pages/ConnectionModalPage';
import { WorkspacesPage } from './pages/WorkspacesPage';

const redisFixture = getRedisFixtureConfig();

test.describe('US4 — Connection Management Modal', () => {
  test.beforeEach(async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Test Workspace');
  });

  test('clicking Open workspace opens the connection management modal', async ({
    page,
  }) => {
    const workspacesPage = new WorkspacesPage(page);
    const connectionModal = new ConnectionModalPage(page);

    await workspacesPage.openWorkspace('Test Workspace');
    await connectionModal.expectModalOpen();
  });

  test('connection modal shows Management Connections heading', async ({
    page,
  }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.openWorkspace('Test Workspace');

    await expect(page.getByText('Management Connections')).toBeVisible();
  });

  test('connection modal shows Add Connection button', async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    const connectionModal = new ConnectionModalPage(page);

    await workspacesPage.openWorkspace('Test Workspace');
    await expect(connectionModal.addConnectionButton).toBeVisible();
  });
});

test.describe('US5 — Add Connection Wizard Step 1', () => {
  test.beforeEach(async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Connection Workspace');
    await workspacesPage.openWorkspace('Connection Workspace');
  });

  test('clicking Add Connection opens step 1 database type selection', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.clickAddConnection();
    await connectionModal.expectStep1();
  });

  test('step 1 shows PostgreSQL as an available database type', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.clickAddConnection();
    await connectionModal.expectStep1();
    await expect(page.getByText('PostgreSQL', { exact: true })).toBeVisible();
  });

  test('user can select PostgreSQL and advance to step 2', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.clickAddConnection();
    await connectionModal.expectStep1();
    await connectionModal.selectDbType('PostgreSQL');

    // Next button should be enabled after selecting a type
    await expect(connectionModal.nextButton).toBeEnabled();

    await connectionModal.advanceToStep2();
    await connectionModal.expectStep2();
  });

  test('PostgreSQL is pre-selected by default — Next button is enabled', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.clickAddConnection();
    await connectionModal.expectStep1();
    // dbType defaults to POSTGRES in useConnectionForm, so "Next" is enabled from the start
    await expect(connectionModal.nextButton).toBeEnabled();
  });

  test('step 2 shows connection name input and connection string tab', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.completeStep1('PostgreSQL');

    await expect(connectionModal.connectionNameInput).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /connection string/i })
    ).toBeVisible();
  });

  test('step 1 exposes SQL, managed SQLite, and Redis options', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.clickAddConnection();
    await connectionModal.expectStep1();

    await expect(page.getByText('MySQL', { exact: true })).toBeVisible();
    await expect(page.getByText('MariaDB', { exact: true })).toBeVisible();
    await expect(page.getByText('Oracle', { exact: true })).toBeVisible();
    await expect(page.getByText('SQLite', { exact: true })).toBeVisible();
    await expect(page.getByText('Redis', { exact: true })).toBeVisible();
  });

  test('MySQL selection uses a MySQL connection string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('MySQL');
    await connectionModal.expectConnectionStringPlaceholder(/mysql:\/\//i);
  });

  test('MariaDB selection uses a MariaDB connection string placeholder', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('MariaDB');
    await connectionModal.expectConnectionStringPlaceholder(/mariadb:\/\//i);
  });

  test('Oracle selection exposes service-name form fields and Oracle defaults', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Oracle');
    await connectionModal.selectConnectionFormTab();

    await connectionModal.expectStructuredTargetLabel(/service name/i);
    await connectionModal.expectPortPlaceholder('1521');
  });

  test('browser runtime exposes SQLite database file and managed provider tabs', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQLite');

    await expect(connectionModal.databaseFileTab).toBeVisible();
    await expect(connectionModal.managedSqliteTab).toBeVisible();
    await connectionModal.selectManagedSqliteTab();
    await expect(connectionModal.d1AccountIdInput).toBeVisible();
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

test.describe('US5 — Electron-Gated SQLite UI', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      window.electronAPI = {
        persist: {
          getAll: async () => [],
          getOne: async () => null,
          find: async () => [],
          upsert: async (_collection, _id, value) => value,
          delete: async () => [],
          replaceAll: async () => undefined,
          mergeAll: async () => undefined,
        },
        updater: {
          check: async () => null,
          download: async () => undefined,
          install: async () => undefined,
          onUpdateAvailable: () => () => undefined,
          onUpToDate: () => () => undefined,
          onProgress: () => () => undefined,
          onReady: () => () => undefined,
          onError: () => () => undefined,
        },
        window: {
          minimize: async () => undefined,
          maximize: async () => undefined,
          close: async () => undefined,
          pickSqliteFile: async () => '/tmp/playwright-sqlite.sqlite',
          getStoragePath: async () => '/tmp',
          openStoragePath: async () => undefined,
          resetAllData: async () => undefined,
          onOpenSettings: () => () => undefined,
        },
      } as typeof window.electronAPI;
    });

    const workspaceName = `SQLite Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('Electron runtime exposes the SQLite file tab and picker flow', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.clickAddConnection();
    await connectionModal.expectStep1();
    await connectionModal.selectDbType('SQLite');
    await connectionModal.advanceToStep2();

    await expect(connectionModal.databaseFileTab).toBeVisible();
    await expect(connectionModal.managedSqliteTab).toBeVisible();
    await expect(connectionModal.browseSqliteButton).toBeVisible();

    await connectionModal.clickBrowseSqliteFile();
    await connectionModal.expectFilePathValue('/tmp/playwright-sqlite.sqlite');
  });
});
