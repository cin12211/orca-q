import type { ColDef } from 'ag-grid-community';
import type { MongoDocument } from '../types';

function formatCellValue(value: unknown): unknown {
  if (value !== null && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function isJsonValue(value: unknown): boolean {
  return value !== null && typeof value === 'object';
}

export function buildMongoColumnDefs(documents: MongoDocument[]): ColDef[] {
  const orderedFields: string[] = [];
  const seen = new Set<string>();
  const jsonFields = new Set<string>();

  for (const document of documents) {
    for (const key of Object.keys(document)) {
      if (key === '_id') continue;
      if (!seen.has(key)) {
        seen.add(key);
        orderedFields.push(key);
      }
      if (isJsonValue(document[key])) {
        jsonFields.add(key);
      }
    }
  }

  const idColumn: ColDef = { field: '_id', headerName: '_id' };
  const otherColumns: ColDef[] = orderedFields.map(field => {
    const isJsonField = jsonFields.has(field);

    return {
      field,
      headerName: field,
      valueGetter: params => formatCellValue(params.data?.[field]),
      ...(isJsonField
        ? {
            editable: true,
            // View-only: open AgJsonCellEditor for readability, never commit the edit.
            cellEditorSelector: () => ({
              component: 'AgJsonCellEditor',
              popup: true,
              popupPosition: 'under',
            }),
            valueSetter: () => false,
          }
        : {}),
    };
  });

  return [idColumn, ...otherColumns];
}
