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
