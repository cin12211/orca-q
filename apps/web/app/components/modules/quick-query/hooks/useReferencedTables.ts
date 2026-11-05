import { storeToRefs } from 'pinia';
import { useSchemaStore } from '~/core/stores';

export const useReferencedTables = ({
  schemaName,
  tableName,
}: {
  schemaName: string;
  tableName: string;
}) => {
  const schemaStore = useSchemaStore();
  const { activeReservedSchemas } = storeToRefs(schemaStore);

  const reverseTables = computed(() => {
    const tables = activeReservedSchemas.value || [];

    return tables.find(
      table => table.table === tableName && table.schema === schemaName
    );
  });

  const mapReferencedColumn = computed(() => {
    const referencedColumn = new Map<string, boolean>();

    reverseTables.value?.used_by?.forEach(usedBy => {
      referencedColumn.set(usedBy.referenced_column, true);
    });

    return referencedColumn;
  });

  const isHaveRelationByFieldName = (columnName: string): boolean => {
    return mapReferencedColumn.value.has(columnName);
  };

  return { activeReservedSchemas, reverseTables, isHaveRelationByFieldName };
};
