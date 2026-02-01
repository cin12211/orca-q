import { toRef, computed, ref } from 'vue';
import dayjs from 'dayjs';
import { toast } from 'vue-sonner';
import type { FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import {
  ContextMenuItemType,
  type ContextMenuItem,
} from '~/components/base/context-menu/menuContext.type';
import { generateTableAlias } from '~/components/modules/raw-query/utils/getMappedSchemaSuggestion';
import type { FunctionSignature } from '~/server/api/get-function-signature';
import type {
  ColumnShortMetadata,
  TableDetailMetadata,
} from '~/server/api/get-schema-meta-data';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import type { Schema } from '~/shared/stores/useSchemaStore';
import { TabViewType } from '~/shared/stores/useTabViewsStore';
import {
  generateFunctionCallSQL,
  generateFunctionSelectSQL,
  generateDropFunctionSQL,
  generateRenameFunctionSQL,
} from '~/utils/sql-generators/generateFunctionSQL';
import {
  generateDropTableSQL,
  generateRenameTableSQL,
} from '~/utils/sql-generators/generateTableSQL';

export interface SchemaContextMenuOptions {
  schemaName: Ref<string>;
  connectionString: string;
  activeSchema: Ref<Schema | undefined>;
  onRefreshSchema: () => Promise<void>;
}
export enum ExportTableDataFormat {
  CSV = 'csv',
  JSON = 'json',
  SQL = 'sql',
}

export function useSchemaContextMenu(options: SchemaContextMenuOptions) {
  const appLayoutStore = useAppLayoutStore();
  const safeModeEnabled = toRef(appLayoutStore, 'quickQuerySafeModeEnabled');

  const selectedItem = ref<FlattenedTreeFileSystemItem['value'] | null>(null);

  // Safe mode dialog state
  const safeModeDialogOpen = ref(false);
  const safeModeDialogSQL = ref('');
  const safeModeDialogType = ref<'save' | 'delete'>('delete');
  const safeModeLoading = ref(false);
  const pendingAction = ref<(() => Promise<void>) | null>(null);

  // Rename dialog state
  const renameDialogType = ref<TabViewType | null>(null);
  const renameDialogOpen = ref(false);
  const renameDialogValue = ref('');
  const renameDialogParameters = ref('');

  // SQL Preview dialog state
  const sqlPreviewDialogOpen = ref(false);
  const sqlPreviewDialogSQL = ref('');
  const sqlPreviewDialogTitle = ref('Generated SQL');
  const isFetching = ref(false);

  /**
   * Get the actual schema name from activeSchema
   */
  const getSchemaName = (): string => {
    return options.activeSchema.value?.name || 'public';
  };

  /**
   * Get table metadata from schema (columns, primary keys, etc.)
   */
  const getTableMetadata = (tableName: string): TableDetailMetadata | null => {
    const schema = options.activeSchema.value;
    if (!schema?.tableDetails) return null;
    return schema.tableDetails[tableName] || null;
  };

  /**
   * Get columns for a table with full metadata
   */
  const getTableColumnsMetadata = (
    tableName: string
  ): ColumnShortMetadata[] => {
    const metadata = getTableMetadata(tableName);
    if (!metadata?.columns) return [];
    return metadata.columns.sort(
      (a, b) => a.ordinal_position - b.ordinal_position
    );
  };

  /**
   * Get column names for a table
   */
  const getTableColumns = (tableName: string): string[] => {
    return getTableColumnsMetadata(tableName).map(col => col.name);
  };

  /**
   * Get primary key columns for a table
   */
  const getPrimaryKeyColumns = (tableName: string): string[] => {
    const metadata = getTableMetadata(tableName);
    if (!metadata?.primary_keys) return [];
    return metadata.primary_keys.map(pk => pk.column);
  };

  /**
   * Get placeholder value for a column based on its properties
   * - Has default value → show default
   * - Is nullable → NULL
   * - Required → ?
   */
  const getColumnPlaceholder = (col: ColumnShortMetadata): string => {
    if (col.default_value) {
      return col.default_value;
    }
    if (col.is_nullable) {
      return 'NULL';
    }
    return `:${col.name}`;
  };

  /**
   * Handle right-click on item
   */
  const onRightClickItem = (
    _: MouseEvent,
    item: FlattenedTreeFileSystemItem
  ) => {
    selectedItem.value = toRaw(item.value);
  };

  /**
   * Show SQL in preview dialog
   */
  const showSqlPreview = (sql: string, title: string) => {
    sqlPreviewDialogSQL.value = sql;
    sqlPreviewDialogTitle.value = title;
    sqlPreviewDialogOpen.value = true;
  };

  /**
   * Execute action with safe mode check
   */
  const executeWithSafeMode = async (
    sql: string,
    type: 'save' | 'delete',
    action: () => Promise<void>
  ) => {
    if (safeModeEnabled.value) {
      safeModeDialogSQL.value = sql;
      safeModeDialogType.value = type;
      pendingAction.value = action;
      safeModeDialogOpen.value = true;
    } else {
      await action();
    }
  };

  /**
   * Confirm safe mode action
   */
  const onSafeModeConfirm = async () => {
    if (pendingAction.value) {
      safeModeLoading.value = true;
      await pendingAction.value();
      safeModeLoading.value = false;
      pendingAction.value = null;
    }
    safeModeDialogOpen.value = false;
  };

  /**
   * Cancel safe mode action
   */
  const onSafeModeCancel = () => {
    pendingAction.value = null;
    safeModeDialogOpen.value = false;
  };

  // ============ FUNCTION ACTIONS ============

  const onDeleteFunction = async () => {
    if (
      !selectedItem.value ||
      selectedItem.value.tabViewType !== TabViewType.FunctionsDetail ||
      !selectedItem.value.name
    ) {
      return;
    }

    const sql = generateDropFunctionSQL(
      getSchemaName(),
      selectedItem.value.name,
      false,
      selectedItem.value.parameters
    );

    const functionName = selectedItem.value!.name;

    await executeWithSafeMode(sql, 'delete', async () => {
      try {
        await $fetch('/api/delete-function', {
          method: 'POST',
          body: {
            dbConnectionString: options.connectionString,
            schemaName: getSchemaName(),
            functionName,
          },
        });

        toast.success('Function deleted successfully');
        await options.onRefreshSchema();
      } catch (e: unknown) {
        const error = e as { message?: string };
        toast.error(error.message || 'Failed to delete function');
      }
    });
  };

  const onRenameFunction = () => {
    if (
      !selectedItem.value ||
      selectedItem.value.tabViewType !== TabViewType.FunctionsDetail ||
      !selectedItem.value.name
    ) {
      return;
    }
    renameDialogType.value = TabViewType.FunctionsDetail;
    renameDialogValue.value = selectedItem.value.name;
    renameDialogOpen.value = true;
    renameDialogParameters.value = selectedItem.value.parameters || '';
  };

  const onConfirmRename = async (newName: string) => {
    console.log('newName', newName);
    renameDialogOpen.value = false;

    // Handle function rename
    if (renameDialogType.value === TabViewType.FunctionsDetail) {
      const sql = generateRenameFunctionSQL(
        getSchemaName(),
        renameDialogValue.value,
        newName,
        renameDialogParameters.value
      );

      await executeWithSafeMode(sql, 'save', async () => {
        try {
          await $fetch('/api/rename-function', {
            method: 'POST',
            body: {
              dbConnectionString: options.connectionString,
              schemaName: getSchemaName(),
              oldName: renameDialogValue.value,
              newName,
            },
          });

          toast.success('Function renamed successfully');
          await options.onRefreshSchema();
        } catch (e: unknown) {
          const error = e as { message?: string };
          toast.error(error.message || 'Failed to rename function');
        }
      });
    }

    // Handle table rename
    if (renameDialogType.value === TabViewType.TableDetail) {
      const sql = generateRenameTableSQL(
        getSchemaName(),
        renameDialogValue.value,
        newName
      );

      await executeWithSafeMode(sql, 'save', async () => {
        try {
          await $fetch('/api/execute', {
            method: 'POST',
            body: {
              dbConnectionString: options.connectionString,
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
    }
  };

  const onGenFunctionCallSQL = async () => {
    if (!selectedItem.value) return;

    showSqlPreview('', 'CALL Statement');
    isFetching.value = true;

    try {
      const signature = await $fetch<FunctionSignature | null>(
        '/api/get-function-signature',
        {
          method: 'POST',
          body: {
            dbConnectionString: options.connectionString,
            functionId: selectedItem.value.id,
          },
        }
      );

      const schemaName = getSchemaName();
      const functionName = signature?.name || '';

      let sql: string;
      if (signature?.parameters && signature.parameters.length > 0) {
        // Filter only IN and INOUT parameters
        const inputParams = signature.parameters.filter(
          p => p.mode === 'IN' || p.mode === 'INOUT' || p.mode === 'VARIADIC'
        );

        if (inputParams.length > 0) {
          const paramComment = inputParams
            .map(p => `${p.name}::${p.type}`)
            .join(', ');
          const paramArgs = inputParams.map(p => `:${p.name}`).join(', ');
          sql = `-- ${paramComment}\nCALL "${schemaName}"."${functionName}"(${paramArgs});`;
        } else {
          sql = `CALL "${schemaName}"."${functionName}"();`;
        }
      } else {
        sql = generateFunctionCallSQL(schemaName, functionName);
      }

      sqlPreviewDialogSQL.value = sql;
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get function signature');
      sqlPreviewDialogOpen.value = false;
    } finally {
      isFetching.value = false;
    }
  };

  const onGenFunctionSelectSQL = async () => {
    if (!selectedItem.value) return;

    showSqlPreview('', 'SELECT Function');
    isFetching.value = true;

    try {
      const signature = await $fetch<FunctionSignature | null>(
        '/api/get-function-signature',
        {
          method: 'POST',
          body: {
            dbConnectionString: options.connectionString,
            functionId: selectedItem.value.id,
          },
        }
      );

      const schemaName = getSchemaName();
      const functionName = signature?.name || '';

      let sql: string;
      if (signature?.parameters && signature.parameters.length > 0) {
        // Filter only IN and INOUT parameters
        const inputParams = signature.parameters.filter(
          p => p.mode === 'IN' || p.mode === 'INOUT' || p.mode === 'VARIADIC'
        );

        if (inputParams.length > 0) {
          const paramComment = inputParams
            .map(p => `${p.name}::${p.type}`)
            .join(', ');
          const paramArgs = inputParams.map(p => `:${p.name}`).join(', ');
          sql = `-- ${paramComment}\nSELECT * FROM "${schemaName}"."${functionName}"(${paramArgs});`;
        } else {
          sql = `SELECT * FROM "${schemaName}"."${functionName}"();`;
        }
      } else {
        sql = generateFunctionSelectSQL(schemaName, functionName);
      }

      sqlPreviewDialogSQL.value = sql;
    } catch (e: unknown) {
      console.log(e);
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get function signature');
      sqlPreviewDialogOpen.value = false;
    } finally {
      isFetching.value = false;
    }
  };

  const onGenFunctionDDL = async () => {
    if (
      !selectedItem.value ||
      selectedItem.value.tabViewType !== TabViewType.FunctionsDetail
    )
      return;

    try {
      isFetching.value = true;
      showSqlPreview('', 'Function DDL');
      const def = await $fetch('/api/get-one-function', {
        method: 'POST',
        body: {
          dbConnectionString: options.connectionString,
          functionId: selectedItem.value.id,
        },
      });

      if (def) {
        showSqlPreview(def, 'Function DDL');
      } else {
        toast.error('Could not retrieve function definition');
      }
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get function DDL');
    } finally {
      isFetching.value = false;
    }
  };

  // ============ TABLE ACTIONS ============
  // dowload file with progress by native browser
  const onExportTableData = (format: ExportTableDataFormat) => {
    console.log('selectedItem.value', selectedItem.value);

    if (
      !selectedItem.value ||
      selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !selectedItem.value.name
    ) {
      return;
    }

    const tableName = selectedItem.value.name;

    // Create hidden form for native browser download
    // Browser handles the streaming response with its native download progress
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/export-table-data';
    form.style.display = 'none';

    const fields = {
      dbConnectionString: options.connectionString,
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
    format: ExportTableDataFormat
  ) => {
    if (
      !selectedItem.value ||
      selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !selectedItem.value.name
    ) {
      return;
    }

    const tableName = selectedItem.value.name;
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
        dbConnectionString: options.connectionString,
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
      !selectedItem.value ||
      selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !selectedItem.value.name
    ) {
      return;
    }

    const sql = generateDropTableSQL(
      getSchemaName(),
      selectedItem.value.name,
      false
    );

    await executeWithSafeMode(sql, 'delete', async () => {
      try {
        await $fetch('/api/execute', {
          method: 'POST',
          body: {
            dbConnectionString: options.connectionString,
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
      !selectedItem.value ||
      selectedItem.value.tabViewType !== TabViewType.TableDetail ||
      !selectedItem.value.name
    ) {
      return;
    }

    renameDialogType.value = TabViewType.TableDetail;
    renameDialogValue.value = selectedItem.value.name;
    renameDialogOpen.value = true;
    renameDialogParameters.value = ''; // Tables don't have parameters
  };

  const onRefreshSchema = async () => {
    try {
      toast.info('Refreshing schema...');
      await options.onRefreshSchema();
      toast.success('Schema refreshed');
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to refresh schema');
    }
  };

  // ============ TABLE SQL GENERATION (with actual column data) ============

  const onGenSelectSQL = () => {
    if (!selectedItem.value || !selectedItem.value.name) return;
    const columns = getTableColumns(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;

    const colsStr = columns.length > 0 ? columns.join(', ') : '*';
    const sql = `SELECT ${colsStr}
FROM ${schemaName}.${tableName};
-- WHERE ?
-- LIMIT 100 OFFSET 0`;

    showSqlPreview(sql, 'SELECT Statement');
  };

  const onGenInsertSQL = () => {
    if (!selectedItem.value || !selectedItem.value.name) return;
    const columnsMetadata = getTableColumnsMetadata(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;

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
    if (!selectedItem.value || !selectedItem.value.name) return;
    const columnsMetadata = getTableColumnsMetadata(selectedItem.value.name);
    const primaryKeys = getPrimaryKeyColumns(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;

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
    if (!selectedItem.value || !selectedItem.value.name) return;
    const primaryKeys = getPrimaryKeyColumns(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;

    const whereClause =
      primaryKeys.length > 0
        ? primaryKeys.map(pk => `${pk} = ?`).join(' AND ')
        : '1=0 -- Add your WHERE clause (safety: 1=0 to prevent accidental deletes)';

    const sql = `DELETE FROM ${schemaName}.${tableName}
WHERE ${whereClause};`;

    showSqlPreview(sql, 'DELETE Statement');
  };

  const onGenMergeSQL = () => {
    if (!selectedItem.value || !selectedItem.value.name) return;
    const columns = getTableColumns(selectedItem.value.name);
    const primaryKeys = getPrimaryKeyColumns(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;
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
    if (!selectedItem.value || !selectedItem.value.name) return;
    const columnsMetadata = getTableColumnsMetadata(selectedItem.value.name);
    const primaryKeys = getPrimaryKeyColumns(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;

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
    if (!selectedItem.value || !selectedItem.value.name) return;
    const columns = getTableColumns(selectedItem.value.name);
    const primaryKeys = getPrimaryKeyColumns(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;
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
    if (!selectedItem.value || !selectedItem.value.name) return;
    const primaryKeys = getPrimaryKeyColumns(selectedItem.value.name);
    const schemaName = getSchemaName();
    const tableName = selectedItem.value.name;
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
    if (!selectedItem.value || !selectedItem.value.name) return;

    showSqlPreview('', 'Table DDL');

    isFetching.value = true;
    try {
      const ddl = await $fetch('/api/get-table-ddl', {
        method: 'POST',
        body: {
          dbConnectionString: options.connectionString,
          schemaName: getSchemaName(),
          tableName: selectedItem.value.name,
        },
      });

      showSqlPreview(ddl, 'Table DDL');
    } catch (e: unknown) {
      const error = e as { message?: string };
      toast.error(error.message || 'Failed to get table DDL');
    } finally {
      isFetching.value = false;
    }
  };

  // ============ CONTEXT MENU ITEMS ============

  const refreshSchemaOption: ContextMenuItem = {
    title: 'Refresh Schema',
    icon: 'hugeicons:refresh',
    type: ContextMenuItemType.ACTION,
    select: onRefreshSchema,
  };

  const functionMenuItems = computed<ContextMenuItem[]>(() => [
    {
      title: 'Rename...',
      icon: 'hugeicons:pencil-edit-02',
      type: ContextMenuItemType.ACTION,
      select: onRenameFunction,
    },
    {
      title: 'Delete',
      icon: 'hugeicons:delete-02',
      type: ContextMenuItemType.ACTION,
      select: onDeleteFunction,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    {
      title: 'Generate SQL',
      icon: 'hugeicons:code',
      type: ContextMenuItemType.SUBMENU,
      items: [
        {
          title: 'CALL',
          icon: 'hugeicons:play',
          type: ContextMenuItemType.ACTION,
          select: onGenFunctionCallSQL,
        },
        {
          title: 'SELECT',
          icon: 'hugeicons:table',
          type: ContextMenuItemType.ACTION,
          select: onGenFunctionSelectSQL,
        },
        {
          type: ContextMenuItemType.SEPARATOR,
        },
        {
          title: 'DDL',
          icon: 'hugeicons:document-code',
          type: ContextMenuItemType.ACTION,
          select: onGenFunctionDDL,
        },
      ],
    },
  ]);

  const tableMenuItems = computed<ContextMenuItem[]>(() => [
    {
      title: 'Export Data',
      icon: 'hugeicons:download-01',
      type: ContextMenuItemType.SUBMENU,
      items: [
        {
          title: 'SQL (INSERT statements)',
          icon: 'hugeicons:code',
          type: ContextMenuItemType.ACTION,
          select: () => onExportTableData(ExportTableDataFormat.SQL),
        },
        {
          title: 'JSON',
          icon: 'hugeicons:file-script',
          type: ContextMenuItemType.ACTION,
          select: () => onExportTableData(ExportTableDataFormat.JSON),
        },
        {
          title: 'CSV',
          icon: 'hugeicons:file-script',
          type: ContextMenuItemType.ACTION,
          select: () => onExportTableData(ExportTableDataFormat.CSV),
        },
      ],
    },
    {
      title: 'Import Data',
      icon: 'hugeicons:upload-01',
      type: ContextMenuItemType.ACTION,
      // select: onImportTableData,
      disabled: true,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    {
      title: 'Generate SQL',
      icon: 'hugeicons:code',
      type: ContextMenuItemType.SUBMENU,
      items: [
        {
          title: 'SELECT',
          icon: 'hugeicons:table',
          type: ContextMenuItemType.ACTION,
          select: onGenSelectSQL,
        },
        {
          title: 'INSERT',
          icon: 'hugeicons:plus-sign',
          type: ContextMenuItemType.ACTION,
          select: onGenInsertSQL,
        },
        {
          title: 'UPDATE',
          icon: 'hugeicons:pencil-edit-02',
          type: ContextMenuItemType.ACTION,
          select: onGenUpdateSQL,
        },
        {
          title: 'DELETE',
          icon: 'hugeicons:delete-01',
          type: ContextMenuItemType.ACTION,
          select: onGenDeleteSQL,
        },
        {
          type: ContextMenuItemType.SEPARATOR,
        },
        {
          title: 'MERGE',
          icon: 'hugeicons:git-merge',
          type: ContextMenuItemType.ACTION,
          select: onGenMergeSQL,
        },
        {
          title: 'INSERT ON CONFLICT',
          icon: 'hugeicons:git-pull-request',
          type: ContextMenuItemType.ACTION,
          select: onGenInsertOnConflictSQL,
        },
        {
          title: 'UPDATE FROM',
          icon: 'hugeicons:arrow-right-01',
          type: ContextMenuItemType.ACTION,
          select: onGenUpdateFromSQL,
        },
        {
          title: 'DELETE USING',
          icon: 'hugeicons:delete-02',
          type: ContextMenuItemType.ACTION,
          select: onGenDeleteUsingSQL,
        },
        {
          type: ContextMenuItemType.SEPARATOR,
        },
        {
          title: 'DDL',
          icon: 'hugeicons:document-code',
          type: ContextMenuItemType.ACTION,
          select: onGenTableDDL,
        },
      ],
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    {
      title: 'Rename...',
      icon: 'hugeicons:pencil-edit-02',
      type: ContextMenuItemType.ACTION,
      select: onRenameTable,
    },
    {
      title: 'Delete',
      icon: 'hugeicons:delete-02',
      type: ContextMenuItemType.ACTION,
      select: onDeleteTable,
    },
    {
      type: ContextMenuItemType.SEPARATOR,
    },
    refreshSchemaOption,
  ]);

  const contextMenuItems = computed<ContextMenuItem[]>(() => {
    if (!selectedItem.value) return [refreshSchemaOption];

    switch (selectedItem.value.tabViewType) {
      case TabViewType.FunctionsDetail:
        return functionMenuItems.value;
      case TabViewType.TableDetail:
        return tableMenuItems.value;
      case TabViewType.ViewDetail:
        return tableMenuItems.value;
      default:
        return [refreshSchemaOption];
    }
  });

  return {
    // State
    selectedItem,
    contextMenuItems,

    // Safe mode dialog
    safeModeLoading,
    safeModeDialogOpen,
    safeModeDialogSQL,
    safeModeDialogType,
    onSafeModeConfirm,
    onSafeModeCancel,

    // Rename dialog
    renameDialogType,
    renameDialogOpen,
    renameDialogValue,
    onConfirmRename,

    // SQL Preview dialog
    sqlPreviewDialogOpen,
    sqlPreviewDialogSQL,
    sqlPreviewDialogTitle,
    isFetching,

    // Handlers
    onRightClickItem,
  };
}
