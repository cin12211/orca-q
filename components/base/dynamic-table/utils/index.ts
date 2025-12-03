export * from './calculateColumnWidths';

export interface RowData {
  [key: string]: unknown;
}

export const cellValueFormatter = (content: unknown, type?: string): string => {
  if (content === null) {
    return 'NULL';
  }

  // const isJsonType = type === 'jsonb' || type === 'json';
  // const isObjectType =
  //   (typeof content === 'object' ||
  //     Object.prototype.toString.call(content) === '[object Object]') &&
  //   content !== null;

  // if (isJsonType || isObjectType) {
  //   return content ? JSON.stringify(content, null, 2) : '';
  // }

  return (content || '') as string;
};
