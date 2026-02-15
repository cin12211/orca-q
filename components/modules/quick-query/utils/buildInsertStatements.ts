export function buildInsertStatements({
  schemaName,
  tableName,
  insertData,
}: {
  schemaName: string;
  tableName: string;
  insertData: Record<string, any>;
}): string {
  // Validate inputs
  if (!tableName || !insertData) {
    throw new Error('Invalid input: tableName, insertData object are required');
  }

  const columnsClause = Object.entries(insertData)
    .map(([column]) => {
      return `"${column}"`;
    })
    .join(', ');

  const valuesClause = Object.values(insertData)
    .map(value => {
      // Handle different value types
      if (value === null) {
        return 'NULL';
      }
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
      }
      return value;
    })
    .join(', ');

  // Construct final query
  const query = `INSERT INTO "${schemaName}"."${tableName}" (${columnsClause}) VALUES (${valuesClause})`;

  return query;
}
