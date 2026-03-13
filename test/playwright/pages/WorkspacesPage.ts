import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// The key used by useChangelogModal to track the last-seen version.
// Setting it before page load prevents the "What's New" dialog from opening.
const CHANGELOG_KEY = 'orcaq-last-seen-version';
const CHANGELOG_SEEN_VERSION = '1.0.25';

export class WorkspacesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    // Suppress the changelog dialog so it doesn't block aria-modal interactions
    await this.page.addInitScript(
      ({ key, version }) => localStorage.setItem(key, version),
      { key: CHANGELOG_KEY, version: CHANGELOG_SEEN_VERSION }
    );
    await this.page.goto('/');
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  get emptyStateText(): Locator {
    return this.page.getByText("There's no workspaces");
  }

  get emptyStateButton(): Locator {
    // Use filter on text content to avoid aria-name issues caused by icon components
    return this.page
      .locator('button')
      .filter({ hasText: /new workspace/i })
      .first();
  }

  async expectEmptyState() {
    await expect(this.emptyStateText).toBeVisible();
    await expect(this.emptyStateButton).toBeVisible();
  }

  // ── Header create button (visible when workspaces exist) ─────────────────
  get headerCreateButton(): Locator {
    return this.page
      .locator('button')
      .filter({ hasText: /new workspace/i })
      .first();
  }

  // ── Search ───────────────────────────────────────────────────────────────
  get searchInput(): Locator {
    return this.page.getByPlaceholder('Search workspaces...');
  }

  async searchWorkspaces(query: string) {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  // ── Workspace grid ────────────────────────────────────────────────────────
  workspaceCardByName(name: string): Locator {
    // CardTitle renders the workspace name inside the card
    return this.page.getByRole('heading', { name, exact: true }).first();
  }

  async expectWorkspaceCard(name: string) {
    await expect(this.workspaceCardByName(name)).toBeVisible();
  }

  async expectNoWorkspaceCard(name: string) {
    await expect(this.workspaceCardByName(name)).not.toBeVisible();
  }

  async workspaceCardCount(): Promise<number> {
    // Each card has an "Open workspace" button; count them as a proxy for card count
    return await this.page
      .getByRole('button', { name: /open workspace/i })
      .count();
  }

  // ── Create Workspace Modal ────────────────────────────────────────────────
  async clickNewWorkspace() {
    // Click whichever "New Workspace" button is visible (empty state or header)
    await this.page
      .locator('button')
      .filter({ hasText: /new workspace/i })
      .first()
      .click();
  }

  get createModalNameInput(): Locator {
    return this.page.getByPlaceholder('Workspace name');
  }

  get createModalSubmitButton(): Locator {
    // The button inside the dialog says "Create" (or "Update" for edit)
    return this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create' });
  }

  async fillWorkspaceName(name: string) {
    await this.createModalNameInput.fill(name);
  }

  async submitWorkspaceModal() {
    await this.createModalSubmitButton.click();
  }

  async closeWorkspaceModal() {
    // Press Escape to close the dialog
    await this.page.keyboard.press('Escape');
  }

  // ── Full create flow ──────────────────────────────────────────────────────
  async createWorkspace(name: string) {
    await this.clickNewWorkspace();
    await this.fillWorkspaceName(name);
    await this.submitWorkspaceModal();
    // Wait for the modal to close and the card to appear
    await expect(this.page.getByRole('dialog')).not.toBeVisible({
      timeout: 5000,
    });
    await this.expectWorkspaceCard(name);
  }

  // ── Open workspace (triggers Management Connections modal) ────────────────
  async openWorkspace(name: string) {
    // Click the "Open workspace" button on the card matching the given name
    const card = this.page.locator('[class*="card"]').filter({ hasText: name });
    await card.getByRole('button', { name: /open workspace/i }).click();
  }
}
