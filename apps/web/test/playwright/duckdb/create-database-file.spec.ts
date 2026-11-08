import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  installDesktopBridge,
  openWorkspace,
  skipWithoutDesktopServer,
} from '../helpers/duckdb-workspace';

async function openCreateFileDialog(page: Page, cardTestId: string) {
  await page.getByTestId('connection-add-button').first().click();
  await page.getByTestId(cardTestId).click();
  await page.getByTestId('connection-step-next').click();
  await page.getByTestId('connection-create-file-button').click();
  await expect(page.getByTestId('create-database-file-dialog')).toBeVisible();
}

async function confirmCreateFile(page: Page, fileName: string) {
  await page.getByTestId('create-database-file-name').fill(fileName);
  await page.getByTestId('create-database-file-browse').click();
  await page.getByTestId('create-database-file-confirm').click();
}

async function chooseOption(page: Page, key: string, value: string) {
  await page.getByTestId(`create-database-file-${key}`).click();
  await page.getByTestId(`create-database-file-${key}-${value}`).click();
}

async function query(request: APIRequestContext, data: object) {
  const response = await request.post('/api/query/execute', { data });

  return (await response.json()).result;
}

test.describe('Create new database file', () => {
  let directory: string;

  test.beforeEach(async ({ page, request }) => {
    await skipWithoutDesktopServer(request);
    directory = mkdtempSync(join(tmpdir(), 'orcaq-create-file-e2e-'));
    await installDesktopBridge(page, { pickedDirectory: directory });
    await openWorkspace(page, `Create file ${Date.now()}`);
  });

  test.afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  for (const { label, cardTestId, extension } of [
    { label: 'DuckDB', cardTestId: 'db-type-card-duckdb', extension: 'duckdb' },
    { label: 'SQLite', cardTestId: 'db-type-card-sqlite', extension: 'sqlite' },
  ]) {
    test(`creates a ${label} file and connects to it`, async ({ page }) => {
      await openCreateFileDialog(page, cardTestId);
      await confirmCreateFile(page, 'analytics');

      await expect(
        page.getByTestId('create-database-file-dialog')
      ).toBeHidden();
      await expect(page.getByTestId('connection-file-path-input')).toHaveValue(
        join(directory, `analytics.${extension}`)
      );
      await expect(page.getByTestId('connection-name-input')).toHaveValue(
        'analytics'
      );

      await page.getByTestId('connection-test-button').click();
      await expect(page.getByTestId('connection-test-success')).toBeVisible({
        timeout: 30_000,
      });
    });
  }

  test('applies advanced DuckDB options', async ({ page, request }) => {
    await openCreateFileDialog(page, 'db-type-card-duckdb');
    await page.getByTestId('create-database-file-advanced').click();
    await chooseOption(page, 'storageVersion', 'v1.0.0');
    await chooseOption(page, 'blockSize', '16384');
    await confirmCreateFile(page, 'advanced');
    await expect(page.getByTestId('create-database-file-dialog')).toBeHidden();

    const [row] = await query(request, {
      type: 'duckdb',
      filePath: join(directory, 'advanced.duckdb'),
      query:
        "SELECT (SELECT block_size FROM pragma_database_size()) AS block_size, (SELECT tags['storage_version'] FROM duckdb_databases() WHERE NOT internal) AS version",
    });

    expect(row).toEqual({ block_size: '16384', version: 'v1.0.0+' });
  });

  test('applies advanced SQLite options', async ({ page, request }) => {
    await openCreateFileDialog(page, 'db-type-card-sqlite');
    await page.getByTestId('create-database-file-advanced').click();
    await chooseOption(page, 'journalMode', 'WAL');
    await chooseOption(page, 'pageSize', '8192');
    await confirmCreateFile(page, 'advanced');
    await expect(page.getByTestId('create-database-file-dialog')).toBeHidden();

    const filePath = join(directory, 'advanced.sqlite');

    expect(
      await query(request, {
        type: 'sqlite3',
        filePath,
        query: 'PRAGMA page_size',
      })
    ).toEqual([{ page_size: 8192 }]);
    expect(
      await query(request, {
        type: 'sqlite3',
        filePath,
        query: 'PRAGMA journal_mode',
      })
    ).toEqual([{ journal_mode: 'wal' }]);
  });

  test('refuses to overwrite an existing file', async ({ page }) => {
    await openCreateFileDialog(page, 'db-type-card-duckdb');
    await confirmCreateFile(page, 'analytics');
    await expect(page.getByTestId('create-database-file-dialog')).toBeHidden();

    await page.getByTestId('connection-create-file-button').click();
    await confirmCreateFile(page, 'analytics');

    await expect(page.getByTestId('create-database-file-error')).toContainText(
      'already exists'
    );
  });
});

test.describe('Refused saves', () => {
  test('answer with an error instead of reporting success', async ({
    request,
  }) => {
    await skipWithoutDesktopServer(request);

    const directory = mkdtempSync(join(tmpdir(), 'orcaq-refused-save-e2e-'));

    try {
      const created = await request.post(
        '/api/managment-connection/create-database-file',
        { data: { type: 'sqlite3', directory, fileName: 'refused' } }
      );
      const { filePath } = await created.json();

      const response = await request.post('/api/tables/bulk-update', {
        data: {
          type: 'sqlite3',
          filePath,
          schemaName: 'main',
          tableName: 'missing_table',
          pKeys: ['id'],
          updates: [{ pKeyValue: { id: 1 }, update: { name: 'x' } }],
        },
      });

      expect(response.status()).toBe(422);
      expect((await response.json()).message).toContain('missing_table');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
