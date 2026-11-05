export enum ExportFormat {
  CSV_WITH_HEADER = 'csv-with-header',
  CSV_NO_HEADER = 'csv-no-header',
  JSON = 'json',
  SQL = 'sql',
  TSV = 'tsv',
}

export type ColumnCopyFormat = 'list' | 'json';
