import { test, expect } from '@playwright/test';
import { ConnectionModalPage } from './pages/ConnectionModalPage';
import { WorkspacesPage } from './pages/WorkspacesPage';

/**
 * Feature 003 — Connection Form E2E Tests
 * US3: SSL Configuration Expansion & Field Entry
 *
 * All tests in this file are UI-only — no live database required.
 * SSL accordion lives inside the Connection Form tab (step 2).
 */

test.describe('US3 — SSL Configuration Accordion', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace('SSL Test Workspace');
    await workspacesPage.openWorkspace('SSL Test Workspace');
    await connectionModal.expectModalOpen();
    await connectionModal.completeStep1('PostgreSQL');
    await connectionModal.selectConnectionFormTab();
  });

  test('[US3] SSL Configuration accordion trigger is visible', async ({
    page,
  }) => {
    await expect(page.getByText('SSL Configuration')).toBeVisible();
  });

  test('[US3] clicking SSL accordion expands it and shows the Enable SSL toggle', async ({
    page,
  }) => {
    await connectionModal.expandSslAccordion();
    await expect(connectionModal.sslEnabledToggle).toBeVisible();
  });

  test('[US3] SSL certificate fields are hidden when SSL is disabled', async ({
    page,
  }) => {
    await connectionModal.expandSslAccordion();
    // Toggle is off by default — certificate fields should not be visible
    await expect(connectionModal.sslModeSelect).not.toBeVisible();
    await expect(connectionModal.sslCaTextarea).not.toBeVisible();
  });

  test('[US3] enabling SSL reveals SSL Mode selector and certificate textareas', async ({
    page,
  }) => {
    await connectionModal.expandSslAccordion();
    await connectionModal.enableSsl();

    await expect(connectionModal.sslModeSelect).toBeVisible();
    await expect(connectionModal.sslCaTextarea).toBeVisible();
    await expect(connectionModal.sslCertTextarea).toBeVisible();
    await expect(connectionModal.sslKeyTextarea).toBeVisible();
  });

  test('[US3] user can select "require" from the SSL Mode dropdown', async ({
    page,
  }) => {
    await connectionModal.expandSslAccordion();
    await connectionModal.enableSsl();

    // Select "require" option via the Select component
    await connectionModal.sslModeSelect.click();
    await page.getByRole('option', { name: 'Require' }).click();

    // Verify the displayed value reflects the selection
    await expect(connectionModal.sslModeSelect).toContainText('Require');
  });

  test('[US3] CA Certificate textarea accepts and retains pasted content', async ({
    page,
  }) => {
    await connectionModal.expandSslAccordion();
    await connectionModal.enableSsl();

    const certContent =
      '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkq...\n-----END CERTIFICATE-----';
    await connectionModal.sslCaTextarea.fill(certContent);
    await expect(connectionModal.sslCaTextarea).toHaveValue(certContent);
  });

  test('[US3] Client Certificate and SSL Key textareas accept input independently', async ({
    page,
  }) => {
    await connectionModal.expandSslAccordion();
    await connectionModal.enableSsl();

    await connectionModal.sslCertTextarea.fill('client-cert-content');
    await connectionModal.sslKeyTextarea.fill('ssl-key-content');

    await expect(connectionModal.sslCertTextarea).toHaveValue(
      'client-cert-content'
    );
    await expect(connectionModal.sslKeyTextarea).toHaveValue('ssl-key-content');
  });
});
