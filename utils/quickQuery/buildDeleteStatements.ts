export function buildDeleteStatements({
  tableName,
  pKeys,
  pKeyValue,
}: {
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
  const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;

  return query;
}
