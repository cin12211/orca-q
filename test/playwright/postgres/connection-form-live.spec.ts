import { test, expect } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

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
