import { expect, test, type Page } from '@playwright/test';
import {
  copyDuckDbFixtures,
  openDuckDbWorkspace,
  queryResultSummary,
  skipWithoutDesktopServer,
  type DuckDbFixtureCopy,
} from '../helpers/duckdb-workspace';
import {
  openExplorerRawQueryFile,
  setRawQueryEditorContent,
} from '../helpers/sql-workspace';

async function runQuery(page: Page, sql: string) {
  await setRawQueryEditorContent(page, sql);
  await page.getByTestId('raw-query-execute-button').click();
}

test.describe('DuckDB raw query', () => {
  let fixtures: DuckDbFixtureCopy;

  test.beforeAll(() => {
    fixtures = copyDuckDbFixtures();
  });

  test.afterAll(() => {
    fixtures.dispose();
  });

  test.beforeEach(async ({ page, request }) => {
    await skipWithoutDesktopServer(request);
    await openDuckDbWorkspace(page, { filePath: fixtures.shop });
    await openExplorerRawQueryFile(page, `duckdb-${Date.now()}.sql`);
  });

  test('runs DuckDB-specific SELECT syntax', async ({ page }) => {
    await runQuery(
      page,
      `SELECT sales.net_amount(100, 2, 10) AS net, [1, 2, 3][2:3] AS sliced, {'a': 1} AS item;`
    );

    await expect(queryResultSummary(page)).toContainText('1 rows', {
      timeout: 30_000,
    });

    const grid = page.getByTestId('data-grid').last();
    await expect(grid).toContainText('180');
    await expect(grid).toContainText('{"a":1}');
  });

  test('renders nested types as readable JSON', async ({ page }) => {
    await runQuery(
      page,
      'SELECT col_struct, col_map, col_list FROM main.all_types WHERE id = 1;'
    );

    const grid = page.getByTestId('data-grid').last();
    await expect(grid).toContainText('"score":42', { timeout: 30_000 });
    await expect(grid).toContainText('"key":"a"');
    await expect(grid).not.toContainText('[object Object]');
  });

  test('reports DDL and row counts for mutations', async ({ page }) => {
    const mutationMessage = page.getByTestId('raw-query-mutation-message');

    await runQuery(
      page,
      'CREATE TABLE sales.e2e_note (id INTEGER, body TEXT);'
    );
    await expect(mutationMessage).toContainText('CREATE successful.', {
      timeout: 30_000,
    });

    await runQuery(
      page,
      `INSERT INTO sales.e2e_note VALUES (1, 'a'), (2, 'b');`
    );
    await expect(mutationMessage).toContainText(/2 rows? affected/i, {
      timeout: 30_000,
    });

    await runQuery(page, `UPDATE sales.e2e_note SET body = 'c' WHERE id = 1;`);
    await expect(mutationMessage).toContainText(/1 rows? affected/i, {
      timeout: 30_000,
    });
  });

  test('prompts for variables but not list slices', async ({ page }) => {
    await runQuery(
      page,
      'SELECT id, [1, 2, 3][1:2] AS sliced FROM sales.orders WHERE id = :order_id;'
    );

    const dialog = page.getByTestId('missing-variables-dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.locator('input')).toHaveCount(1);

    await page.getByTestId('missing-variable-input-order_id').fill('7');
    await page.getByTestId('missing-variables-execute').click();

    await expect(queryResultSummary(page)).toContainText('1 rows', {
      timeout: 30_000,
    });
  });

  test('shows driver errors', async ({ page }) => {
    await runQuery(page, 'SELECT * FROM sales.does_not_exist;');

    await expect(page.getByTestId('raw-query-error')).toContainText(
      /Table with name does_not_exist does not exist/,
      { timeout: 30_000 }
    );
  });

  test('keeps session state between runs', async ({ page }) => {
    await runQuery(
      page,
      'CREATE TEMP TABLE e2e_session AS SELECT 41 + 1 AS v;'
    );
    await expect(page.getByTestId('raw-query-mutation-message')).toContainText(
      'CREATE successful',
      { timeout: 30_000 }
    );

    await runQuery(page, 'SELECT v FROM e2e_session;');
    await expect(page.getByTestId('data-grid').last()).toContainText('42', {
      timeout: 30_000,
    });
  });
});
