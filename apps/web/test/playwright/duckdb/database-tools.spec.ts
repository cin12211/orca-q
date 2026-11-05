import { expect, test } from '@playwright/test';
import {
  copyDuckDbFixtures,
  openDatabaseTools,
  openDuckDbWorkspace,
  skipWithoutDesktopServer,
  type DuckDbFixtureCopy,
} from '../helpers/duckdb-workspace';

test.describe('DuckDB database tools', () => {
  let fixtures: DuckDbFixtureCopy;

  test.beforeAll(() => {
    fixtures = copyDuckDbFixtures();
  });

  test.afterAll(() => {
    fixtures.dispose();
  });

  test.beforeEach(async ({ page, request }) => {
    await skipWithoutDesktopServer(request);
    await openDuckDbWorkspace(page, {
      filePath: fixtures.shop,
      stagingFilePath: fixtures.staging,
    });
    await openDatabaseTools(page);
  });

  test('disables backup with a notice', async ({ page }) => {
    await expect(page.getByTestId('database-tool-backup')).toBeDisabled();
    await expect(page.getByTestId('database-tools-notice')).toContainText(
      'Backup & Restore is not available for DuckDB connections.'
    );
  });

  test('shows instance insights', async ({ page }) => {
    await page.getByTestId('database-tool-instance-insights').click();

    await expect(page.getByTestId('instance-insights-version')).toContainText(
      /DuckDB v\d/,
      { timeout: 30_000 }
    );

    await page.getByRole('tab', { name: 'Configuration' }).click();
    await expect(page.getByText('access_mode', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('diffs against the staging file', async ({ page }) => {
    await page.getByTestId('database-tool-schema-diff').click();
    await expect(page.getByTestId('schema-diff-run-button')).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId('schema-diff-target').getByRole('combobox').click();
    await page.getByTestId('connection-option-shop-staging').click();
    await page.getByTestId('schema-diff-run-button').click();
    await page.getByRole('tab', { name: /SQL/ }).click();

    await expect(page.getByTestId('schema-diff-sql')).toContainText('sales', {
      timeout: 30_000,
    });
  });

  test('hides features DuckDB does not have', async ({ page }) => {
    await expect(page.getByTestId('activity-item-Agent')).toHaveCount(0);
    await expect(page.getByTestId('activity-item-UsersRoles')).toHaveCount(0);
  });
});
