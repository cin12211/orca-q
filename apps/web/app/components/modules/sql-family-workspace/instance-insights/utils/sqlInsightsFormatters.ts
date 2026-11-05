export const compactSql = (sql: string | null | undefined) => {
  if (!sql) return '-';
  const normalized = sql.replace(/\s+/g, ' ').trim();
  if (!normalized) return '-';
  return normalized.length > 320
    ? `${normalized.slice(0, 320)}...`
    : normalized;
};

export const isIdleInTransaction = (stateText: string | null | undefined) =>
  (stateText || '').toLowerCase().includes('idle in transaction');
