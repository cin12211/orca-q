export function normalizeEditedCellValue({
  fieldType,
  isObjectColumn,
  value,
}: {
  fieldType: string;
  isObjectColumn: boolean;
  value: unknown;
}) {
  const formattedValue = isObjectColumn ? JSON.stringify(value) : value;

  if (fieldType === 'bool') {
    return Boolean(formattedValue);
  }

  if (
    formattedValue === '' ||
    formattedValue === null ||
    formattedValue === undefined
  ) {
    return null;
  }

  return formattedValue;
}
