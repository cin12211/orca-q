import { expect, test } from '@playwright/test';
import {
  copyDuckDbFixtures,
  openDuckDbWorkspace,
  selectSchema,
  skipWithoutDesktopServer,
  type DuckDbFixtureCopy,
} from '../helpers/duckdb-workspace';
import {
  applyQuickQueryContainsFilter,
  editQuickQueryCell,
  expectManagementErdTableList,
  expectQuickQueryErdTab,
  expectQuickQueryRowContains,
  expectTableStructure,
  expectViewStructure,
  openQuickQueryTable,
  openSchemaItem,
  openSchemasSidebar,
} from '../helpers/sql-workspace';

test.describe('DuckDB schema browsing', () => {
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
  });

  test('lists every schema and its tables and views', async ({ page }) => {
    await page.getByTestId('schema-selector').click();

    for (const schemaName of ['analytics', 'inventory', 'main', 'sales']) {
      await expect(
        page.getByTestId(`schema-option-${schemaName}`)
      ).toBeVisible();
    }

    await page.keyboard.press('Escape');
    await selectSchema(page, 'sales');
    await openQuickQueryTable(page, 'orders');
    // Opening a table searches for it, which filters the tree.
    await openSchemasSidebar(page);

    for (const name of ['category', 'customer', 'order_item', 'product']) {
      await expect(page.getByTestId(`tree-row-${name}`)).toBeVisible();
    }
  });

  test('renders large integers without losing precision', async ({ page }) => {
    await selectSchema(page, 'main');
    await openQuickQueryTable(page, 'all_types');

    await expectQuickQueryRowContains(
      page,
      '170141183460469231731687303715884105727'
    );
  });

  test('pages through a large table', async ({ page }) => {
    await selectSchema(page, 'analytics');
    await openQuickQueryTable(page, 'event');

    const summary = page.getByTestId('pagination-summary');
    await expect(summary).toContainText(/1-100\s+of\s+5000/, {
      timeout: 30_000,
    });

    await page.getByTestId('pagination-next').click();

    await expect(summary).toContainText(/101-200\s+of\s+5000/, {
      timeout: 30_000,
    });
  });

  test('filters rows on any column type', async ({ page }) => {
    await selectSchema(page, 'sales');
    await openQuickQueryTable(page, 'product');

    await applyQuickQueryContainsFilter(page, 'SKU-00042');

    await expect(page.getByTestId('pagination-summary')).toContainText(
      /1-1\s+of\s+1/,
      { timeout: 30_000 }
    );
    await expectQuickQueryRowContains(page, 'SKU-00042');
  });

  test('edits a cell and persists it', async ({ page, request }) => {
    await selectSchema(page, 'sales');
    await openQuickQueryTable(page, 'customer');

    await editQuickQueryCell(page, {
      columnName: 'city',
      rowIndex: 0,
      value: 'Gadgetville',
    });
    await page.getByTestId('data-grid').click();
    await page.keyboard.press('Meta+S');

    await expect
      .poll(async () => {
        const response = await request.post('/api/query/execute', {
          data: {
            type: 'duckdb',
            filePath: fixtures.shop,
            query: 'SELECT city FROM sales.customer ORDER BY id LIMIT 1',
          },
        });

        return (await response.json()).result?.[0]?.city;
      })
      .toBe('Gadgetville');
  });

  // DuckDB turns updates of indexed columns into delete + insert, which a row
  // still referenced by a foreign key cannot survive.
  test('surfaces the driver error when a save is refused', async ({ page }) => {
    await selectSchema(page, 'sales');
    await openQuickQueryTable(page, 'category');

    await editQuickQueryCell(page, {
      columnName: 'name',
      rowIndex: 0,
      value: 'Gadgets',
    });
    await page.getByTestId('data-grid').click();
    await page.keyboard.press('Meta+S');

    await expect(page.getByText(/Violates foreign key constraint/)).toBeVisible(
      { timeout: 30_000 }
    );
  });

  test('shows table structure', async ({ page }) => {
    await selectSchema(page, 'sales');
    await openQuickQueryTable(page, 'orders');

    await expectTableStructure(page);
  });

  test('shows view rows and definition', async ({ page }) => {
    await selectSchema(page, 'analytics');
    await openSchemasSidebar(page);
    await openSchemaItem(page, {
      folderName: 'Views',
      itemName: 'top_customer',
    });

    await expectViewStructure(page);
    await expect(page.getByTestId('view-definition')).toContainText(
      'CREATE VIEW',
      { timeout: 30_000 }
    );
  });

  test('lists macros and shows their definition', async ({ page }) => {
    await selectSchema(page, 'sales');
    await openSchemasSidebar(page);

    await expect(page.getByTestId('tree-row-Functions')).toHaveCount(0);

    await page
      .getByTestId('tree-row-Macros')
      .locator('.tree-row__chevron')
      .click();
    await expect(
      page.getByTestId('tree-row-orders_of(target_customer_id)')
    ).toBeVisible();

    await page
      .getByTestId('tree-row-net_amount(unit_price, quantity, discount_pct)')
      .click();

    await expect(page.getByTestId('macro-definition')).toContainText(
      'CREATE MACRO',
      { timeout: 30_000 }
    );
    await expect(page.getByTestId('macro-definition')).toContainText(
      'net_amount'
    );
  });

  test('keeps macros read-only', async ({ page }) => {
    await selectSchema(page, 'sales');
    await openSchemasSidebar(page);
    await page
      .getByTestId('tree-row-Macros')
      .locator('.tree-row__chevron')
      .click();
    await page
      .getByTestId('tree-row-orders_of(target_customer_id)')
      .click({ button: 'right' });

    await expect(page.getByRole('menuitem', { name: /delete/i })).toHaveCount(
      0
    );
  });

  test('draws foreign keys in the ERD', async ({ page }) => {
    await selectSchema(page, 'sales');
    await openQuickQueryTable(page, 'orders');

    await expectQuickQueryErdTab(page, {
      tableName: 'orders',
      relatedTableName: 'customer',
    });
    await expectManagementErdTableList(page, [
      'category',
      'customer',
      'order_item',
      'orders',
      'product',
    ]);
  });
});
