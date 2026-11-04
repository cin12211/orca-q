import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTableActions } from '~/components/modules/management/schemas/hooks/context-menu/actions/useTableActions';
import {
  ExportDataFormatType,
  type ContextMenuState,
} from '~/components/modules/management/schemas/hooks/context-menu/types';
import { useContextMenuState } from '~/components/modules/management/schemas/hooks/context-menu/useContextMenuState';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import {
  makeColumn,
  makeConnection,
  makeSchema,
  makeSelectedItem,
} from './testUtils';

const { mockToast, mockGetConnectionParams, mockDownloadStream } = vi.hoisted(
  () => ({
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      loading: vi.fn(),
    },
    mockGetConnectionParams: vi.fn(() => ({ connection: 'params' })),
    mockDownloadStream: vi.fn(),
  })
);
const mockFetch = vi.fn(async () => ({}));

vi.mock('vue-sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/core/helpers/connection-helper', () => ({
  getConnectionParams: mockGetConnectionParams,
}));

vi.mock('~/core/composables/useStreamingDownload', () => ({
  useStreamingDownload: () => ({
    downloadStream: mockDownloadStream,
  }),
}));

vi.mock('dayjs', () => ({
  default: () => ({
    format: () => '2026-03-24_10-11',
  }),
}));

vi.stubGlobal('$fetch', mockFetch);

describe('useTableActions', () => {
  const makeOptions = (schema = makeSchema()) => ({
    schemaName: ref(schema.name),
    activeSchema: ref(schema),
    onRefreshSchema: vi.fn().mockResolvedValue(undefined),
    connection: ref(makeConnection()),
  });

  const makeHelpers = (state: ContextMenuState) => ({
    getSchemaName: vi.fn(() => 'public'),
    executeWithSafeMode: vi.fn(async (_sql, _type, action) => {
      await action();
    }),
    showSqlPreview: vi.fn((sql: string, title: string) => {
      state.sqlPreviewDialogSQL.value = sql;
      state.sqlPreviewDialogTitle.value = title;
      state.sqlPreviewDialogOpen.value = true;
    }),
    getTableColumns: vi.fn(() => ['id', 'email', 'created_at']),
    getTableColumnsMetadata: vi.fn(() => [
      makeColumn({ name: 'id', ordinal_position: 1 }),
      makeColumn({ name: 'email', ordinal_position: 2, type: 'text' }),
      makeColumn({
        name: 'created_at',
        ordinal_position: 3,
        default_value: 'CURRENT_TIMESTAMP',
      }),
    ]),
    getPrimaryKeyColumns: vi.fn(() => ['id']),
    getColumnPlaceholder: vi.fn(
      (column: { name: string; default_value?: string | null }) => {
        if (column.default_value) {
          return column.default_value;
        }
        return `:${column.name}`;
      }
    ),
    executeWithLoading: vi.fn(async (action, loadingRef = state.isFetching) => {
      loadingRef.value = true;
      try {
        await action();
      } finally {
        loadingRef.value = false;
      }
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnectionParams.mockReturnValue({ connection: 'params' });
  });

  it('exports table data through a submitted form and native download toast', () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useTableActions(makeOptions(), state, helpers as any);
    let submittedForm: HTMLFormElement | undefined;

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );

    const submitSpy = vi
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(function (this: HTMLFormElement) {
        submittedForm = this;
      });

    actions.onExportTableData(ExportDataFormatType.JSON);

    expect(submitSpy).toHaveBeenCalledOnce();
    expect(submittedForm?.action).toContain('/api/tables/export');
    expect(document.body.contains(submittedForm!)).toBe(false);

    const fields = Object.fromEntries(
      Array.from(submittedForm!.querySelectorAll('input')).map(input => [
        input.name,
        input.value,
      ])
    );

    expect(fields).toMatchObject({
      connection: 'params',
      schemaName: 'public',
      tableName: 'users',
      format: 'json',
    });
    expect(mockToast.info).toHaveBeenCalledWith('Exporting users as JSON...');
  });

  it('exports table data with client-side streaming when requested', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useTableActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );

    await actions.onExportTableDataWithProgressInClient(
      ExportDataFormatType.SQL
    );

    expect(mockDownloadStream).toHaveBeenCalledWith({
      url: '/api/tables/export',
      method: 'POST',
      body: {
        connection: 'params',
        schemaName: 'public',
        tableName: 'users',
        format: ExportDataFormatType.SQL,
      },
      filename: 'users_2026-03-24_10-11.sql',
      contentType: 'application/sql',
    });
  });

  it('shows the import placeholder toast', () => {
    const actions = useTableActions(
      makeOptions(),
      useContextMenuState(),
      makeHelpers(useContextMenuState()) as any
    );

    actions.onImportTableData();

    expect(mockToast.info).toHaveBeenCalledWith('Import feature coming soon');
  });

  it('deletes and renames tables through safe mode and query execution', async () => {
    const state = useContextMenuState();
    const options = makeOptions();
    const helpers = makeHelpers(state);
    const actions = useTableActions(options, state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );
    state.renameDialogValue.value = 'users';
    mockFetch.mockResolvedValue({});

    await actions.onDeleteTable();
    actions.onRenameTable();
    await actions.performRenameTable('accounts');

    expect(helpers.executeWithSafeMode).toHaveBeenNthCalledWith(
      1,
      'DROP TABLE IF EXISTS "public"."users";',
      'delete',
      expect.any(Function)
    );
    expect(state.renameDialogOpen.value).toBe(true);
    expect(state.renameDialogType.value).toBe(TabViewType.TableDetail);
    expect(helpers.executeWithSafeMode).toHaveBeenNthCalledWith(
      2,
      'ALTER TABLE "public"."users" RENAME TO "accounts";',
      'save',
      expect.any(Function)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/query/execute',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Table deleted successfully'
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Table renamed successfully'
    );
    expect(options.onRefreshSchema).toHaveBeenCalledTimes(2);
  });

  it('generates SELECT and INSERT SQL previews from table metadata', () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useTableActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );

    actions.onGenSelectSQL();
    expect(helpers.showSqlPreview).toHaveBeenLastCalledWith(
      `SELECT "id", "email", "created_at"
FROM "public"."users";
-- WHERE ?
-- LIMIT 100 OFFSET 0`,
      'SELECT Statement'
    );

    actions.onGenInsertSQL();
    expect(helpers.showSqlPreview).toHaveBeenLastCalledWith(
      `INSERT INTO "public"."users" ("id", "email", "created_at")
VALUES (:id, :email, CURRENT_TIMESTAMP);`,
      'INSERT Statement'
    );
  });

  it('generates UPDATE and DELETE SQL previews using primary keys', () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useTableActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );

    actions.onGenUpdateSQL();
    expect(state.sqlPreviewDialogSQL.value).toBe(`UPDATE "public"."users"
SET
  "email" = :email,
  "created_at" = CURRENT_TIMESTAMP
WHERE "id" = ?;`);

    actions.onGenDeleteSQL();
    expect(state.sqlPreviewDialogSQL.value).toBe(`DELETE FROM "public"."users"
WHERE "id" = ?;`);
  });

  it('falls back to a safety WHERE clause when deleting without primary keys', () => {
    const state = useContextMenuState();
    const helpers = {
      ...makeHelpers(state),
      getPrimaryKeyColumns: vi.fn(() => []),
    };
    const actions = useTableActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );

    actions.onGenDeleteSQL();

    expect(state.sqlPreviewDialogSQL.value).toBe(`DELETE FROM "public"."users"
WHERE 1=0 -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes);`);
  });

  it('generates MERGE, INSERT ON CONFLICT, UPDATE FROM, and DELETE USING previews', () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useTableActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );

    actions.onGenMergeSQL();
    expect(state.sqlPreviewDialogSQL.value).toContain(
      'MERGE INTO "public"."users" AS "u"'
    );
    expect(state.sqlPreviewDialogSQL.value).toContain('ON "u"."id" = src."id"');

    actions.onGenInsertOnConflictSQL();
    expect(state.sqlPreviewDialogSQL.value).toContain('ON CONFLICT ("id")');
    expect(state.sqlPreviewDialogSQL.value).toContain(
      '"email" = EXCLUDED."email"'
    );

    actions.onGenUpdateFromSQL();
    expect(state.sqlPreviewDialogSQL.value).toBe(`UPDATE "public"."users" AS "u"
SET
  "email" = src."email",
  "created_at" = src."created_at"
FROM source_table AS src
WHERE "u"."id" = src."id";`);

    actions.onGenDeleteUsingSQL();
    expect(state.sqlPreviewDialogSQL.value)
      .toBe(`DELETE FROM "public"."users" AS "u"
USING source_table AS src
WHERE "u"."id" = src."id";`);
  });

  it('fetches and previews table DDL', async () => {
    const state = useContextMenuState();
    const helpers = makeHelpers(state);
    const actions = useTableActions(makeOptions(), state, helpers as any);

    state.selectedItem.value = makeSelectedItem(
      TabViewType.TableDetail,
      'users'
    );
    mockFetch.mockResolvedValue('CREATE TABLE users (id serial primary key);');

    await actions.onGenTableDDL();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tables/ddl',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          connection: 'params',
          schemaName: 'public',
          tableName: 'users',
        }),
      })
    );
    expect(helpers.showSqlPreview).toHaveBeenLastCalledWith(
      'CREATE TABLE users (id serial primary key);',
      'Table DDL'
    );
  });
});
