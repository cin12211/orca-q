export function normalizeEditedCellValue({
  fieldType,
  isObjectColumn,
  value,
}: {
  fieldType: string;
  isObjectColumn: boolean;
  value: unknown;
}) {
  const isArrayColumn = fieldType.trim().endsWith('[]');

  if (isArrayColumn) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return JSON.parse(value);
    }
  }

  const formattedValue =
    isObjectColumn && typeof value !== 'string' ? JSON.stringify(value) : value;

  if (
    formattedValue === '' ||
    formattedValue === null ||
    formattedValue === undefined
  ) {
    return null;
  }

  if (fieldType === 'bool') {
    if (typeof formattedValue === 'string') {
      const normalized = formattedValue.trim().toLowerCase();

      if (normalized === 'true') {
        return true;
      }

      if (normalized === 'false') {
        return false;
      }

      if (normalized === '1') {
        return true;
      }

      if (normalized === '0') {
        return false;
      }
    }

    if (formattedValue === 1) {
      return true;
    }

    if (formattedValue === 0) {
      return false;
    }

    return formattedValue;
  }

  return formattedValue;
}
