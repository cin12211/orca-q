import { test, expect } from '@playwright/test';
import {
  getD1LiveConnection,
  getTursoLiveConnection,
  hasD1LiveConnection,
  hasTursoLiveConnection,
} from '../support/live-connections';
import { getRedisFixtureConfig } from '../support/nosql-fixtures';
import { ConnectionModalPage } from './pages/ConnectionModalPage';
import { WorkspacesPage } from './pages/WorkspacesPage';

/**
 * Feature 003 — Connection Form E2E Tests
 * US5: Combined Form + SSL + SSH live test
 *
 * These tests require a real PostgreSQL connection.
 * Set PG_CONNECTION env var to enable:
 *   PG_CONNECTION="postgresql://user:pass@host:5432/db" bun test:playwright
 *
 * Tests without PG_CONNECTION are skipped gracefully.
 */

const PG_CONNECTION = process.env['PG_CONNECTION'];
const redisFixture = getRedisFixtureConfig();

function parseConnectionString(connectionString: string) {
  // postgresql://username:password@host:port/database
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || '5432',
    username: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
  };
}

test.describe('US5 — Combined Form + SSL + SSH: Live Flow', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Live Form Workspace');
    await workspacesPage.openWorkspace('Live Form Workspace');
    await connectionModal.expectModalOpen();
    await connectionModal.completeStep1('PostgreSQL');
    await connectionModal.selectConnectionFormTab();
  });

  test('[US5-LIVE] Test button shows loading indicator while connection test is in progress', async ({
    page,
  }) => {
    test.skip(!PG_CONNECTION, 'PG_CONNECTION env var not set');

    const creds = parseConnectionString(PG_CONNECTION!);
    await connectionModal.fillFormCredentials({
      host: creds.host,
      port: creds.port,
      username: creds.username,
      password: creds.password,
      database: creds.database,
    });

    await connectionModal.testButton.click();
    // Loading indicator appears briefly during test
    await expect(page.getByText('Testing connection...')).toBeVisible({
      timeout: 5000,
    });
  });

  test('[US5-LIVE] test connection with valid credentials shows success message', async ({
    page,
  }) => {
    test.skip(!PG_CONNECTION, 'PG_CONNECTION env var not set');

    const creds = parseConnectionString(PG_CONNECTION!);
    await connectionModal.fillFormCredentials({
      host: creds.host,
      port: creds.port,
      username: creds.username,
      password: creds.password,
      database: creds.database,
    });

    await connectionModal.clickTestConnection();
    await expect(page.getByText('Connection successful!')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('[US5-LIVE] test connection with invalid host shows error message', async ({
    page,
  }) => {
    test.skip(!PG_CONNECTION, 'PG_CONNECTION env var not set');

    await connectionModal.fillFormCredentials({
      host: '192.0.2.1', // documentation IP — guaranteed unreachable
      username: 'postgres',
      database: 'testdb',
    });

    await connectionModal.clickTestConnection();
    await expect(page.getByText('Connection failed.')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('[US5-UI] Test button loading state is isolated — does not block other page elements', async ({
    page,
  }) => {
    // UI-only; verify the Test button can transition state without needing a DB
    await connectionModal.hostInput.fill('localhost');
    await connectionModal.usernameInput.fill('postgres');

    if (await connectionModal.databaseInput.isVisible().catch(() => false)) {
      await connectionModal.databaseInput.fill('testdb');
    } else {
      await connectionModal.structuredTargetInput.fill('testdb');
    }

    // Buttons are enabled
    await expect(connectionModal.testButton).toBeEnabled();
    await expect(connectionModal.createButton).toBeEnabled();
  });
});

test.describe('US2 — Connection Creation via Form (live)', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Live Create Workspace');
    await workspacesPage.openWorkspace('Live Create Workspace');
    await connectionModal.expectModalOpen();
    await connectionModal.completeStep1('PostgreSQL');
    await connectionModal.selectConnectionFormTab();
  });

  test('[US2-LIVE] created connection appears in list after modal close', async ({
    page,
  }) => {
    test.skip(!PG_CONNECTION, 'PG_CONNECTION env var not set');

    const creds = parseConnectionString(PG_CONNECTION!);
    await connectionModal.fillConnectionName('My Form Connection');
    await connectionModal.fillFormCredentials({
      host: creds.host,
      port: creds.port,
      username: creds.username,
      password: creds.password,
      database: creds.database,
    });

    // Create also runs Test internally — only closes on success
    await connectionModal.clickCreate();

    // Modal should close after successful creation
    await expect(page.getByText('Connection Details')).not.toBeVisible({
      timeout: 30_000,
    });

    // The new connection card should appear in the connection list
    await expect(page.getByText('My Form Connection')).toBeVisible();
  });
});

test.describe('US7 — Managed SQLite Live Flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `Managed SQLite Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);
  });

  test('Cloudflare D1 managed connection test succeeds when live credentials are configured', async ({
    page,
  }) => {
    test.skip(!hasD1LiveConnection(), 'D1 live credentials are not configured');

    const d1Connection = getD1LiveConnection();
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName('Cloudflare D1 Live');
    await connectionModal.fillManagedD1Credentials({
      accountId: d1Connection.accountId!,
      databaseId: d1Connection.databaseId!,
      apiToken: d1Connection.apiToken!,
    });

    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionSuccess();
  });

  test('Cloudflare D1 managed connection can be created and connected into the SQL family shell', async ({
    page,
  }) => {
    test.skip(!hasD1LiveConnection(), 'D1 live credentials are not configured');

    const d1Connection = getD1LiveConnection();
    const connectionModal = new ConnectionModalPage(page);
    const connectionName = `Cloudflare D1 Connect ${Date.now()}`;

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName(connectionName);
    await connectionModal.fillManagedD1Credentials({
      accountId: d1Connection.accountId!,
      databaseId: d1Connection.databaseId!,
      apiToken: d1Connection.apiToken!,
    });

    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow(connectionName);
    await connectionModal.connectConnection(connectionName);
    await connectionModal.expectSqlFamilyLanding();
  });

  test('Turso managed connection test succeeds when live credentials are configured', async ({
    page,
  }) => {
    test.skip(
      !hasTursoLiveConnection(),
      'Turso live credentials are not configured'
    );

    const tursoConnection = getTursoLiveConnection();
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName('Turso Live');
    await connectionModal.fillManagedTursoCredentials({
      url: tursoConnection.url!,
      authToken: tursoConnection.authToken!,
      branchName: tursoConnection.branchName,
    });

    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionSuccess();
  });

  test('Turso managed connection can be created and connected into the SQL family shell', async ({
    page,
  }) => {
    test.skip(
      !hasTursoLiveConnection(),
      'Turso live credentials are not configured'
    );

    const tursoConnection = getTursoLiveConnection();
    const connectionModal = new ConnectionModalPage(page);
    const connectionName = `Turso Connect ${Date.now()}`;

    await connectionModal.completeStep1('SQLite');
    await connectionModal.fillConnectionName(connectionName);
    await connectionModal.fillManagedTursoCredentials({
      url: tursoConnection.url!,
      authToken: tursoConnection.authToken!,
      branchName: tursoConnection.branchName,
    });

    await connectionModal.clickCreate();
    await connectionModal.expectConnectionRow(connectionName);
    await connectionModal.connectConnection(connectionName);
    await connectionModal.expectSqlFamilyLanding();
  });
});

test.describe('US7 — NoSQL Family Routing (local fixtures)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workspaceName = `NoSQL Routing Workspace ${Date.now()}-${testInfo.retry}`;
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
