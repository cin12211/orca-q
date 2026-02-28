export interface QueryResult {
  result: Record<string, unknown>[];
  queryTime: number;
}

export interface DatabaseField {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
  dataTypeSize: number;
  dataTypeModifier: number;
  format: string;
}

export interface RawQueryResultWithMetadata {
  rows: Record<string, unknown>[];
  fields: DatabaseField[] | any[];
  queryTime: number;
}
