import dayjs from 'dayjs';
import { toast } from 'vue-sonner';
import { generateTableAlias } from '~/components/modules/raw-query/utils/getMappedSchemaSuggestion';
import { useStreamingDownload } from '~/composables/useStreamingDownload';
import { TabViewType } from '~/shared/stores/useTabViewsStore';
import {
  generateDropTableSQL,
  generateRenameTableSQL,
} from '~/utils/sql-generators/generateTableSQL';
import {
  ExportDataFormatType,
  type ContextMenuState,
  type SchemaContextMenuOptions,
} from '../types';
import type { useContextMenuHelpers } from '../useContextMenuHelpers';

export function useTableActions(
  options: SchemaContextMenuOptions,
  state: ContextMenuState,
  helpers: ReturnType<typeof useContextMenuHelpers>
) {
  const {
    getSchemaName,
    executeWithSafeMode,
    showSqlPreview,
    getTableColumns,
    getTableColumnsMetadata,
    getPrimaryKeyColumns,
    getColumnPlaceholder,
  } = helpers;

  // dowload file with progress by native browser
  const onExportTableData = (format: ExportDataFormatType) => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !state.selectedItem.value.name
    ) {
      return;
    }

    const tableName = state.selectedItem.value.name;

    // Create hidden form for native browser download
    // Browser handles the streaming response with its native download progress
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/export-table-data';
    form.style.display = 'none';

    const fields = {
      dbConnectionString: options.currentConnectionString.value!,
      schemaName: getSchemaName(),
      tableName,
      format,
    };

    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    toast.info(`Exporting ${tableName} as ${format.toUpperCase()}...`);
  };

  //Keep this version for want dowload file with progress in client
  const onExportTableDataWithProgressInClient = async (
    format: ExportDataFormatType
  ) => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !state.selectedItem.value.name
    ) {
      return;
    }

    const tableName = state.selectedItem.value.name;
    const { downloadStream } = useStreamingDownload();

    const contentTypes: Record<string, string> = {
      sql: 'application/sql',
      json: 'application/json',
      csv: 'text/csv',
    };
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm');

    await downloadStream({
      url: '/api/export-table-data',
      method: 'POST',
      body: {
        dbConnectionString: options.currentConnectionString.value,
        schemaName: getSchemaName(),
        tableName,
        format,
      },
      filename: `${tableName}_${timestamp}.${format}`,
      contentType: contentTypes[format],
    });
  };

  const onImportTableData = () => {
    // TODO: Implement import functionality
    toast.info('Import feature coming soon');
  };

  const onDeleteTable = async () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !state.selectedItem.value.name
    ) {
      return;
    }

    const sql = generateDropTableSQL(
      getSchemaName(),
      state.selectedItem.value.name,
      false
    );

    await executeWithSafeMode(sql, 'delete', async () => {
      try {
        await $fetch('/api/execute', {
          method: 'POST',
          body: {
            dbConnectionString: options.currentConnectionString.value,
            query: sql,
          },
        });

        toast.success('Table deleted successfully');
        await options.onRefreshSchema();
      } catch (e: unknown) {
        console.log(e);
        const error = e as { message?: string };
        toast.error(error.message || 'Failed to delete table');
      }
    });
  };

  const onRenameTable = () => {
    if (
      !state.selectedItem.value ||
      state.selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !state.selectedItem.value.name
    ) {
      return;
    }

    state.renameDialogType.value = TabViewType.TableDetail;
    state.renameDialogValue.value = state.selectedItem.value.name;
    state.renameDialogOpen.value = true;
    state.renameDialogParameters.value = ''; // Tables don't have parameters
  };

  const performRenameTable = async (newName: string) => {
    const sql = generateRenameTableSQL(
      getSchemaName(),
      state.renameDialogValue.value,
      newName
    );

    await executeWithSafeMode(sql, 'save', async () => {
      try {
        await $fetch('/api/execute', {
          method: 'POST',
          body: {
            dbConnectionString: options.currentConnectionString.value,
            query: sql,
          },
        });

        toast.success('Table renamed successfully');
        await options.onRefreshSchema();
      } catch (e: unknown) {
        const error = e as { message?: string };
        toast.error(error.message || 'Failed to rename table');
      }
    });
  };

  const onGenSelectSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const columns = getTableColumns(state.selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;

    const colsStr = columns.length > 0 ? columns.join(', ') : '*';
    const sql = `SELECT ${colsStr}
FROM ${schemaName}.${tableName};
-- WHERE ?
-- LIMIT 100 OFFSET 0`;

    showSqlPreview(sql, 'SELECT Statement');
  };

  const onGenInsertSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const columnsMetadata = getTableColumnsMetadata(
      state.selectedItem.value.name
    );
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;

    if (columnsMetadata.length > 0) {
      const colsStr = columnsMetadata.map(c => c.name).join(', ');
      const valuesStr = columnsMetadata
        .map(c => getColumnPlaceholder(c))
        .join(', ');
      const sql = `INSERT INTO ${schemaName}.${tableName} (${colsStr})
VALUES (${valuesStr});`;
      showSqlPreview(sql, 'INSERT Statement');
    } else {
      const sql = `INSERT INTO ${schemaName}.${tableName} (column1, column2, ...)
VALUES (value1, value2, ...);`;
      showSqlPreview(sql, 'INSERT Statement');
    }
  };

  const onGenUpdateSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const columnsMetadata = getTableColumnsMetadata(
      state.selectedItem.value.name
    );
    const primaryKeys = getPrimaryKeyColumns(state.selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;

    // Exclude primary keys from SET clause
    const updateCols = columnsMetadata.filter(
      c => !primaryKeys.includes(c.name)
    );
    const setClause =
      updateCols.length > 0
        ? updateCols
            .map(c => `  ${c.name} = ${getColumnPlaceholder(c)}`)
            .join(',\n')
        : '  column1 = value1,\n  column2 = value2';

    // Build WHERE clause with primary keys
    const whereClause =
      primaryKeys.length > 0
        ? primaryKeys.map(pk => `${pk} = ?`).join(' AND ')
        : '1=0 -- Add your WHERE clause';

    const sql = `UPDATE ${schemaName}.${tableName}
SET
${setClause}
WHERE ${whereClause};`;

    showSqlPreview(sql, 'UPDATE Statement');
  };

  const onGenDeleteSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const primaryKeys = getPrimaryKeyColumns(state.selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;

    const whereClause =
      primaryKeys.length > 0
        ? primaryKeys.map(pk => `${pk} = ?`).join(' AND ')
        : '1=0 -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)';

    const sql = `DELETE FROM ${schemaName}.${tableName}
WHERE ${whereClause};`;

    showSqlPreview(sql, 'DELETE Statement');
  };

  const onGenMergeSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const columns = getTableColumns(state.selectedItem.value.name);
    const primaryKeys = getPrimaryKeyColumns(state.selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;
    const tableAlias = generateTableAlias(tableName);

    const colList =
      columns.length > 0 ? columns.join(', ') : 'column1, column2';
    const pkCondition =
      primaryKeys.length > 0
        ? primaryKeys.map(pk => `${tableAlias}.${pk} = src.${pk}`).join(' AND ')
        : `${tableAlias}.id = src.id`;
    const updateSet =
      columns.length > 0
        ? columns
            .filter(c => !primaryKeys.includes(c))
            .map(c => `    ${c} = src.${c}`)
            .join(',\n')
        : '    column1 = src.column1';
    const sourceValues =
      columns.length > 0
        ? columns.map(c => `src.${c}`).join(', ')
        : 'src.column1, src.column2';

    const sql = `MERGE INTO ${schemaName}.${tableName} AS ${tableAlias}
USING (SELECT ${colList} FROM source_table) AS src
ON ${pkCondition}
WHEN MATCHED THEN
  UPDATE SET
${updateSet}
WHEN NOT MATCHED THEN
  INSERT (${colList})
  VALUES (${sourceValues});`;

    showSqlPreview(sql, 'MERGE Statement');
  };

  const onGenInsertOnConflictSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const columnsMetadata = getTableColumnsMetadata(
      state.selectedItem.value.name
    );
    const primaryKeys = getPrimaryKeyColumns(state.selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;

    const colsStr =
      columnsMetadata.length > 0
        ? columnsMetadata.map(c => c.name).join(', ')
        : 'column1, column2';
    const valuesStr =
      columnsMetadata.length > 0
        ? columnsMetadata.map(c => getColumnPlaceholder(c)).join(', ')
        : 'value1, value2';
    const conflictCols = primaryKeys.length > 0 ? primaryKeys.join(', ') : 'id';
    const updateCols = columnsMetadata.filter(
      c => !primaryKeys.includes(c.name)
    );
    const updateClause =
      updateCols.length > 0
        ? updateCols.map(c => `    ${c.name} = EXCLUDED.${c.name}`).join(',\n')
        : '    column1 = EXCLUDED.column1';

    const sql = `INSERT INTO ${schemaName}.${tableName} (${colsStr})
VALUES (${valuesStr})
ON CONFLICT (${conflictCols})
DO UPDATE SET
${updateClause};`;

    showSqlPreview(sql, 'INSERT ON CONFLICT');
  };

  const onGenUpdateFromSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const columns = getTableColumns(state.selectedItem.value.name);
    const primaryKeys = getPrimaryKeyColumns(state.selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;
    const tableAlias = generateTableAlias(tableName);

    const updateSet =
      columns.length > 0
        ? columns
            .filter(c => !primaryKeys.includes(c))
            .map(c => `  ${c} = src.${c}`)
            .join(',\n')
        : '  column1 = src.column1';
    const pkCondition =
      primaryKeys.length > 0
        ? primaryKeys.map(pk => `${tableAlias}.${pk} = src.${pk}`).join(' AND ')
        : `${tableAlias}.id = src.id`;

    const sql = `UPDATE ${schemaName}.${tableName} AS ${tableAlias}
SET
${updateSet}
FROM source_table AS src
WHERE ${pkCondition};`;

    showSqlPreview(sql, 'UPDATE FROM');
  };

  const onGenDeleteUsingSQL = () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;
    const primaryKeys = getPrimaryKeyColumns(state.selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = state.selectedItem.value.name;
    const tableAlias = generateTableAlias(tableName);

    const pkCondition =
      primaryKeys.length > 0
        ? primaryKeys.map(pk => `${tableAlias}.${pk} = src.${pk}`).join(' AND ')
        : `${tableAlias}.id = src.id`;

    const sql = `DELETE FROM ${schemaName}.${tableName} AS ${tableAlias}
USING source_table AS src
WHERE ${pkCondition};`;

    showSqlPreview(sql, 'DELETE USING');
  };

  const onGenTableDDL = async () => {
    if (!state.selectedItem.value || !state.selectedItem.value.name) return;

    showSqlPreview('', 'Table DDL');

    state.isFetching.value = true;
    try {
      const ddl = await $fetch('/api/get-table-ddl', {
        method: 'POST',
        body: {
          dbConnectionString: options.currentConnectionString.value,
          schemaName: getSchemaName(),
          tableName: state.selectedItem.value.name,
        },
      });

      showSqlPreview(ddl, 'Table DDL');
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get table DDL');
    } finally {
      state.isFetching.value = false;
    }
  };

  return {
    onExportTableData,
    onExportTableDataWithProgressInClient,
    onImportTableData,
    onDeleteTable,
    onRenameTable,
    performRenameTable,
    onGenSelectSQL,
    onGenInsertSQL,
    onGenUpdateSQL,
    onGenDeleteSQL,
    onGenMergeSQL,
    onGenInsertOnConflictSQL,
    onGenUpdateFromSQL,
    onGenDeleteUsingSQL,
    onGenTableDDL,
  };
}
