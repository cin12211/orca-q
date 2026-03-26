import { test, expect } from '@playwright/test';
import { WorkspacesPage } from './pages/WorkspacesPage';

test.describe('US1 — Workspace List Page', () => {
  test('renders empty state when no workspaces exist', async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.expectEmptyState();
  });

  test('page loads without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();

    // Wait for page to fully hydrate
    await expect(page).toHaveURL('/');
    expect(errors).toHaveLength(0);
  });

  test('New Workspace button is visible and clickable in empty state', async ({
    page,
  }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await expect(workspacesPage.emptyStateButton).toBeEnabled();
  });
});

test.describe('US2 — Create Workspace via Modal', () => {
  test('clicking New Workspace opens the create modal', async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.clickNewWorkspace();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(workspacesPage.createModalNameInput).toBeVisible();
    await expect(workspacesPage.createModalSubmitButton).toBeVisible();
  });

  test('user can create a workspace and see it in the grid', async ({
    page,
  }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.createWorkspace('My Test Workspace');
    await workspacesPage.expectWorkspaceCard('My Test Workspace');
  });

  test('created workspace card shows the workspace name', async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Design Hub');
    await workspacesPage.expectWorkspaceCard('Design Hub');
  });

  test('closing modal without filling name does not create a workspace', async ({
    page,
  }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    await workspacesPage.clickNewWorkspace();
    await expect(page.getByRole('dialog')).toBeVisible();
    await workspacesPage.closeWorkspaceModal();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
    await workspacesPage.expectEmptyState();
  });
});

test.describe('US3 — Search / Filter Workspaces', () => {
  test.beforeEach(async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.goto();
    // Create two workspaces with distinct names
    await workspacesPage.createWorkspace('Alpha Project');
    await workspacesPage.createWorkspace('Beta Analytics');
  });

  test('search filters workspaces by name', async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.searchWorkspaces('Alpha');

    await workspacesPage.expectWorkspaceCard('Alpha Project');
    await workspacesPage.expectNoWorkspaceCard('Beta Analytics');
  });

  test('clearing search restores all workspace cards', async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.searchWorkspaces('Alpha');
    await workspacesPage.expectNoWorkspaceCard('Beta Analytics');

    await workspacesPage.clearSearch();

    await workspacesPage.expectWorkspaceCard('Alpha Project');
    await workspacesPage.expectWorkspaceCard('Beta Analytics');
  });

  test('search with no matches shows empty state message', async ({ page }) => {
    const workspacesPage = new WorkspacesPage(page);
    await workspacesPage.searchWorkspaces('zzz-no-match-zzz');

    await expect(page.getByText("There's no workspaces")).toBeVisible();
    await workspacesPage.expectNoWorkspaceCard('Alpha Project');
    await workspacesPage.expectNoWorkspaceCard('Beta Analytics');
  });
});
