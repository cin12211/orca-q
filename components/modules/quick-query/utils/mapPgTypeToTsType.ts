export function mapPgTypeToTsType(udtName: string): string {
  // Normalize udtName to lowercase to handle case variations
  const normalizedUdtName = udtName.toLowerCase();

  if (normalizedUdtName.startsWith('_')) {
    // Array types (e.g., _text, _int4)
    // defined recursively or just return typed array string
    const singularType = mapPgTypeToTsType(normalizedUdtName.substring(1));
    return `${singularType}[]`;
  }

  switch (normalizedUdtName) {
    // String types
    case 'char':
    case 'varchar':
    case 'text':
    case 'uuid':
    case 'citext':
    case 'money':
    case 'inet':
    case 'cidr':
    case 'macaddr':
    case 'macaddr8':
    case 'tsvector':
    case 'tsquery':
    case 'xml':
    case 'bytea':
      return 'string';

    // Number types
    case 'int2': // smallint
    case 'int4': // integer
    case 'int8': // bigint
    case 'numeric':
    case 'float4': // real
    case 'float8': // double precision
    case 'decimal':
    case 'oid':
      return 'number';

    // Boolean type
    case 'bool':
    case 'boolean':
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
    case 'interval':
      return 'string'; // or 'Date' if you prefer Date objects

    // Bit strings
    case 'bit':
    case 'varbit':
      return 'string';

    // Default for unmapped types
    default:
      return 'unknown';
  }
}
