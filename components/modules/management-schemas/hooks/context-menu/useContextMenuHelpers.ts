import { toRaw, toRef } from 'vue';
import type { FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import type {
  ColumnShortMetadata,
  TableDetailMetadata,
} from '~/server/api/get-schema-meta-data';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import type { ContextMenuState, SchemaContextMenuOptions } from './types';

export function useContextMenuHelpers(
  options: SchemaContextMenuOptions,
  state: ContextMenuState
) {
  const appLayoutStore = useAppLayoutStore();
  const safeModeEnabled = toRef(appLayoutStore, 'quickQuerySafeModeEnabled');
  const safeModeLoading = ref(false);

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
    state.selectedItem.value = toRaw(item.value);
  };

  /**
   * Show SQL in preview dialog
   */
  const showSqlPreview = (sql: string, title: string) => {
    state.sqlPreviewDialogSQL.value = sql;
    state.sqlPreviewDialogTitle.value = title;
    state.sqlPreviewDialogOpen.value = true;
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
      state.safeModeDialogSQL.value = sql;
      state.safeModeDialogType.value = type;
      state.pendingAction.value = action;
      state.safeModeDialogOpen.value = true;
    } else {
      await action();
    }
  };

  /**
   * Confirm safe mode action
   */
  const onSafeModeConfirm = async () => {
    if (state.pendingAction.value) {
      safeModeLoading.value = true;
      await state.pendingAction.value();
      safeModeLoading.value = false;
      state.pendingAction.value = null;
    }
    state.safeModeDialogOpen.value = false;
  };

  /**
   * Cancel safe mode action
   */
  const onSafeModeCancel = () => {
    state.pendingAction.value = null;
    state.safeModeDialogOpen.value = false;
  };

  return {
    getSchemaName,
    getTableMetadata,
    getTableColumnsMetadata,
    getTableColumns,
    getPrimaryKeyColumns,
    getColumnPlaceholder,
    onRightClickItem,
    showSqlPreview,
    executeWithSafeMode,
    onSafeModeConfirm,
    onSafeModeCancel,
    safeModeLoading,
  };
}
