import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { getLatestVersion } from '../../../core/data/changelogs/changelog';

// The key used by useChangelogModal to track the last-seen version.
// Setting it before page load reduces churn, while explicit dismissal below
// keeps tests stable across version bumps.
const CHANGELOG_KEY = 'orcaq-last-seen-version';
const CHANGELOG_SEEN_VERSION = getLatestVersion();
const PERSISTED_IDB_NAMES = [
  'appConfigIDB',
  'agentStateIDB',
  'workspaceIDB',
  'workspaceStateIDB',
  'connectionStoreIDB',
  'tabViewsIDB',
  'quickQueryLogsIDB',
  'rowQueryFileIDBStore',
  'rowQueryFileContentIDBStore',
  'environmentTagIDB',
  'migrationStateIDB',
];

export class WorkspacesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private async dismissChangelogIfVisible() {
    const changelogButton = this.page.getByRole('dialog').getByRole('button', {
      name: /got it, thanks!|thanks/i,
    });

    const isVisible = await changelogButton
      .waitFor({ state: 'visible', timeout: 1500 })
      .then(() => true)
      .catch(() => false);

    if (!isVisible) {
      return;
    }

    await changelogButton.click();
    await expect(changelogButton).not.toBeVisible({ timeout: 5000 });
  }

  private async resetClientStorage() {
    await this.page.evaluate(
      async ({ changelogKey, changelogVersion, dbNames }) => {
        localStorage.clear();
        sessionStorage.clear();

        await Promise.all(
          dbNames.map(
            dbName =>
              new Promise<void>(resolve => {
                const request = indexedDB.deleteDatabase(dbName);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
              })
          )
        );

        localStorage.setItem(changelogKey, changelogVersion);
      },
      {
        changelogKey: CHANGELOG_KEY,
        changelogVersion: CHANGELOG_SEEN_VERSION,
        dbNames: PERSISTED_IDB_NAMES,
      }
    );
  }

  async goto() {
    await this.page.context().clearCookies();

    // The Nuxt dev server can keep the splash template mounted while late assets
    // finish loading; DOM readiness is enough for the test storage reset flow.
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await this.resetClientStorage();
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.dismissChangelogIfVisible();
    await expect(this.headerCreateButton).toBeVisible({ timeout: 30_000 });
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  get emptyStateText(): Locator {
    return this.page.getByText('No workspaces found', { exact: true });
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
    await this.dismissChangelogIfVisible();

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
