import { test, expect } from '@playwright/test';
import { ConnectionModalPage } from './pages/ConnectionModalPage';
import { WorkspacesPage } from './pages/WorkspacesPage';

/**
 * Feature 003 — Connection Form E2E Tests
 * US4: SSH Tunnel Configuration Expansion & Field Entry
 *
 * All tests in this file are UI-only — no live SSH server required.
 * SSH accordion lives inside the Connection Form tab (step 2).
 */

test.describe('US4 — SSH Tunnel Accordion', () => {
  let workspacesPage: WorkspacesPage;
  let connectionModal: ConnectionModalPage;

  test.beforeEach(async ({ page }) => {
    workspacesPage = new WorkspacesPage(page);
    connectionModal = new ConnectionModalPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace('SSH Test Workspace');
    await workspacesPage.openWorkspace('SSH Test Workspace');
    await connectionModal.expectModalOpen();
    await connectionModal.completeStep1('PostgreSQL');
    await connectionModal.selectConnectionFormTab();
  });

  test('[US4] SSH Tunnel accordion trigger is visible', async ({ page }) => {
    await expect(page.getByText('SSH Tunnel')).toBeVisible();
  });

  test('[US4] clicking SSH accordion expands it and shows the Over SSH toggle', async ({
    page,
  }) => {
    await connectionModal.expandSshAccordion();
    await expect(connectionModal.sshEnabledToggle).toBeVisible();
  });

  test('[US4] SSH credential fields are hidden when SSH is disabled', async ({
    page,
  }) => {
    await connectionModal.expandSshAccordion();
    // Toggle is off by default — SSH fields should not be visible
    await expect(connectionModal.sshHostInput).not.toBeVisible();
    await expect(connectionModal.sshPortInput).not.toBeVisible();
  });

  test('[US4] enabling Over SSH reveals Server, Port, User, and Password fields', async ({
    page,
  }) => {
    await connectionModal.expandSshAccordion();
    await connectionModal.enableSsh();

    await expect(connectionModal.sshHostInput).toBeVisible();
    await expect(connectionModal.sshPortInput).toBeVisible();
    await expect(connectionModal.sshUserInput).toBeVisible();
    await expect(connectionModal.sshPasswordInput).toBeVisible();
  });

  test('[US4] SSH host and port fields retain entered values', async ({
    page,
  }) => {
    await connectionModal.expandSshAccordion();
    await connectionModal.enableSsh();

    await connectionModal.sshHostInput.fill('ssh.example.com');
    await connectionModal.sshPortInput.fill('22');

    await expect(connectionModal.sshHostInput).toHaveValue('ssh.example.com');
    await expect(connectionModal.sshPortInput).toHaveValue('22');
  });

  test('[US4] SSH Key Authentication checkbox reveals Private Key textarea', async ({
    page,
  }) => {
    await connectionModal.expandSshAccordion();
    await connectionModal.enableSsh();
    await connectionModal.enableSshKeyAuth();

    await expect(connectionModal.sshPrivateKeyTextarea).toBeVisible();
  });

  test('[US4] Private Key textarea accepts and retains pasted content', async ({
    page,
  }) => {
    await connectionModal.expandSshAccordion();
    await connectionModal.enableSsh();
    await connectionModal.enableSshKeyAuth();

    const privateKey =
      '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1...\n-----END OPENSSH PRIVATE KEY-----';
    await connectionModal.sshPrivateKeyTextarea.fill(privateKey);
    await expect(connectionModal.sshPrivateKeyTextarea).toHaveValue(privateKey);
  });

  test('[US4] SSH username and password fields retain entered values', async ({
    page,
  }) => {
    await connectionModal.expandSshAccordion();
    await connectionModal.enableSsh();

    await connectionModal.sshUserInput.fill('ubuntu');
    await connectionModal.sshPasswordInput.fill('secret123');

    await expect(connectionModal.sshUserInput).toHaveValue('ubuntu');
    await expect(connectionModal.sshPasswordInput).toHaveValue('secret123');
  });
});
