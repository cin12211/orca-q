import { expect, test, type Page } from '@playwright/test';
import { getMongoFixtureConfig } from '../../support/db-fixtures';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

const mongoFixture = getMongoFixtureConfig();

async function openConnectedMongoWorkspace(page: Page, retry: number) {
  const workspacesPage = new WorkspacesPage(page);
  const connectionModal = new ConnectionModalPage(page);
  const workspaceName = `Mongo Insights Workspace ${Date.now()}-${retry}`;
  const connectionName = 'Mongo Insights Connection';

  await workspacesPage.goto();
  await workspacesPage.createWorkspace(workspaceName);
  await workspacesPage.openWorkspace(workspaceName);

  await connectionModal.completeStep1('MongoDB');
  await connectionModal.fillConnectionName(connectionName);
  await connectionModal.selectConnectionStringTab();
  await connectionModal.fillConnectionString(mongoFixture.url);
  await connectionModal.clickCreate();
  await connectionModal.expectConnectionRow(connectionName);
  await connectionModal.connectConnection(connectionName);

  await expect(page.getByText('orcaq_fixture', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

async function openInstanceInsightsFromCommandPalette(page: Page) {
  await page.keyboard.press('Meta+k');
  const palette = page.getByRole('dialog', { name: 'Command Palette' });
  const searchInput = palette.getByPlaceholder('Type a command or search...');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('Instance Insights');
  // The label is split into highlight spans, so select the row by command id.
  const command = palette.locator('[value="cmd-show-instance-insights"]');
  await expect(command).toBeVisible();
  await command.click();

  await expect(page).toHaveURL(/\/instance-insights$/, { timeout: 30_000 });
}

test.describe('MongoDB Instance Insights (local fixture)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await openConnectedMongoWorkspace(page, testInfo.retry);
    await openInstanceInsightsFromCommandPalette(page);
  });

  test('Overview shows server status from the fixture', async ({ page }) => {
    await expect(
      page.getByText('Instance Insights', { exact: true })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();

    const overview = page.getByRole('tabpanel', { name: 'Overview' });

    await expect(overview.getByText('mongod · wiredTiger')).toBeVisible({
      timeout: 30_000,
    });
    await expect(overview.getByText(/^\d+\.\d+\.\d+$/).first()).toBeVisible();
    await expect(
      overview.getByText('Connections', { exact: true })
    ).toBeVisible();
    await expect(overview.getByText(/\d+ available$/)).toBeVisible();
    await expect(overview.getByText(/^Resident memory \d/)).toBeVisible();

    // Op rates need two samples, so the first auto refresh fills them in.
    const commandRate = overview
      .getByText('Command', { exact: true })
      .locator('xpath=following-sibling::p[1]');
    await expect(commandRate).toHaveText(/^\d+\.\d{2}\/s$/, {
      timeout: 20_000,
    });
  });

  test('Replication reports the standalone fixture', async ({ page }) => {
    await page.getByRole('tab', { name: 'Replication' }).click();

    await expect(page.getByText('Standalone', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('This server runs standalone, without replication.')
    ).toBeVisible();
  });
});
