import { test, expect } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

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

  test('Oracle selection exposes service-name form fields and Oracle defaults', async ({
    page,
  }) => {
    const connectionModal = new ConnectionModalPage(page);

    await connectionModal.completeStep1('Oracle');
    await connectionModal.selectConnectionFormTab();

    await connectionModal.expectStructuredTargetLabel(/service name/i);
    await connectionModal.expectPortPlaceholder('1521');
  });
});
