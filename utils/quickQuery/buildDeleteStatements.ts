export function buildDeleteStatements({
  schemaName,
  tableName,
  pKeys,
  pKeyValue,
}: {
  schemaName: string;
  tableName: string;
  pKeys: string[];
  pKeyValue: Record<string, string>;
}): string {
  // Validate inputs
  if (!tableName || !pKeys?.length) {
    throw new Error('Invalid input: tableName and pKeys are required');
  }

  // Build WHERE clause
  const whereClause = pKeys
    .map(key => `${key} = '${pKeyValue[key]}'`)
    .join(' AND ');

  // Construct final query
  const query = `DELETE FROM ${schemaName}.${tableName} WHERE ${whereClause}`;

  return query;
}

export function buildBulkDeleteStatement({
  schemaName,
  tableName,
  pKeys,
  pKeyValues,
}: {
  schemaName: string;
  tableName: string;
  pKeys: string[];
  pKeyValues: Record<string, string>[];
}): string {
  if (!tableName || !pKeys?.length || !pKeyValues?.length) {
    throw new Error(
      'Invalid input: tableName, pKeys, and pKeyValues are required'
    );
  }

  const valueTuples = pKeyValues.map((row, index) => {
    const tuple = pKeys.map(key => {
      const value = row[key];
      if (value === undefined) {
        throw new Error(`Missing primary key "${key}" in row ${index}`);
      }
      return `'${value.replace(/'/g, "''")}'`; // escape single quotes
    });
    return `(${tuple.join(', ')})`;
  });

  const keysClause = pKeys.length === 1 ? pKeys[0] : `(${pKeys.join(', ')})`;

  return `DELETE FROM ${schemaName}.${tableName} WHERE ${keysClause} IN (${valueTuples.join(', ')});`;
}
