import { expect, test, type Locator, type Page } from '@playwright/test';
import { format } from 'sql-formatter';
import type {
  OracleLiveConnection,
  SqlFixtureConfig,
} from '../../support/db-fixtures';
import { ConnectionModalPage } from '../pages/ConnectionModalPage';
import { WorkspacesPage } from '../pages/WorkspacesPage';

export type SqlSidebarActivity =
  | 'Explorer'
  | 'Schemas'
  | 'ERD'
  | 'DatabaseTools';

export type FixtureSqlWorkspaceFlowOptions = {
  title: string;
  dbTypeLabel: string;
  fixture: SqlFixtureConfig;
  rawQuery: string;
  rawQueryAssertions: string[];
  tableName: string;
  viewName: string;
  functionName: string;
  quickQueryTableName?: string;
  quickQueryRelationTableName?: string;
  nullOrderTableName?: string;
  nullOrderColumnName?: string;
};

export type ActiveSchemaCatalog = {
  schemaName?: string;
  tableName?: string;
  viewName?: string;
  functionName?: string;
};

type CreateSqlConnectionOptions = {
  dbTypeLabel: string;
  connectionName: string;
  fixture: SqlFixtureConfig;
  workspaceName: string;
  envTag?: {
    name: string;
    strictMode?: boolean;
    selectExistingTagNames?: string[];
  };
};

type CreateOracleConnectionOptions = {
  connectionName: string;
  workspaceName: string;
  oracleConnection: OracleLiveConnection;
};

const SQL_FAMILY_SHELL_TEXT = 'No table is open';
const SQL_SIDEBAR_BUTTON_INDEX: Record<SqlSidebarActivity, number> = {
  Explorer: 0,
  Schemas: 1,
  ERD: 2,
  DatabaseTools: 4,
};
const RAW_QUERY_FORMATTER_CONFIG = {
  language: 'postgresql' as const,
  keywordCase: 'upper' as const,
  linesBetweenQueries: 1,
  functionCase: 'upper' as const,
  newlineBeforeSemicolon: true,
  paramTypes: { named: [':'] },
};
const EXPLORER_ACTION_BUTTON_INDEX = {
  newFile: 0,
  newFolder: 1,
} as const;
const DEFAULT_QUICK_QUERY_TABLE_NAME = 'actor';
const DEFAULT_QUICK_QUERY_RELATION_TABLE_NAME = 'film_actor';
const DEFAULT_NULL_ORDER_TABLE_NAME = 'address';
const DEFAULT_NULL_ORDER_COLUMN_NAME = 'address2';

export async function setPersistedSqlActivityBar(
  page: Page,
  activityActive: SqlSidebarActivity
) {
  await page.evaluate(nextActivity => {
    localStorage.setItem(
      'activity-bar',
      JSON.stringify({ activityActive: nextActivity })
    );
  }, activityActive);

  await page.reload({ waitUntil: 'domcontentloaded' });
}

function activityBarButtons(page: Page) {
  return page
    .getByRole('button', { name: 'New SQL file' })
    .locator('xpath=ancestor::div[6]/preceding-sibling::div[1]')
    .locator('button');
}

function sidebarReadyIndicator(page: Page, activity: SqlSidebarActivity) {
  switch (activity) {
    case 'Explorer':
      return page.getByText('Explorer', { exact: true }).first();
    case 'Schemas':
      return page.getByPlaceholder('Search in all tables or functions');
    case 'ERD':
      return page.getByText('ERD Diagram', { exact: true }).first();
    case 'DatabaseTools':
      return page.getByText('Backup & Restore', { exact: true }).first();
    default:
      return page.getByText(SQL_FAMILY_SHELL_TEXT, { exact: true });
  }
}

export async function switchSqlSidebar(
  page: Page,
  activity: SqlSidebarActivity
) {
  const button = activityBarButtons(page).nth(
    SQL_SIDEBAR_BUTTON_INDEX[activity]
  );
  const indicator = sidebarReadyIndicator(page, activity);

  if (await indicator.isVisible().catch(() => false)) {
    return;
  }

  await expect(button).toBeVisible({ timeout: 30_000 });
  await button.click();

  const becameVisible = await indicator
    .waitFor({ state: 'visible', timeout: 2_500 })
    .then(() => true)
    .catch(() => false);

  if (becameVisible) {
    return;
  }

  await button.click();
  await expect(indicator).toBeVisible({ timeout: 30_000 });
}

export async function createSqlWorkspaceAndConnection(
  page: Page,
  options: CreateSqlConnectionOptions
) {
  const workspacesPage = new WorkspacesPage(page);
  const connectionModal = new ConnectionModalPage(page);

  await workspacesPage.goto();
  await setPersistedSqlActivityBar(page, 'Explorer');
  await workspacesPage.createWorkspace(options.workspaceName);
  await workspacesPage.openWorkspace(options.workspaceName);

  await connectionModal.completeStep1(options.dbTypeLabel);
  await connectionModal.fillConnectionName(options.connectionName);
  await connectionModal.selectConnectionStringTab();
  await connectionModal.fillConnectionString(options.fixture.url);

  if (options.envTag) {
    await connectionModal.assignNewEnvironmentTag(options.envTag);

    for (const tagName of options.envTag.selectExistingTagNames ?? []) {
      await connectionModal.selectEnvironmentTag(tagName);
    }
  }

  await connectionModal.clickCreate();
  await connectionModal.expectConnectionRow(options.connectionName);
}

export async function createOracleWorkspaceAndConnection(
  page: Page,
  options: CreateOracleConnectionOptions
) {
  const workspacesPage = new WorkspacesPage(page);
  const connectionModal = new ConnectionModalPage(page);

  await workspacesPage.goto();
  await setPersistedSqlActivityBar(page, 'Explorer');
  await workspacesPage.createWorkspace(options.workspaceName);
  await workspacesPage.openWorkspace(options.workspaceName);

  await connectionModal.completeStep1('Oracle');
  await connectionModal.fillConnectionName(options.connectionName);
  await connectionModal.selectConnectionFormTab();
  await connectionModal.fillFormCredentials({
    host: options.oracleConnection.host!,
    port: `${options.oracleConnection.port ?? 1521}`,
    username: options.oracleConnection.username!,
    password: options.oracleConnection.password!,
    database: options.oracleConnection.serviceName!,
  });
  await connectionModal.clickCreate();
  await connectionModal.expectConnectionRow(options.connectionName);
}

export async function connectSqlWorkspace(page: Page, connectionName: string) {
  const connectionModal = new ConnectionModalPage(page);

  await Promise.all([
    page.waitForURL(/\/[^/]+\/[^/]+(?:\/.*)?$/, { timeout: 15_000 }),
    connectionModal.connectConnection(connectionName),
  ]);

  await connectionModal.expectSqlFamilyLanding();
}

export async function openConnectedFixtureSqlWorkspace(
  page: Page,
  options: {
    dbTypeLabel: string;
    fixture: SqlFixtureConfig;
    workspaceName: string;
    connectionName: string;
  }
) {
  await createSqlWorkspaceAndConnection(page, options);
  await connectSqlWorkspace(page, options.connectionName);
}

export async function openConnectedOracleSqlWorkspace(
  page: Page,
  options: CreateOracleConnectionOptions
) {
  await createOracleWorkspaceAndConnection(page, options);
  await connectSqlWorkspace(page, options.connectionName);
}

function treeEditInput(page: Page) {
  return page.locator('.tree-row__edit-input').first();
}

async function waitForTreeEditInput(page: Page) {
  const input = treeEditInput(page);

  await expect(input).toBeVisible({ timeout: 30_000 });

  return input;
}

function rawQueryEditor(page: Page) {
  return page.locator('.cm-editor').first();
}

function rawQueryEditorContent(page: Page) {
  return rawQueryEditor(page).locator('.cm-content');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function explorerHeaderActionButtons(page: Page) {
  return page
    .getByText('Explorer', { exact: true })
    .locator('xpath=following-sibling::div[1]')
    .locator('button');
}

function resultTab(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-t-md")][1]');
}

function formatSqlForExpectation(query: string) {
  return format(query, RAW_QUERY_FORMATTER_CONFIG);
}

function normalizeFormattedSqlSnapshot(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .join('\n')
    .trim();
}

async function replaceEditorContent(
  page: Page,
  content: string,
  editorContent: Locator = rawQueryEditorContent(page)
) {
  await expect(editorContent).toBeVisible({ timeout: 30_000 });
  await editorContent.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(content);
}

async function insertEditorContentVerbatim(
  page: Page,
  content: string,
  editorContent: Locator
) {
  await expect(editorContent).toBeVisible({ timeout: 30_000 });
  await editorContent.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(content);
}

async function readEditorContent(editor: Locator = rawQueryEditor(page)) {
  const lines = await editor.locator('.cm-line').allInnerTexts();

  return lines
    .join('\n')
    .replace(/\u00a0/g, ' ')
    .trimEnd();
}

function treeName(page: Page, name: string | RegExp) {
  const matcher =
    typeof name === 'string' ? new RegExp(`^${escapeRegExp(name)}$`) : name;

  return page.locator('.tree-row__name').filter({ hasText: matcher }).first();
}

function settingsDialog(page: Page) {
  return page.getByRole('dialog').first();
}

function quickQueryGrid(page: Page) {
  return page.locator('.ag-root-wrapper').first();
}

function quickQueryHeader(page: Page, columnName: string) {
  return quickQueryGrid(page)
    .locator('.ag-header-cell-label')
    .filter({ hasText: columnName })
    .first();
}

function quickQueryRowByText(page: Page, rowText: string) {
  return quickQueryGrid(page)
    .locator('.ag-row')
    .filter({ hasText: rowText })
    .first();
}

function quickQueryCell(
  page: Page,
  options: {
    columnName: string;
    rowIndex?: number;
    rowText?: string;
  }
) {
  if (options.rowText) {
    return quickQueryRowByText(page, options.rowText)
      .locator(`.ag-cell[col-id="${options.columnName}"]`)
      .first();
  }

  if (options.rowIndex !== undefined) {
    return quickQueryGrid(page)
      .locator(
        `.ag-row[row-index="${options.rowIndex}"] .ag-cell[col-id="${options.columnName}"]`
      )
      .first();
  }

  return quickQueryGrid(page)
    .locator(`.ag-cell[col-id="${options.columnName}"]`)
    .first();
}

function treeRow(page: Page, name: string | RegExp) {
  return treeName(page, name).locator(
    'xpath=ancestor::div[contains(@class,"tree-row")][1]'
  );
}

function schemaSearchInput(page: Page) {
  return page.getByPlaceholder('Search in all tables or functions');
}

function getSchemaSearchTerm(name: string | RegExp) {
  return typeof name === 'string' ? name : name.source;
}

async function expandFolderForItem(
  page: Page,
  folderName: string,
  itemName: string | RegExp
) {
  const item = treeName(page, itemName);

  if (await item.isVisible().catch(() => false)) {
    return;
  }

  await schemaSearchInput(page).fill(getSchemaSearchTerm(itemName));

  if (await item.isVisible().catch(() => false)) {
    return;
  }

  await treeRow(page, folderName).locator('.tree-row__chevron').click();
  await expect(item).toBeVisible({ timeout: 30_000 });
}

export async function openExplorerRawQueryFile(page: Page, fileName: string) {
  await switchSqlSidebar(page, 'Explorer');

  await expect(page.getByText('Explorer', { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  const newFileButton = explorerHeaderActionButtons(page).nth(
    EXPLORER_ACTION_BUTTON_INDEX.newFile
  );

  await expect(newFileButton).toBeVisible({ timeout: 30_000 });
  await newFileButton.click();
  const input = await waitForTreeEditInput(page);
  await input.fill(fileName);
  await input.press('Enter');

  await expect(treeName(page, fileName)).toBeVisible({
    timeout: 30_000,
  });

  await treeName(page, fileName).click();
  await expect(page).toHaveURL(/\/explorer\/[^/]+$/, { timeout: 30_000 });
}

export async function createExplorerFolder(page: Page, folderName: string) {
  await switchSqlSidebar(page, 'Explorer');

  await expect(page.getByText('Explorer', { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  const newFolderButton = explorerHeaderActionButtons(page).nth(
    EXPLORER_ACTION_BUTTON_INDEX.newFolder
  );

  await expect(newFolderButton).toBeVisible({ timeout: 30_000 });
  await newFolderButton.click();
  const input = await waitForTreeEditInput(page);
  await input.fill(folderName);
  await input.press('Enter');

  await expect(treeName(page, folderName)).toBeVisible({
    timeout: 30_000,
  });
}

export async function openExplorerRawQueryFileInFolder(
  page: Page,
  folderName: string,
  fileName: string
) {
  await switchSqlSidebar(page, 'Explorer');

  await expect(treeName(page, folderName)).toBeVisible({
    timeout: 30_000,
  });
  await treeName(page, folderName).click();

  const newFileButton = explorerHeaderActionButtons(page).nth(
    EXPLORER_ACTION_BUTTON_INDEX.newFile
  );

  await expect(newFileButton).toBeVisible({ timeout: 30_000 });
  await newFileButton.click();
  const input = await waitForTreeEditInput(page);
  await input.fill(fileName);
  await input.press('Enter');

  if (
    !(await treeName(page, fileName)
      .isVisible()
      .catch(() => false))
  ) {
    const chevron = treeRow(page, folderName).locator('.tree-row__chevron');

    if (await chevron.isVisible().catch(() => false)) {
      await chevron.click();
    }
  }

  await expect(treeName(page, fileName)).toBeVisible({
    timeout: 30_000,
  });

  await treeName(page, fileName).click();
  await expect(page).toHaveURL(/\/explorer\/[^/]+$/, { timeout: 30_000 });
}

export async function setRawQueryEditorContent(page: Page, query: string) {
  await replaceEditorContent(page, query);
}

export async function getRawQueryEditorContent(page: Page) {
  return readEditorContent(rawQueryEditor(page));
}

export async function expectRawQueryAutocomplete(
  page: Page,
  options: {
    partialQuery: string;
    completionText: string;
  }
) {
  await setRawQueryEditorContent(page, options.partialQuery);
  await page.keyboard.press('ControlOrMeta+I');

  const completionList = page.getByRole('listbox', { name: 'Completions' });
  const completionItem = completionList.locator('[role="option"]').first();

  await expect(completionList).toBeVisible({ timeout: 30_000 });
  await expect(completionItem).toBeVisible({ timeout: 30_000 });
  await expect(completionItem).toContainText(options.completionText);
  await completionItem.click();
  await expect(rawQueryEditor(page)).toContainText(options.completionText);
}

export async function setRawQueryVariables(page: Page, fileVariables: string) {
  const addVariablesButton = page
    .getByRole('button', { name: /add variables/i })
    .first();

  if (!(await addVariablesButton.isVisible().catch(() => false))) {
    await expect(page.getByText('Variables', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await insertEditorContentVerbatim(
      page,
      fileVariables,
      page.locator('.cm-editor').nth(1).locator('.cm-content')
    );

    return;
  }

  await addVariablesButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Add Variable', { exact: false })).toBeVisible({
    timeout: 30_000,
  });

  await insertEditorContentVerbatim(
    page,
    fileVariables,
    dialog.locator('.cm-content').first()
  );
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(dialog).not.toBeVisible({ timeout: 30_000 });
}

export async function expectRawQueryFormatByButton(page: Page, query: string) {
  await setRawQueryEditorContent(page, query);
  await page
    .getByRole('button', { name: /^Format/i })
    .first()
    .click();

  await expect
    .poll(
      async () =>
        normalizeFormattedSqlSnapshot(await getRawQueryEditorContent(page)),
      {
        timeout: 30_000,
      }
    )
    .toBe(normalizeFormattedSqlSnapshot(formatSqlForExpectation(query)));
}

export async function expectRawQueryFormatByShortcut(
  page: Page,
  query: string
) {
  await setRawQueryEditorContent(page, query);
  await rawQueryEditorContent(page).click();
  await page.keyboard.press('Shift+Alt+F');

  await expect
    .poll(
      async () =>
        normalizeFormattedSqlSnapshot(await getRawQueryEditorContent(page)),
      {
        timeout: 30_000,
      }
    )
    .toBe(normalizeFormattedSqlSnapshot(formatSqlForExpectation(query)));
}

export async function expectRawQueryResultTabs(page: Page, queries: string[]) {
  for (const query of queries) {
    await executeRawQuery(page, query, []);
  }

  for (const [index, query] of queries.entries()) {
    await expect(
      page.getByText(`Query ${index + 1} - ${query}`, { exact: true })
    ).toBeVisible({ timeout: 30_000 });
  }

  if (queries.length < 2) {
    return;
  }

  const preservedQueryIndex = Math.min(1, queries.length - 1);
  const preservedQueryLabel = `Query ${preservedQueryIndex + 1} - ${queries[preservedQueryIndex]}`;
  const closeOthersMenuItem = page.getByRole('menuitem', {
    name: 'Close Others',
  });

  await resultTab(page, preservedQueryLabel).click({ button: 'right' });
  await expect(closeOthersMenuItem).toBeVisible({ timeout: 30_000 });
  await expect(closeOthersMenuItem).toBeEnabled();
  await closeOthersMenuItem.click();

  await expect(
    page.getByText(preservedQueryLabel, { exact: true })
  ).toBeVisible({
    timeout: 30_000,
  });

  for (const [index, query] of queries.entries()) {
    if (index === preservedQueryIndex) {
      continue;
    }

    await expect(
      page.getByText(`Query ${index + 1} - ${query}`, { exact: true })
    ).toHaveCount(0);
  }
}

export async function executeRawQuery(
  page: Page,
  query: string,
  assertions: string[]
) {
  await setRawQueryEditorContent(page, query);
  await page.getByRole('button', { name: 'Execute current' }).click();

  await expect(page.getByText(/Query success:\s*1 rows/i)).toBeVisible({
    timeout: 30_000,
  });

  for (const assertion of assertions) {
    await expect(page.getByText(assertion, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }
}

export async function openSchemasSidebar(page: Page) {
  await switchSqlSidebar(page, 'Schemas');

  await expect(schemaSearchInput(page)).toBeVisible({ timeout: 30_000 });
  await schemaSearchInput(page).fill('');
  await expect(page.locator('.tree-row__name').first()).toBeVisible();
}

export async function openSchemaItem(
  page: Page,
  options: {
    folderName: 'Tables' | 'Views' | 'Functions';
    itemName: string | RegExp;
  }
) {
  await expandFolderForItem(page, options.folderName, options.itemName);
  await treeName(page, options.itemName).click();
  await expect(page).toHaveURL(/\/quick-query\/[^/]+$/, { timeout: 30_000 });
}

export async function openQuickQueryTable(page: Page, tableName: string) {
  await openSchemasSidebar(page);
  await openSchemaItem(page, {
    folderName: 'Tables',
    itemName: tableName,
  });
  await expect(quickQueryGrid(page)).toBeVisible({ timeout: 30_000 });
}

export async function getOpenQuickQueryTableTabs(
  page: Page
): Promise<string[]> {
  await page.waitForFunction(() => {
    const pinia = globalThis.useNuxtApp?.()?.$pinia;
    return Array.isArray(pinia?.state?.value?.['tab-views']?.tabViews);
  });

  return page.evaluate(() => {
    const pinia = globalThis.useNuxtApp?.()?.$pinia;
    const tabs = pinia?.state?.value?.['tab-views']?.tabViews || [];

    return tabs
      .filter((tab: any) => tab?.type === 'tableDetail')
      .map((tab: any) => tab?.metadata?.tableName || tab?.name)
      .filter(Boolean);
  });
}

export async function getActiveSchemaTables(page: Page): Promise<string[]> {
  await page.waitForFunction(() => {
    const pinia = globalThis.useNuxtApp?.()?.$pinia;
    const schemaState = pinia?.state?.value?.['schema-store'];

    return Object.values(schemaState?.schemas || {}).some(
      schemaEntries => Array.isArray(schemaEntries) && schemaEntries.length > 0
    );
  });

  return page.evaluate(() => {
    const pinia = globalThis.useNuxtApp?.()?.$pinia;
    const schemaState = pinia?.state?.value?.['schema-store'];
    const schemaEntries = Object.values(schemaState?.schemas || {}).find(
      value => Array.isArray(value) && value.length > 0
    ) as Array<any> | undefined;
    const schema = schemaEntries?.[0];

    return (schema?.tables || []) as string[];
  });
}

export async function applyQuickQueryContainsFilter(
  page: Page,
  searchValue: string
) {
  await expect(quickQueryGrid(page)).toBeVisible({ timeout: 30_000 });
  await quickQueryGrid(page).click();
  await page.keyboard.press('Meta+F');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName), {
      timeout: 30_000,
    })
    .toBe('INPUT');
  await page.keyboard.insertText(searchValue);
  await page.keyboard.press('Enter');
}

export async function getLastVisibleQuickQueryRowIndex(page: Page) {
  const rowIndices = await quickQueryGrid(page)
    .locator('.ag-center-cols-container .ag-row[row-index]')
    .evaluateAll(rows =>
      rows
        .map(row => Number.parseInt(row.getAttribute('row-index') || '-1', 10))
        .filter(index => Number.isInteger(index) && index >= 0)
    );

  if (!rowIndices.length) {
    return undefined;
  }

  return Math.max(...rowIndices);
}

export async function editQuickQueryCell(
  page: Page,
  options: {
    columnName: string;
    value: string;
    rowIndex?: number;
    rowText?: string;
  }
) {
  const cell = quickQueryCell(page, options);

  await expect(cell).toBeVisible({ timeout: 30_000 });
  await cell.dblclick();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(options.value);
  await page.keyboard.press('Enter');
  await expect(cell).toContainText(options.value);
}

export async function expectQuickQueryRowContains(page: Page, rowText: string) {
  await expect(quickQueryRowByText(page, rowText)).toBeVisible({
    timeout: 30_000,
  });
}

export async function expectQuickQueryErdTab(
  page: Page,
  options: {
    tableName: string;
    relatedTableName: string;
  }
) {
  await page.getByRole('tab', { name: 'ERD' }).click();

  await expect(
    page
      .locator('.vue-flow__node-value')
      .filter({ hasText: options.tableName })
      .first()
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page
      .locator('.vue-flow__node-value')
      .filter({ hasText: options.relatedTableName })
      .first()
  ).toBeVisible({ timeout: 30_000 });
}

export async function expectManagementErdTableList(
  page: Page,
  expectedTableNames: string[]
) {
  await switchSqlSidebar(page, 'ERD');

  const rootChevron = treeRow(page, 'All Tables').locator('.tree-row__chevron');
  const currentLabels = await page.locator('.tree-row__name').allInnerTexts();

  if (
    currentLabels.filter(label => label.trim() && label.trim() !== 'All Tables')
      .length === 0
  ) {
    if (await rootChevron.isVisible().catch(() => false)) {
      await rootChevron.click();
    }
  }

  await expect
    .poll(
      async () => {
        const labels = await page.locator('.tree-row__name').allInnerTexts();

        return labels
          .map(label => label.trim())
          .filter(label => label && label !== 'All Tables');
      },
      { timeout: 30_000 }
    )
    .toHaveLength(expectedTableNames.length);

  for (const tableName of expectedTableNames.slice(
    0,
    Math.min(5, expectedTableNames.length)
  )) {
    await expect(treeName(page, tableName)).toBeVisible({ timeout: 30_000 });
  }
}

export async function openSettingsSection(page: Page, sectionName: string) {
  const dialog = settingsDialog(page);

  if (!(await dialog.isVisible().catch(() => false))) {
    await page.keyboard.press('Meta+,');
  }

  await expect(dialog).toBeVisible({ timeout: 30_000 });

  const sectionLink = dialog
    .locator('a')
    .filter({ hasText: sectionName })
    .first();
  await expect(sectionLink).toBeVisible({ timeout: 30_000 });
  await sectionLink.click();

  return dialog;
}

export async function closeSettingsSection(page: Page) {
  const dialog = settingsDialog(page);

  if (!(await dialog.isVisible().catch(() => false))) {
    return;
  }

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible({ timeout: 30_000 });
}

export async function setQuickQuerySafeMode(page: Page, enabled: boolean) {
  const dialog = await openSettingsSection(page, 'Quick Query');
  const toggle = dialog.locator('#safe-mode-toggle');

  await expect(toggle).toBeVisible({ timeout: 30_000 });

  const isEnabled = () =>
    toggle.evaluate(element => {
      const ariaChecked = element.getAttribute('aria-checked');
      const dataState = element.getAttribute('data-state');

      return ariaChecked === 'true' || dataState === 'checked';
    });

  if ((await isEnabled()) !== enabled) {
    await toggle.click();
  }

  await expect.poll(isEnabled, { timeout: 30_000 }).toBe(enabled);
  await closeSettingsSection(page);
}

export async function setQuickQueryNullOrder(
  page: Page,
  label: 'Unset' | 'Nulls First' | 'Nulls Last'
) {
  const dialog = await openSettingsSection(page, 'Quick Query');
  const combobox = dialog.getByRole('combobox').first();

  await expect(combobox).toBeVisible({ timeout: 30_000 });
  await combobox.click();
  await page.getByText(label, { exact: true }).last().click();
  await expect(combobox).toContainText(label);
  await closeSettingsSection(page);
}

export async function sortQuickQueryColumn(
  page: Page,
  columnName: string,
  clicks = 1
) {
  const header = quickQueryHeader(page, columnName);

  await expect(header).toBeVisible({ timeout: 30_000 });

  for (let index = 0; index < clicks; index += 1) {
    await header.click();
  }
}

export async function getQuickQueryFirstCellText(
  page: Page,
  columnName: string
) {
  const firstCell = quickQueryGrid(page)
    .locator(
      `.ag-center-cols-container .ag-row[row-index] .ag-cell[col-id="${columnName}"]`
    )
    .first();

  await expect(firstCell).toBeVisible({ timeout: 30_000 });

  return (await firstCell.innerText()).trim();
}

export async function expectTableStructure(page: Page) {
  await page.getByRole('tab', { name: 'Structure' }).click();

  await expect(page.getByText('Meta Info', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Columns', { exact: true })).toBeVisible();
  await expect(page.getByText('Indexes', { exact: true })).toBeVisible();
  await expect(page.getByText('RLS', { exact: true })).toBeVisible();
  await expect(page.getByText('Rules', { exact: true })).toBeVisible();
  await expect(page.getByText('Triggers', { exact: true })).toBeVisible();
}

export async function expectViewStructure(page: Page) {
  await page.getByRole('tab', { name: 'Structure' }).click();

  await expect(page.getByText('Meta Info', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Columns', { exact: true })).toBeVisible();
  await expect(page.getByText('Definition', { exact: true })).toBeVisible();
  await expect(page.getByText('Dependencies', { exact: true })).toBeVisible();
}

export async function expectFunctionDetail(
  page: Page,
  functionName: string,
  options: {
    expectDefinitionBody?: boolean;
  } = {}
) {
  await expect(page.getByRole('button', { name: /save/i }).first()).toBeVisible(
    {
      timeout: 30_000,
    }
  );

  if (options.expectDefinitionBody !== false) {
    await expect(page.locator('.cm-content').first()).toContainText(
      functionName,
      {
        timeout: 30_000,
      }
    );
    return;
  }

  await expect(
    page.getByRole('button', { name: new RegExp(functionName, 'i') }).first()
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText(new RegExp(`func:\\s+.+\\.${functionName}\\(`, 'i'))
  ).toBeVisible({ timeout: 30_000 });
}

export async function refreshQuickQueryTable(page: Page) {
  const refreshButton = page
    .getByRole('button', { name: /refresh table/i })
    .first();

  await page
    .locator('div.absolute.inset-0.z-20.flex.items-center')
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
  await expect(refreshButton).toBeVisible({ timeout: 30_000 });
  await refreshButton.click();
  await page
    .locator('div.absolute.inset-0.z-20.flex.items-center')
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
  await expect(quickQueryGrid(page)).toBeVisible({ timeout: 30_000 });
  await expect(
    quickQueryGrid(page).locator('.ag-overlay-loading-center')
  ).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function openDatabaseToolsSidebar(page: Page) {
  await switchSqlSidebar(page, 'DatabaseTools');

  await expect(page.getByText('Database Tools', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

export async function expectInstanceInsightsFromSidebar(page: Page) {
  await openDatabaseToolsSidebar(page);

  const instanceInsightCard = page
    .getByRole('button', { name: /^Instance Insight/i })
    .first();

  await expect(instanceInsightCard).toBeVisible();
  await instanceInsightCard.click();

  await expect(page).toHaveURL(/\/instance-insights$/, { timeout: 30_000 });
  await expect(
    page.getByText('Instance Insights', { exact: true })
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Activity' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'State' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Config' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Replication' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh All' })).toBeVisible();
  await expect(page.getByText('Auto refresh', { exact: true })).toBeVisible();
}

export async function expectDatabaseToolsLaunchers(page: Page) {
  await openDatabaseToolsSidebar(page);

  const backupRestoreCard = page
    .getByRole('button', { name: /^Backup & Restore/i })
    .first();
  const instanceInsightCard = page
    .getByRole('button', { name: /^Instance Insight/i })
    .first();
  const schemaDiffCard = page
    .getByRole('button', { name: /^Schema Diff/i })
    .first();

  await expect(backupRestoreCard).toBeVisible();
  await expect(instanceInsightCard).toBeVisible();
  await expect(schemaDiffCard).toBeVisible();

  await backupRestoreCard.click();
  await expect(page).toHaveURL(/\/database-tools\/backup-restore\//, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Backup & Restore' })
  ).toBeVisible();
  await expect(page.getByText('Create Backup', { exact: true })).toBeVisible();
  await expect(page.getByText('Restore Backup', { exact: true })).toBeVisible();

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await openDatabaseToolsSidebar(page);

  await expect(schemaDiffCard).toBeVisible({ timeout: 30_000 });
  await schemaDiffCard.click();
  await expect(page).toHaveURL(/\/schema-diff(?:\/|$)/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Schema Diff' })
  ).toBeVisible();
  await expect(
    page.getByText('Select a target connection and run the diff', {
      exact: true,
    })
  ).toBeVisible();
}

export async function getFirstVisibleSchemaChild(
  page: Page,
  options: {
    folderName: 'Tables' | 'Views' | 'Functions';
    expandFolder?: boolean;
  }
) {
  if (options.expandFolder) {
    await treeRow(page, options.folderName)
      .locator('.tree-row__chevron')
      .click();
  }

  return page.locator('.tree-row').evaluateAll((rows, folderName) => {
    const mappedRows = rows.map(row => {
      const name =
        row.querySelector('.tree-row__name')?.textContent?.trim() || '';
      const paddingLeft = Number.parseFloat(
        window.getComputedStyle(row as HTMLElement).paddingLeft || '0'
      );

      return { name, paddingLeft };
    });

    const folderIndex = mappedRows.findIndex(row => row.name === folderName);
    if (folderIndex === -1) {
      return null;
    }

    const folderDepth = mappedRows[folderIndex].paddingLeft;

    for (let index = folderIndex + 1; index < mappedRows.length; index += 1) {
      const row = mappedRows[index];

      if (row.paddingLeft <= folderDepth) {
        break;
      }

      if (row.name) {
        return row.name;
      }
    }

    return null;
  }, options.folderName);
}

export async function getActiveSchemaCatalog(
  page: Page
): Promise<ActiveSchemaCatalog> {
  await page.waitForFunction(() => {
    const pinia = globalThis.useNuxtApp?.()?.$pinia;
    const schemaState = pinia?.state?.value?.['schema-store'];

    return Object.values(schemaState?.schemas || {}).some(
      schemaEntries => Array.isArray(schemaEntries) && schemaEntries.length > 0
    );
  });

  return page.evaluate(() => {
    const pinia = globalThis.useNuxtApp?.()?.$pinia;
    const schemaState = pinia?.state?.value?.['schema-store'];
    const schemaEntries = Object.values(schemaState?.schemas || {}).find(
      value => Array.isArray(value) && value.length > 0
    ) as Array<any> | undefined;
    const schema = schemaEntries?.[0];

    return {
      schemaName: schema?.name,
      tableName: schema?.tables?.[0],
      viewName: schema?.views?.[0]?.name,
      functionName: schema?.functions?.find((entry: any) => entry?.name)?.name,
    } satisfies ActiveSchemaCatalog;
  });
}

export function defineFixtureSqlWorkspaceFlowTests(
  options: FixtureSqlWorkspaceFlowOptions
) {
  const quickQueryTableName =
    options.quickQueryTableName ?? DEFAULT_QUICK_QUERY_TABLE_NAME;
  const quickQueryRelationTableName =
    options.quickQueryRelationTableName ??
    DEFAULT_QUICK_QUERY_RELATION_TABLE_NAME;
  const nullOrderTableName =
    options.nullOrderTableName ?? DEFAULT_NULL_ORDER_TABLE_NAME;
  const nullOrderColumnName =
    options.nullOrderColumnName ?? DEFAULT_NULL_ORDER_COLUMN_NAME;

  test.describe(`${options.title} workspace flows`, () => {
    test.beforeEach(async ({ page }, testInfo) => {
      const nonce = `${Date.now()}-${testInfo.retry}`;

      await openConnectedFixtureSqlWorkspace(page, {
        dbTypeLabel: options.dbTypeLabel,
        fixture: options.fixture,
        workspaceName: `${options.title} Workspace ${nonce}`,
        connectionName: `${options.title} Fixture ${nonce}`,
      });
    });

    test('executes a seeded raw query from Explorer', async ({ page }) => {
      await openExplorerRawQueryFile(
        page,
        `${options.fixture.engine}-raw-${Date.now()}`
      );
      await executeRawQuery(page, options.rawQuery, options.rawQueryAssertions);
    });

    test('creates files and folders from Explorer for SQL workspaces', async ({
      page,
    }) => {
      const nonce = `${options.fixture.engine}-${Date.now()}`;
      const folderName = `${nonce}-queries`;
      const rootFileName = `${nonce}-root`;
      const nestedFileOne = `${nonce}-report-a`;
      const nestedFileTwo = `${nonce}-report-b`;

      await createExplorerFolder(page, folderName);
      await openExplorerRawQueryFile(page, rootFileName);
      await openExplorerRawQueryFileInFolder(page, folderName, nestedFileOne);
      await openExplorerRawQueryFileInFolder(page, folderName, nestedFileTwo);

      await expect(treeName(page, folderName)).toBeVisible();
      await expect(treeName(page, rootFileName)).toBeVisible();
      await expect(treeName(page, nestedFileOne)).toBeVisible();
      await expect(treeName(page, nestedFileTwo)).toBeVisible();
    });

    test('supports raw query suggestions and variables', async ({ page }) => {
      const fileName = `${options.fixture.engine}-advanced-${Date.now()}`;
      const suggestionPrefix = options.tableName.slice(0, 2);

      await openExplorerRawQueryFile(page, fileName);
      await expectRawQueryAutocomplete(page, {
        partialQuery: `select * from ${suggestionPrefix}`,
        completionText: options.tableName,
      });

      await setRawQueryVariables(page, JSON.stringify({ filmId: 1 }, null, 2));
      await executeRawQuery(
        page,
        `select title from ${options.tableName} where film_id = :filmId order by film_id limit 1;`,
        [options.rawQueryAssertions[0]]
      );
    });

    test('formats raw queries and manages result tabs', async ({ page }) => {
      const fileName = `${options.fixture.engine}-format-${Date.now()}`;

      await openExplorerRawQueryFile(page, fileName);
      await expectRawQueryFormatByButton(
        page,
        `select title from ${options.tableName} where film_id = 1;`
      );
      await expectRawQueryFormatByShortcut(
        page,
        'select 1 as one;select 2 as two;'
      );
      await expectRawQueryResultTabs(page, [
        options.rawQuery,
        `select count(*) as total from ${options.tableName};`,
        'select 1 as probe;',
      ]);
    });

    test('opens table, view, and function detail flows from Schemas', async ({
      page,
    }) => {
      await openSchemasSidebar(page);

      await openSchemaItem(page, {
        folderName: 'Tables',
        itemName: options.tableName,
      });
      await expectTableStructure(page);

      await openSchemasSidebar(page);
      await openSchemaItem(page, {
        folderName: 'Views',
        itemName: options.viewName,
      });
      await expectViewStructure(page);

      await openSchemasSidebar(page);
      await openSchemaItem(page, {
        folderName: 'Functions',
        itemName: new RegExp(options.functionName, 'i'),
      });
      await expectFunctionDetail(page, options.functionName, {
        expectDefinitionBody: options.fixture.engine === 'postgres',
      });
    });

    test('opens multiple quick query tables, filters data, and inspects ERD views', async ({
      page,
    }) => {
      const schemaTables = await getActiveSchemaTables(page);
      const tablesToOpen = schemaTables.slice(0, 5);

      for (const tableName of tablesToOpen) {
        await openQuickQueryTable(page, tableName);
      }

      await expect
        .poll(
          async () => {
            const openTables = await getOpenQuickQueryTableTabs(page);

            return tablesToOpen.filter(tableName =>
              openTables.includes(tableName)
            ).length;
          },
          { timeout: 30_000 }
        )
        .toBe(tablesToOpen.length);

      await openQuickQueryTable(page, quickQueryTableName);
      await applyQuickQueryContainsFilter(page, 'PENELOPE');
      await expectQuickQueryRowContains(page, 'PENELOPE');
      await expectQuickQueryRowContains(page, 'GUINESS');

      await expectTableStructure(page);
      await expectQuickQueryErdTab(page, {
        tableName: quickQueryTableName,
        relatedTableName: quickQueryRelationTableName,
      });
      await expectManagementErdTableList(page, schemaTables);
    });

    test('supports safe mode CRUD flows in quick query', async ({ page }) => {
      const uniqueSuffix = `${Date.now()}`.slice(-8);
      const insertFirstName = 'AUTO';
      const updatedFirstName = 'PATCHED';
      const uniqueLastName = `E2E${uniqueSuffix}`;

      await openQuickQueryTable(page, quickQueryTableName);
      await setQuickQuerySafeMode(page, true);
      await page.getByRole('button', { name: 'Row', exact: true }).click();

      await expect
        .poll(() => getLastVisibleQuickQueryRowIndex(page), {
          timeout: 30_000,
        })
        .not.toBeUndefined();

      const newRowIndex = await getLastVisibleQuickQueryRowIndex(page);

      if (newRowIndex === undefined) {
        throw new Error('Expected a new quick query row to be visible.');
      }

      await editQuickQueryCell(page, {
        rowIndex: newRowIndex,
        columnName: 'first_name',
        value: insertFirstName,
      });
      await editQuickQueryCell(page, {
        rowIndex: newRowIndex,
        columnName: 'last_name',
        value: uniqueLastName,
      });

      await quickQueryGrid(page).click();
      await page.keyboard.press('Meta+S');
      await expect(
        page.getByText('Confirm Save Operation', { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        page.getByText('Data saved successfully!', { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await refreshQuickQueryTable(page);

      await applyQuickQueryContainsFilter(page, uniqueLastName);
      await expectQuickQueryRowContains(page, uniqueLastName);

      await editQuickQueryCell(page, {
        rowText: uniqueLastName,
        columnName: 'first_name',
        value: updatedFirstName,
      });

      await quickQueryGrid(page).click();
      await page.keyboard.press('Meta+S');
      await expect(
        page.getByText('Confirm Save Operation', { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(
        page.getByText('Data saved successfully!', { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await refreshQuickQueryTable(page);
      await expect(quickQueryRowByText(page, uniqueLastName)).toContainText(
        updatedFirstName
      );

      await quickQueryCell(page, {
        rowText: uniqueLastName,
        columnName: 'first_name',
      }).click();
      await page.getByRole('button', { name: '⌥⌘⌫' }).first().click();
      await expect(
        page.getByText('Confirm Delete Operation', { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(
        page.getByText('Rows deleted successfully!', { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await refreshQuickQueryTable(page);
      await expect(quickQueryRowByText(page, uniqueLastName)).toHaveCount(0);
    });

    test('configures quick query null ordering preferences', async ({
      page,
    }) => {
      await openQuickQueryTable(page, nullOrderTableName);

      await setQuickQueryNullOrder(page, 'Nulls First');
      await sortQuickQueryColumn(page, nullOrderColumnName);

      if (options.fixture.engine === 'postgres') {
        await expect
          .poll(() => getQuickQueryFirstCellText(page, nullOrderColumnName), {
            timeout: 30_000,
          })
          .toBe('NULL');
      }

      await setQuickQueryNullOrder(page, 'Unset');
      await sortQuickQueryColumn(page, nullOrderColumnName, 3);

      await setQuickQueryNullOrder(page, 'Nulls Last');
      await sortQuickQueryColumn(page, nullOrderColumnName, 3);

      if (options.fixture.engine === 'postgres') {
        await expect
          .poll(() => getQuickQueryFirstCellText(page, nullOrderColumnName), {
            timeout: 30_000,
          })
          .not.toBe('NULL');
      }
    });

    test('loads SQL instance insights from Database Tools', async ({
      page,
    }) => {
      await expectInstanceInsightsFromSidebar(page);
    });

    test('opens Database Tools launchers for the SQL family', async ({
      page,
    }) => {
      await expectDatabaseToolsLaunchers(page);
    });
  });

  test.describe(`${options.title} strict environment tag flows`, () => {
    test('creates env tags and requires strict confirmation before connect', async ({
      page,
    }, testInfo) => {
      const nonce = `${Date.now()}-${testInfo.retry}`;
      const strictTagName = `prd${`${Date.now()}`.slice(-6)}`;
      const workspaceName = `${options.title} Strict Workspace ${nonce}`;
      const connectionName = `${options.title} Strict Fixture ${nonce}`;
      const connectionModal = new ConnectionModalPage(page);

      await createSqlWorkspaceAndConnection(page, {
        dbTypeLabel: options.dbTypeLabel,
        fixture: options.fixture,
        workspaceName,
        connectionName,
        envTag: {
          name: strictTagName,
          strictMode: false,
          selectExistingTagNames: ['prod'],
        },
      });

      await connectionModal.connectConnection(connectionName);
      await connectionModal.expectStrictWarning();

      await Promise.all([
        page.waitForURL(/\/[^/]+\/[^/]+(?:\/.*)?$/, { timeout: 15_000 }),
        connectionModal.confirmStrictConnection(),
      ]);

      await connectionModal.expectSqlFamilyLanding();
    });
  });
}
