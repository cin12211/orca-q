export interface MongoExportFileNameContext {
  collection: string;
  database?: string;
  format: 'json' | 'csv';
}

export function resolveMongoExportFileName(
  template: string | undefined,
  context: MongoExportFileNameContext
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const timestampStr = String(now.getTime());

  const trimmed = (template ?? '').trim();
  const pattern = trimmed || '{collection}_{timestamp}_export';

  let resolved = pattern
    .replace(/\{collection\}/gi, context.collection || 'collection')
    .replace(/\{database\}/gi, context.database || 'database')
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{timestamp\}/gi, timestampStr);

  // Remove trailing .json or .csv if user included it in template
  resolved = resolved.replace(/\.(json|csv)$/i, '');
  // Sanitize path separators or illegal filename characters
  resolved = resolved.replace(/[/\\?%*:|"<>]/g, '_').trim();

  const finalName =
    resolved || `${context.collection || 'collection'}_${timestampStr}_export`;
  return `${finalName}.${context.format}`;
}
