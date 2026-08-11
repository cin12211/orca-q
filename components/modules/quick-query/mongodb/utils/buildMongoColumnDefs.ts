import type { ColDef } from 'ag-grid-community';
import type { MongoDocument } from '../types';

function formatCellValue(value: unknown): unknown {
  if (value !== null && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

export function buildMongoColumnDefs(documents: MongoDocument[]): ColDef[] {
  const orderedFields: string[] = [];
  const seen = new Set<string>();

  for (const document of documents) {
    for (const key of Object.keys(document)) {
      if (key === '_id' || seen.has(key)) continue;
      seen.add(key);
      orderedFields.push(key);
    }
  }

  const idColumn: ColDef = { field: '_id', headerName: '_id' };
  const otherColumns: ColDef[] = orderedFields.map(field => ({
    field,
    headerName: field,
    valueGetter: params => formatCellValue(params.data?.[field]),
  }));

  return [idColumn, ...otherColumns];
}
