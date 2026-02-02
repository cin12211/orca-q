import { useAppContext } from '~/shared/contexts/useAppContext';
import { TabViewType } from '~/shared/stores';

export const useQuickQueryTableInfo = ({
  tableName,
  schemaName,
  connectionId,
  tabViewType,
}: {
  tableName: string;
  schemaName: string;
  connectionId: string;
  tabViewType?: TabViewType | null;
}) => {
  const { schemaStore } = useAppContext();

  const { schemas } = toRefs(schemaStore);

  const activeSchema = computed(() => {
    return schemas.value.find(
      s => s.name === schemaName && s.connectionId === connectionId
    );
  });

  // Check tableDetails first, then viewDetails for views
  const tableMetaData = computed(() => {
    switch (tabViewType) {
      case TabViewType.TableDetail:
        return activeSchema.value?.tableDetails?.[tableName];
      case TabViewType.ViewDetail: {
        const view = activeSchema.value?.viewDetails?.[tableName];
        // ViewDetailMetadata has columns but no foreign_keys/primary_keys
        return {
          columns: view?.columns,
          foreign_keys: [],
          primary_keys: [],
          table_id: view?.view_id,
        };
        // return activeSchema.value?.viewDetails?.[tableName];
      }

      default:
        return null;
    }
  });

  // Check if this is a view (no mutations allowed)
  const isVirtualTable = computed(() => {
    return tabViewType === TabViewType.ViewDetail;
  });

  const columnNames = computed(() => {
    return tableMetaData.value?.columns?.map(c => c.name) || [];
  });

  const foreignKeyColumns = computed(() =>
    (tableMetaData.value?.foreign_keys || []).map(fk => fk.column)
  );

  const foreignKeys = computed(() => tableMetaData.value?.foreign_keys || []);

  const primaryKeyColumns = computed(() =>
    (tableMetaData.value?.primary_keys || []).map(fk => fk.column)
  );

  const columnTypes = computed(() => {
    return (
      tableMetaData.value?.columns?.map(c => ({
        name: c.name,
        type: c.short_type_name,
      })) || []
    );
  });

  return {
    primaryKeyColumns,
    foreignKeys,
    columnNames,
    tableMetaData,
    columnTypes,
    foreignKeyColumns,
    isVirtualTable,
  };
};
