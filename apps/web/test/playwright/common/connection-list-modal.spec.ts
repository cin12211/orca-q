import { expect, test } from '@playwright/test';
import { WorkspacesPage } from '../pages/WorkspacesPage';

const SEEDED_CONNECTIONS = 40;

test.describe('Management Connections modal', () => {
  test('matches the Select Database Type width and scrolls long lists', async ({
    page,
  }, testInfo) => {
    const workspaceName = `Long List Workspace ${Date.now()}-${testInfo.retry}`;
    const workspacesPage = new WorkspacesPage(page);

    await workspacesPage.goto();
    await workspacesPage.createWorkspace(workspaceName);
    await workspacesPage.openWorkspace(workspaceName);

    const modal = page.getByTestId('management-connection-modal');
    await expect(modal).toBeVisible();

    await page.evaluate(
      ({ count, name }) => {
        const state = globalThis.useNuxtApp?.()?.$pinia?.state?.value;
        const workspace = state.workspaces.workspaces.find(
          (entry: { name: string }) => entry.name === name
        );

        state['management-connection'].connections.push(
          ...Array.from({ length: count }, (_, index) => ({
            id: `long-list-${index}`,
            workspaceId: workspace.id,
            name: `Long list connection ${index}${'x'.repeat(index === 0 ? 60 : 0)}`,
            type: 'postgres',
            method: 'form',
            host: 'localhost',
            port: '5432',
            username: 'orcaq',
            database: `pagila${'_long_name'.repeat(index === 0 ? 10 : 0)}`,
            createdAt: new Date().toISOString(),
          }))
        );
      },
      { count: SEEDED_CONNECTIONS, name: workspaceName }
    );

    const table = page
      .getByTestId('connections-table')
      .locator('[data-slot="table-container"]');
    await expect(table.locator('tbody tr')).toHaveCount(SEEDED_CONNECTIONS);

    const viewport = page.viewportSize()!;

    // The dialog zooms in, so wait for the open animation to settle.
    await expect
      .poll(async () => (await modal.boundingBox())!.width)
      .toBeCloseTo(viewport.width * 0.6, 0);
    expect((await modal.boundingBox())!.height).toBeLessThanOrEqual(
      viewport.height * 0.9
    );

    const isScrollable = await table.evaluate(
      element => element.scrollHeight > element.clientHeight
    );
    expect(isScrollable).toBe(true);

    const hasHorizontalOverflow = await table.evaluate(
      element => element.scrollWidth > element.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);

    await table.evaluate(element => element.scrollTo(0, element.scrollHeight));
    await expect(
      table.getByText(`Long list connection ${SEEDED_CONNECTIONS - 1}`).first()
    ).toBeInViewport();
    await expect(table.locator('thead')).toBeInViewport();
  });
});
