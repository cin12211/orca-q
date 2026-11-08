import { test, expect } from '@playwright/test';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

/**
 * Connection Form — detailed error feedback.
 *
 * No live database required: the failure itself is the subject. Pointing at a
 * closed local port yields a fast, deterministic "connection refused" that the
 * backend normalizes into an actionable message + hint + raw detail.
 */

test.describe('Connection form — detailed errors', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace('Conn Error Workspace');
    await workspacesPage.openWorkspace('Conn Error Workspace');
    await connectionModal.expectModalOpen();
    await connectionModal.completeStep1('PostgreSQL');
    await connectionModal.selectConnectionFormTab();
  });

  test('shows an actionable message, a hint, and expandable technical detail', async () => {
    await connectionModal.fillFormCredentials({
      host: '127.0.0.1',
      port: '1', // closed port → immediate ECONNREFUSED
      username: 'postgres',
      database: 'testdb',
    });

    await connectionModal.clickTestConnection();

    // A clear, non-generic message.
    await connectionModal.expectConnectionError(/refused|could not connect/i);

    // An actionable hint.
    await expect(connectionModal.testErrorHint).toBeVisible();
    expect(
      (await connectionModal.testErrorHint.textContent())?.length
    ).toBeGreaterThan(0);

    // Raw technical detail is collapsed until requested, then reveals the code.
    await expect(connectionModal.testErrorDetail).toHaveCount(0);
    await connectionModal.testErrorDetailToggle.click();
    await expect(connectionModal.testErrorDetail).toBeVisible();
    await expect(connectionModal.testErrorDetail).toContainText(
      /ECONNREFUSED/i
    );
  });
});
