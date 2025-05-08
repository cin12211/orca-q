// TODO: write function to handle for all database types
export function mapPgTypeToTsType(udtName: string): string {
  // Normalize udtName to lowercase to handle case variations
  const normalizedUdtName = udtName.toLowerCase();

  switch (normalizedUdtName) {
    // String types
    case 'char':
    case 'varchar':
    case 'text':
    case 'uuid':
    case 'citext':
      return 'string';

    // Number types
    case 'int2': // smallint
    case 'int4': // integer
    case 'int8': // bigint
    case 'numeric':
    case 'float4': // real
    case 'float8': // double precision
    case 'decimal':
      return 'number';

    // Boolean type
    case 'bool':
      return 'boolean';

    // Common JSON types (often mapped to string or any in TS)
    case 'json':
    case 'jsonb':
      return 'any'; // or 'unknown' depending on your preference

    // Date/Time types (often mapped to string or Date in TS)
    case 'date':
    case 'timestamp':
    case 'timestamptz':
    case 'time':
    case 'timetz':
      return 'string'; // or 'Date' if you prefer Date objects

    // Default for unmapped types
    default:
      return 'unknown';
  }
}
