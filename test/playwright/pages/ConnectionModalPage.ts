import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class ConnectionModalPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Management Connections modal ──────────────────────────────────────────
  get modalHeading(): Locator {
    return this.page.getByText('Management Connections');
  }

  get addConnectionButton(): Locator {
    // Two "Add Connection" buttons exist: one in the header, one in the empty-state list.
    // Both trigger the same create-connection flow. Use first() to avoid strict mode violation.
    return this.page.getByRole('button', { name: 'Add Connection' }).first();
  }

  async expectModalOpen() {
    await expect(this.modalHeading).toBeVisible();
    await expect(this.addConnectionButton).toBeVisible();
  }

  async clickAddConnection() {
    await this.addConnectionButton.click();
  }

  // ── Step 1: Database type selection ───────────────────────────────────────
  get step1Heading(): Locator {
    return this.page.getByText('Select Database Type');
  }

  get nextButton(): Locator {
    return this.page.getByRole('button', { name: /next/i });
  }

  async expectStep1() {
    await expect(this.step1Heading).toBeVisible();
  }

  async selectDbType(name: string) {
    // Click the card that contains the DB type name text
    await this.page.getByText(name, { exact: true }).click();
  }

  async advanceToStep2() {
    await this.nextButton.click();
    await expect(this.page.getByText('Connection Details')).toBeVisible();
  }

  // ── Step 2: Connection credentials ────────────────────────────────────────
  get step2Heading(): Locator {
    return this.page.getByText('Connection Details');
  }

  get connectionNameInput(): Locator {
    return this.page.locator('#connection-name');
  }

  get connectionStringInput(): Locator {
    return this.page.locator('#connection-string');
  }

  get testButton(): Locator {
    return this.page.getByRole('button', { name: /^test$/i });
  }

  get createButton(): Locator {
    return this.page.getByRole('button', { name: /^create$/i });
  }

  async expectStep2() {
    await expect(this.step2Heading).toBeVisible();
  }

  async fillConnectionName(name: string) {
    await this.connectionNameInput.fill(name);
  }

  async selectConnectionStringTab() {
    await this.page.getByRole('tab', { name: /connection string/i }).click();
  }

  async fillConnectionString(connectionString: string) {
    await this.connectionStringInput.fill(connectionString);
  }

  async clickTestConnection() {
    await this.testButton.click();
  }

  async expectConnectionSuccess() {
    await expect(this.page.getByText('Connection successful!')).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectConnectionError() {
    await expect(this.page.getByText('Connection failed.')).toBeVisible({
      timeout: 15_000,
    });
  }

  async clickCreate() {
    await this.createButton.click();
  }

  // ── Full add connection flow (step 1 → step 2) ────────────────────────────
  async completeStep1(dbType = 'PostgreSQL') {
    await this.clickAddConnection();
    await this.expectStep1();
    await this.selectDbType(dbType);
    await this.advanceToStep2();
  }

  /**
   * Opens the connection modal and proceeds to step 2.
   * If clipboard auto-detect skips step 1 automatically, handles both paths.
   */
  async openAndReachStep2(dbType = 'PostgreSQL') {
    await this.clickAddConnection();
    // Give auto-detect a moment to run
    await this.page.waitForTimeout(300);
    const isAlreadyStep2 = await this.step2Heading.isVisible();
    if (!isAlreadyStep2) {
      await this.expectStep1();
      await this.selectDbType(dbType);
      await this.advanceToStep2();
    }
  }

  // ── Connection Form tab ───────────────────────────────────────────────────
  get connectionFormTab(): Locator {
    return this.page.getByRole('tab', { name: /connection form/i });
  }

  async selectConnectionFormTab() {
    await this.connectionFormTab.click();
    // Wait for form fields to appear
    await expect(this.page.locator('#host')).toBeVisible();
  }

  // ── Form credential fields ────────────────────────────────────────────────
  get hostInput(): Locator {
    return this.page.locator('#host');
  }

  get portInput(): Locator {
    return this.page.locator('#port');
  }

  get usernameInput(): Locator {
    return this.page.locator('#username');
  }

  get passwordInput(): Locator {
    return this.page.locator('#password');
  }

  get databaseInput(): Locator {
    return this.page.locator('#database');
  }

  async fillFormCredentials(opts: {
    host: string;
    port?: string;
    username: string;
    password?: string;
    database: string;
  }) {
    await this.hostInput.fill(opts.host);
    if (opts.port) await this.portInput.fill(opts.port);
    await this.usernameInput.fill(opts.username);
    if (opts.password) await this.passwordInput.fill(opts.password);
    await this.databaseInput.fill(opts.database);
  }

  // ── SSL Configuration accordion ───────────────────────────────────────────
  get sslAccordionTrigger(): Locator {
    // The accordion trigger contains text "SSL Configuration" in a <span>
    return this.page
      .locator('[data-radix-collection-item]')
      .filter({ hasText: /SSL Configuration/i })
      .first();
  }

  async expandSslAccordion() {
    // Click the AccordionTrigger which contains "SSL Configuration"
    await this.page.getByText('SSL Configuration').click();
    await expect(this.page.locator('#ssl-enabled')).toBeVisible();
  }

  get sslEnabledToggle(): Locator {
    return this.page.locator('#ssl-enabled');
  }

  get sslModeSelect(): Locator {
    return this.page.locator('#ssl-mode');
  }

  get sslCaTextarea(): Locator {
    return this.page.locator('#ssl-ca');
  }

  get sslCertTextarea(): Locator {
    return this.page.locator('#ssl-cert');
  }

  get sslKeyTextarea(): Locator {
    return this.page.locator('#ssl-key');
  }

  async enableSsl() {
    // Switch renders as role="switch"; click to toggle on
    await this.sslEnabledToggle.click();
    await expect(this.sslModeSelect).toBeVisible();
  }

  // ── SSH Tunnel accordion ──────────────────────────────────────────────────
  async expandSshAccordion() {
    await this.page.getByText('SSH Tunnel').click();
    await expect(this.page.locator('#ssh-enabled')).toBeVisible();
  }

  get sshEnabledToggle(): Locator {
    return this.page.locator('#ssh-enabled');
  }

  get sshHostInput(): Locator {
    return this.page.locator('#ssh-host');
  }

  get sshPortInput(): Locator {
    return this.page.locator('#ssh-port');
  }

  get sshUserInput(): Locator {
    return this.page.locator('#ssh-user');
  }

  get sshPasswordInput(): Locator {
    return this.page.locator('#ssh-password');
  }

  get sshUseKeyCheckbox(): Locator {
    return this.page.locator('#ssh-use-key');
  }

  get sshPrivateKeyTextarea(): Locator {
    return this.page.locator('#ssh-key-file');
  }

  async enableSsh() {
    // Switch renders as role="switch"; click to toggle on
    await this.sshEnabledToggle.click();
    await expect(this.sshHostInput).toBeVisible();
  }

  async enableSshKeyAuth() {
    // Checkbox renders as role="checkbox"; click to check
    await this.sshUseKeyCheckbox.click();
    await expect(this.sshPrivateKeyTextarea).toBeVisible();
  }
}
