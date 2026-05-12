export function normalizeEditedCellValue({
  fieldType,
  isObjectColumn,
  value,
}: {
  fieldType: string;
  isObjectColumn: boolean;
  value: unknown;
}) {
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
    }

    return Boolean(formattedValue);
  }

  return formattedValue;
}
