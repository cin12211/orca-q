import { test, expect } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

const pgConnection = process.env['PG_CONNECTION'];

test.describe('US6 — Connection Credentials & Test (requires PG_CONNECTION)', () => {
  test.skip(
    !pgConnection,
    'PG_CONNECTION env var not set — skipping credential tests'
  );

  test.beforeEach(async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Credentials Workspace');
    await workspacesPage.openWorkspace('Credentials Workspace');
  });

  test('step 2 form renders connection name input and connection string input', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.completeStep1('PostgreSQL');

    await expect(connectionModal.connectionNameInput).toBeVisible();
    await connectionModal.selectConnectionStringTab();
    await expect(connectionModal.connectionStringInput).toBeVisible();
  });

  test('test connection with valid credentials shows success', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.completeStep1('PostgreSQL');

    await connectionModal.fillConnectionName('My PG Connection');
    await connectionModal.selectConnectionStringTab();
    await connectionModal.fillConnectionString(pgConnection!);
    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionSuccess();
  });

  test('test connection with invalid credentials shows error', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.completeStep1('PostgreSQL');

    await connectionModal.fillConnectionName('Bad Connection');
    await connectionModal.selectConnectionStringTab();
    await connectionModal.fillConnectionString(
      'postgresql://invalid:badpass@localhost:5432/nonexistent'
    );
    await connectionModal.clickTestConnection();
    await connectionModal.expectConnectionError();
  });
});

test.describe('US6 — Step 2 UI (no credentials needed)', () => {
  test.beforeEach(async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.createWorkspace('UI Workspace');
    await workspacesPage.openWorkspace('UI Workspace');
  });

  test('step 2 form renders connection string tab and connection name field', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.completeStep1('PostgreSQL');

    await expect(connectionModal.connectionNameInput).toBeVisible();
    await connectionModal.selectConnectionStringTab();
    await expect(connectionModal.connectionStringInput).toBeVisible();
  });

  test('Test button is disabled when form is empty', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.completeStep1('PostgreSQL');

    // Without filling required fields, the Test button should be disabled (isFormValid = false)
    await expect(connectionModal.testButton).toBeDisabled();
  });

  test('Create button is disabled when form is empty', async ({ page }) => {
    const connectionModal = new ConnectionModalPage(page);
    await connectionModal.completeStep1('PostgreSQL');

    await expect(connectionModal.createButton).toBeDisabled();
  });
});
