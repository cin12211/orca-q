import { test, expect } from '@playwright/test';
import { ConnectionModalPage } from './pages/ConnectionModalPage';
import { WorkspacesPage } from './pages/WorkspacesPage';

/**
 * Feature 003 — Connection Form E2E Tests
 * US1: Form Tab Navigation & Basic Field Rendering
 * US2: Complete Form-Based Connection Creation (UI-only assertions)
 *
 * All tests in this file are UI-only — no live database required.
 */

test.describe('US1 — Connection Form Tab Navigation & Field Rendering', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Form Test Workspace');
    await workspacesPage.openWorkspace('Form Test Workspace');
    await connectionModal.expectModalOpen();
    await connectionModal.completeStep1('PostgreSQL');
    await connectionModal.selectConnectionFormTab();
  });

  test('[US1] Connection Form tab is visible and clickable in step 2', async ({
    page,
  }) => {
    await expect(connectionModal.connectionFormTab).toBeVisible();
  });

  test('[US1] form tab shows Host, Port, Username, Password, Database fields', async ({
    page,
  }) => {
    await expect(connectionModal.hostInput).toBeVisible();
    await expect(connectionModal.portInput).toBeVisible();
    await expect(connectionModal.usernameInput).toBeVisible();
    await expect(connectionModal.passwordInput).toBeVisible();
    await expect(connectionModal.databaseInput).toBeVisible();
  });

  test('[US1] Port field is auto-filled with PostgreSQL default (5432)', async ({
    page,
  }) => {
    await expect(connectionModal.portInput).toHaveValue('5432');
  });

  test('[US1] Connection Name field is pre-filled with default value', async ({
    page,
  }) => {
    // The hook initializes connectionName to 'my-abc-db:dev'
    await expect(connectionModal.connectionNameInput).not.toHaveValue('');
  });

  test('[US1] Test and Create buttons are disabled when Host is empty', async ({
    page,
  }) => {
    // Host is empty, so isFormValid = false even though name and port are pre-filled
    await expect(connectionModal.testButton).toBeDisabled();
    await expect(connectionModal.createButton).toBeDisabled();
  });

  test('[US1] Connection String and Connection Form tabs are both present', async ({
    page,
  }) => {
    await expect(
      page.getByRole('tab', { name: /connection string/i })
    ).toBeVisible();
    await expect(connectionModal.connectionFormTab).toBeVisible();
  });
});

test.describe('US2 — Form-Based Connection: Button State Assertions', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Form Create Workspace');
    await workspacesPage.openWorkspace('Form Create Workspace');
    await connectionModal.expectModalOpen();
    await connectionModal.completeStep1('PostgreSQL');
    await connectionModal.selectConnectionFormTab();
  });

  test('[US2] filling required form fields enables the Test button', async ({
    page,
  }) => {
    await connectionModal.fillFormCredentials({
      host: 'localhost',
      username: 'postgres',
      database: 'testdb',
    });
    await expect(connectionModal.testButton).toBeEnabled();
  });

  test('[US2] filling required form fields enables the Create button', async ({
    page,
  }) => {
    await connectionModal.fillFormCredentials({
      host: 'localhost',
      username: 'postgres',
      database: 'testdb',
    });
    await expect(connectionModal.createButton).toBeEnabled();
  });

  test('[US2] Test button is disabled when Username is missing', async ({
    page,
  }) => {
    await connectionModal.hostInput.fill('localhost');
    await connectionModal.databaseInput.fill('testdb');
    // username left empty
    await expect(connectionModal.testButton).toBeDisabled();
  });

  test('[US2] Test button is disabled when Database is missing', async ({
    page,
  }) => {
    await connectionModal.hostInput.fill('localhost');
    await connectionModal.usernameInput.fill('postgres');
    // database left empty
    await expect(connectionModal.testButton).toBeDisabled();
  });

  test('[US2] Connection Name can be changed and is reflected in the field', async ({
    page,
  }) => {
    await connectionModal.fillConnectionName('My Production DB');
    await expect(connectionModal.connectionNameInput).toHaveValue(
      'My Production DB'
    );
  });
});

test.describe('US7 — Expanded Family Field Rendering', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);
    const workspaceName = `Expanded Family Workspace ${Date.now()}`;

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

  test('Redis form uses Redis defaults and connection-string placeholder', async () => {
    await connectionModal.completeStep1('Redis');
    await connectionModal.expectConnectionStringPlaceholder(/redis:\/\//i);
    await connectionModal.selectConnectionFormTab();

    await connectionModal.expectPortPlaceholder('6379');
    await connectionModal.expectStructuredTargetLabel(/database/i);
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
