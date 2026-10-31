import { expect, test } from '@playwright/test';
import {
  copyDuckDbFixtures,
  fillDuckDbForm,
  installDesktopBridge,
  openWorkspace,
  skipWithoutDesktopServer,
  type DuckDbFixtureCopy,
} from '../helpers/duckdb-workspace';
import { connectSqlWorkspace } from '../helpers/sql-workspace';

test.describe('DuckDB connection', () => {
  let fixtures: DuckDbFixtureCopy;

  test.beforeAll(() => {
    fixtures = copyDuckDbFixtures();
  });

  test.afterAll(() => {
    fixtures.dispose();
  });

  test('web runtime shows the card as desktop only', async ({ page }) => {
    await openWorkspace(page, `DuckDB web ${Date.now()}`);
    await page.getByTestId('connection-add-button').first().click();

    await expect(page.getByTestId('db-type-card-duckdb')).toContainText(
      /desktop only/i
    );
  });

  test('lists MotherDuck as coming soon', async ({ page }) => {
    await openWorkspace(page, `DuckDB cards ${Date.now()}`);
    await page.getByTestId('connection-add-button').first().click();

    await expect(page.getByTestId('db-type-card-motherduck')).toContainText(
      /coming soon/i
    );
  });

  test.describe('desktop runtime', () => {
    test.beforeEach(async ({ page, request }) => {
      await skipWithoutDesktopServer(request);
      await installDesktopBridge(page);
      await openWorkspace(page, `DuckDB wizard ${Date.now()}`);
    });

    test('offers only the database file method', async ({ page }) => {
      await fillDuckDbForm(page, { connectionName: 'shop', filePath: '' });

      await expect(page.getByRole('tab')).toHaveText(['Database File']);
      await expect(
        page.getByTestId('connection-file-path-input')
      ).toHaveAttribute('placeholder', /\.duckdb$/);
    });

    test('tests and creates a connection from a pasted path', async ({
      page,
    }) => {
      await fillDuckDbForm(page, {
        connectionName: 'shop',
        filePath: fixtures.shop,
      });
      await page.getByTestId('connection-test-button').click();

      await expect(page.getByTestId('connection-test-success')).toBeVisible({
        timeout: 30_000,
      });

      await page.getByTestId('connection-submit-button').click();
      await connectSqlWorkspace(page, 'shop');

      await expect(page.getByTestId('schema-selector')).toBeVisible({
        timeout: 30_000,
      });
    });

    test('explains a missing file', async ({ page }) => {
      await fillDuckDbForm(page, {
        connectionName: 'missing',
        filePath: '/tmp/orcaq-missing.duckdb',
      });
      await page.getByTestId('connection-test-button').click();

      await expect(page.getByTestId('connection-test-error')).toContainText(
        'The DuckDB file could not be opened.',
        { timeout: 30_000 }
      );
    });

    test('rejects a file that is not a DuckDB database', async ({ page }) => {
      await fillDuckDbForm(page, {
        connectionName: 'not-duckdb',
        filePath: `${process.cwd()}/package.json`,
      });
      await page.getByTestId('connection-test-button').click();

      await expect(page.getByTestId('connection-test-error')).toContainText(
        'This file is not a DuckDB database.',
        { timeout: 30_000 }
      );
    });
  });
});
