import { expect, test } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

test.describe('US7 — SQLite Connection Wizard', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }, testInfo) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);
    const workspaceName = `SQLite Wizard Workspace ${Date.now()}-${testInfo.retry}`;

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('SQLite shows both database file and managed SQLite tabs', async () => {
    await connectionModal.completeStep1('SQLite');

    await expect(connectionModal.databaseFileTab).toBeVisible();
    await expect(connectionModal.managedSqliteTab).toBeVisible();
  });

  test('managed SQLite defaults to Cloudflare D1 fields and can switch to Turso fields', async () => {
    await connectionModal.completeStep1('SQLite');
    await connectionModal.selectManagedSqliteTab();

    await expect(connectionModal.d1ProviderButton).toBeVisible();
    await expect(connectionModal.d1AccountIdInput).toBeVisible();
    await expect(connectionModal.d1DatabaseIdInput).toBeVisible();
    await expect(connectionModal.d1ApiTokenInput).toBeVisible();

    await connectionModal.tursoProviderButton.click();

    await expect(connectionModal.tursoUrlInput).toBeVisible();
    await expect(connectionModal.tursoAuthTokenInput).toBeVisible();
    await expect(connectionModal.tursoBranchNameInput).toBeVisible();
  });
});

test.describe('US7 — Cloudflare D1 Managed Connection Flow', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  const d1Payload = {
    type: 'sqlite3',
    method: 'managed',
    providerKind: 'cloudflare-d1',
    managedSqlite: {
      provider: 'cloudflare-d1',
      accountId: 'account-id',
      databaseId: 'database-id',
      databaseName: 'hera-d1',
      apiToken: 'test-token',
    },
  };

  test.beforeEach(async ({ page }, testInfo) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);
    const workspaceName = `Cloudflare D1 Workspace ${Date.now()}-${testInfo.retry}`;

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('managed D1 test connection sends the managed SQLite payload and shows success', async ({
    page,
  }) => {
    const healthCheckBodies: unknown[] = [];

    await page.route(
      '**/api/managment-connection/health-check',
      async route => {
        healthCheckBodies.push(route.request().postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isConnectedSuccess: true }),
        });
      }
    );

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName('Cloudflare D1 Mock');
    await connectionModal.fillManagedD1Credentials({
      accountId: 'account-id',
      databaseId: 'database-id',
      databaseName: 'hera-d1',
      apiToken: 'test-token',
    });

    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionSuccess();

    expect(healthCheckBodies).toHaveLength(1);
    expect(healthCheckBodies[0]).toMatchObject(d1Payload);
  });

  test('managed D1 shows backend error messages during failed connection tests', async ({
    page,
  }) => {
    await page.route(
      '**/api/managment-connection/health-check',
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isConnectedSuccess: false,
            message: 'Cloudflare D1 API token rejected.',
          }),
        });
      }
    );

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName('Cloudflare D1 Rejected');
    await connectionModal.fillManagedD1Credentials({
      accountId: 'account-id',
      databaseId: 'database-id',
      apiToken: 'bad-token',
    });

    await connectionModal.clickTestConnection();
    await expect(
      page.getByText('Cloudflare D1 API token rejected.', { exact: true })
    ).toBeVisible();
  });

  test('managed D1 connections can be created and connected into the SQL shell', async ({
    page,
  }) => {
    const healthCheckBodies: unknown[] = [];
    const metadataBodies: unknown[] = [];
    const reverseSchemaBodies: unknown[] = [];
    const connectionName = `Cloudflare D1 Connect ${Date.now()}`;

    await page.route(
      '**/api/managment-connection/health-check',
      async route => {
        healthCheckBodies.push(route.request().postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isConnectedSuccess: true }),
        });
      }
    );

    await page.route('**/api/metadata/meta-data', async route => {
      metadataBodies.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'main',
            tables: ['audit_logs'],
            views: [],
            functions: [],
            table_details: {
              audit_logs: {
                columns: [],
                foreign_keys: [],
                primary_keys: [],
                table_id: 'main.audit_logs',
              },
            },
            view_details: {},
          },
        ]),
      });
    });

    await page.route('**/api/metadata/reverse-schemas', async route => {
      reverseSchemaBodies.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: [] }),
      });
    });

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName(connectionName);
    await connectionModal.fillManagedD1Credentials({
      accountId: 'account-id',
      databaseId: 'database-id',
      databaseName: 'hera-d1',
      apiToken: 'test-token',
    });

    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow(connectionName);
    await connectionModal.connectConnection(connectionName);
    await connectionModal.expectSqlFamilyLanding();

    expect(healthCheckBodies).toHaveLength(1);
    expect(healthCheckBodies[0]).toMatchObject(d1Payload);
    expect(metadataBodies).toHaveLength(1);
    expect(metadataBodies[0]).toMatchObject({
      dbConnectionString: '',
      providerKind: 'cloudflare-d1',
      managedSqlite: d1Payload.managedSqlite,
      type: 'sqlite3',
    });
    expect(reverseSchemaBodies.length).toBeGreaterThanOrEqual(1);
    expect(reverseSchemaBodies).toContainEqual(
      expect.objectContaining({
        dbConnectionString: '',
        providerKind: 'cloudflare-d1',
        managedSqlite: d1Payload.managedSqlite,
        type: 'sqlite3',
      })
    );
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
