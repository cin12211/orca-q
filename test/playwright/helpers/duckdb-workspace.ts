import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { WorkspacesPage } from '../pages/WorkspacesPage';
import { connectSqlWorkspace } from './sql-workspace';

const FIXTURE_DIR = resolve(
  process.cwd(),
  'test/fixtures/datasets/.tmp/duckdb'
);
const SHOP_FIXTURE = join(FIXTURE_DIR, 'shop.duckdb');
const STAGING_FIXTURE = join(FIXTURE_DIR, 'shop-staging.duckdb');

export const DUCKDB_E2E_COMMAND = 'bun test:e2e:duckdb';

export interface DuckDbFixtureCopy {
  shop: string;
  staging: string;
  dispose(): void;
}

/** Specs edit data, so each one works on its own copy of the sample files. */
export function copyDuckDbFixtures(): DuckDbFixtureCopy {
  if (!existsSync(SHOP_FIXTURE) || !existsSync(STAGING_FIXTURE)) {
    throw new Error(
      `DuckDB fixtures are missing; run ${DUCKDB_E2E_COMMAND} or bun test:fixtures:up --profile duckdb.`
    );
  }

  const directory = mkdtempSync(join(tmpdir(), 'orcaq-duckdb-e2e-'));
  const shop = join(directory, 'shop.duckdb');
  const staging = join(directory, 'shop-staging.duckdb');

  copyFileSync(SHOP_FIXTURE, shop);
  copyFileSync(STAGING_FIXTURE, staging);

  return {
    shop,
    staging,
    dispose: () => rmSync(directory, { recursive: true, force: true }),
  };
}

/** The server refuses DuckDB outside the desktop runtime, so plain `test:e2e` skips it. */
export async function skipWithoutDesktopServer(request: APIRequestContext) {
  const response = await request.post(
    '/api/managment-connection/health-check',
    {
      data: { type: 'duckdb', method: 'file', filePath: ':memory:' },
    }
  );
  const { isConnectedSuccess } = await response.json();

  test.skip(
    !isConnectedSuccess,
    `DuckDB needs a server with ORCAQ_DESKTOP_RUNTIME=1; run ${DUCKDB_E2E_COMMAND}.`
  );
}

/**
 * Stands in for the Electron preload bridge, keeping persisted records in
 * localStorage so connections survive the reloads a workspace session does.
 */
export async function installDesktopBridge(page: Page) {
  await page.addInitScript(() => {
    const STORE_KEY = 'orcaq-e2e-persist';
    type Row = Record<string, unknown>;
    type Filter = { field: string; value: unknown };

    const readStore = (): Record<string, Row[]> =>
      JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    const writeStore = (store: Record<string, Row[]>) =>
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    const matches = (row: Row, filters: Filter[], matchMode = 'all') => {
      const check = (filter: Filter) => row[filter.field] === filter.value;
      return matchMode === 'any' ? filters.some(check) : filters.every(check);
    };
    const noopSubscribe = () => () => undefined;

    window.electronAPI = {
      persist: {
        getAll: async (collection: string) => readStore()[collection] ?? [],
        getOne: async (collection: string, id: string) =>
          (readStore()[collection] ?? []).find(row => row.id === id) ?? null,
        find: async (
          collection: string,
          filters: Filter[],
          matchMode?: string
        ) =>
          (readStore()[collection] ?? []).filter(row =>
            matches(row, filters, matchMode)
          ),
        upsert: async (collection: string, id: string, value: Row) => {
          const store = readStore();
          const rows = (store[collection] ?? []).filter(row => row.id !== id);
          store[collection] = [...rows, { ...value, id }];
          writeStore(store);
          return value;
        },
        delete: async (
          collection: string,
          filters: Filter[],
          matchMode?: string
        ) => {
          const store = readStore();
          const rows = store[collection] ?? [];
          store[collection] = rows.filter(
            row => !matches(row, filters, matchMode)
          );
          writeStore(store);
          return rows.filter(row => matches(row, filters, matchMode));
        },
        replaceAll: async (collection: string, values: Row[]) => {
          const store = readStore();
          store[collection] = values;
          writeStore(store);
        },
        mergeAll: async (collection: string, values: Row[]) => {
          const store = readStore();
          const incomingIds = new Set(values.map(row => row.id));
          store[collection] = [
            ...(store[collection] ?? []).filter(
              row => !incomingIds.has(row.id)
            ),
            ...values,
          ];
          writeStore(store);
        },
        getAllPaginated: async (
          collection: string,
          page: number,
          pageSize: number
        ) => {
          const rows = readStore()[collection] ?? [];
          return {
            data: rows.slice((page - 1) * pageSize, page * pageSize),
            total: rows.length,
          };
        },
      },
      updater: {
        check: async () => null,
        download: async () => undefined,
        install: async () => undefined,
        onUpdateAvailable: noopSubscribe,
        onUpToDate: noopSubscribe,
        onProgress: noopSubscribe,
        onReady: noopSubscribe,
        onError: noopSubscribe,
      },
      window: {
        minimize: async () => undefined,
        maximize: async () => undefined,
        close: async () => undefined,
        pickSqliteFile: async () => null,
        pickDuckdbFile: async () => null,
        getStoragePath: async () => '/tmp',
        openStoragePath: async () => undefined,
        resetAllData: async () => undefined,
        onOpenSettings: noopSubscribe,
      },
    } as unknown as typeof window.electronAPI;
  });
}

export async function openWorkspace(page: Page, workspaceName: string) {
  const workspacesPage = new WorkspacesPage(page);

  await workspacesPage.goto();
  await workspacesPage.createWorkspace(workspaceName);
  await workspacesPage.openWorkspace(workspaceName);
}

export async function fillDuckDbForm(
  page: Page,
  options: { connectionName: string; filePath: string }
) {
  await page.getByTestId('connection-add-button').first().click();
  await page.getByTestId('db-type-card-duckdb').click();
  await page.getByTestId('connection-step-next').click();
  await page.getByTestId('connection-name-input').fill(options.connectionName);
  await page.getByTestId('connection-file-path-input').fill(options.filePath);
}

export async function addDuckDbConnection(
  page: Page,
  options: { connectionName: string; filePath: string }
) {
  await fillDuckDbForm(page, options);
  await page.getByTestId('connection-submit-button').click();
  await expect(page.getByTestId('connection-name-input')).toBeHidden({
    timeout: 30_000,
  });
}

/** Bridge, workspace and connection, ending on the connected SQL shell. */
export async function openDuckDbWorkspace(
  page: Page,
  options: { filePath: string; stagingFilePath?: string }
) {
  await installDesktopBridge(page);
  await openWorkspace(page, `DuckDB ${Date.now()}`);
  await addDuckDbConnection(page, {
    connectionName: 'shop',
    filePath: options.filePath,
  });

  if (options.stagingFilePath) {
    await addDuckDbConnection(page, {
      connectionName: 'shop-staging',
      filePath: options.stagingFilePath,
    });
  }

  await connectSqlWorkspace(page, 'shop');
}

export async function selectSchema(page: Page, schemaName: string) {
  await page.getByTestId('schema-selector').click();
  await page.getByTestId(`schema-option-${schemaName}`).click();
  await expect(page.getByTestId('schema-selector')).toContainText(schemaName);
}

export function queryResultSummary(page: Page) {
  return page.getByTestId('raw-query-result-summary');
}

export async function openDatabaseTools(page: Page) {
  await page.getByTestId('activity-item-DatabaseTools').click();
  await expect(page.getByTestId('database-tool-backup')).toBeVisible({
    timeout: 30_000,
  });
}
