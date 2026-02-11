import { useAppContext } from '~/core/contexts';

export const useReferencedTables = ({
  schemaName,
  tableName,
}: {
  schemaName: string;
  tableName: string;
}) => {
  const { schemaStore } = useAppContext();
  const { reservedSchemas } = toRefs(schemaStore);

  const reverseTables = computed(() => {
    const tables = reservedSchemas.value || [];

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

  return { reservedSchemas, reverseTables, isHaveRelationByFieldName };
};
