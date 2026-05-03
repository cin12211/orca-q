import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  SchemaColumnMetadata,
  SchemaForeignKeyMetadata,
  SchemaPrimaryKey,
  TableDetailMetadata,
  ViewMetadata,
} from '~/core/types';
import { ViewSchemaEnum } from '~/core/types';
import { resolveMetadataTypeAlias } from '../type-alias.constants';

// ---------------------------------------------------------------------------
// Low-level identifier helpers
// ---------------------------------------------------------------------------

export function escapeSqliteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function quoteSqliteString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function isD1Connection(connection: unknown) {
  return typeof connection === 'string' && connection.startsWith('d1://');
}

function normalizeSqliteIdentifier(value: string) {
  return value.trim().replace(/^["'`\[]|["'`\]]$/g, '');
}

// ---------------------------------------------------------------------------
// CREATE TABLE SQL parser (used by D1 — PRAGMA is blocked)
// ---------------------------------------------------------------------------

function splitTopLevelSql(input: string) {
  const segments: string[] = [];
  let current = '';
  let depth = 0;
  let quote: "'" | '"' | '`' | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    const next = input[index + 1];

    current += char;

    if (quote) {
      if (char === quote) {
        if (quote === "'" && next === "'") {
          current += next;
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === ',' && depth === 0) {
      segments.push(current.slice(0, -1).trim());
      current = '';
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function extractCreateSqlBody(sql: string) {
  const firstParen = sql.indexOf('(');
  if (firstParen === -1) return '';

  let depth = 0;
  let quote: "'" | '"' | '`' | null = null;

  for (let index = firstParen; index < sql.length; index += 1) {
    const char = sql[index]!;
    const next = sql[index + 1];

    if (quote) {
      if (char === quote) {
        if (quote === "'" && next === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) return sql.slice(firstParen + 1, index);
    }
  }

  return '';
}

function parseDefaultValue(definition: string) {
  const match = definition.match(
    /\bdefault\b\s+(.+?)(?=\s+(?:constraint|primary|not|null|unique|check|references|collate|generated)\b|$)/i
  );
  return match?.[1]?.trim() ?? null;
}

function parseInlineReference(definition: string) {
  const match = definition.match(
    /\breferences\b\s+([^\s(]+)\s*(?:\(([^)]+)\))?/i
  );
  if (!match) return null;

  return {
    referencedTable: normalizeSqliteIdentifier(match[1] ?? ''),
    referencedColumn: normalizeSqliteIdentifier(
      match[2]?.split(',')[0] ?? 'id'
    ),
  };
}

function parseColumnDefinition(
  definition: string,
  schema: string,
  ordinalPosition: number
) {
  const trimmed = definition.trim();

  if (
    /^(constraint|primary\s+key|foreign\s+key|unique|check)\b/i.test(trimmed)
  ) {
    return null;
  }

  const nameMatch = trimmed.match(
    /^("[^"]+"|'[^']+'|`[^`]+`|\[[^\]]+\]|[^\s]+)/
  );
  if (!nameMatch) return null;

  const columnName = normalizeSqliteIdentifier(nameMatch[1] ?? '');
  const remainder = trimmed.slice(nameMatch[0].length).trim();
  const typeMatch = remainder.match(
    /^(.*?)(?=\s+(?:constraint|primary|not|null|default|references|unique|check|collate|generated)\b|$)/i
  );
  const rawTypeName = typeMatch?.[1]?.trim() || 'TEXT';
  const defaultValue = parseDefaultValue(remainder);
  const reference = parseInlineReference(remainder);

  return {
    column: {
      raw_type_name: rawTypeName,
      name: columnName,
      ordinal_position: ordinalPosition,
      type: rawTypeName,
      short_type_name: resolveMetadataTypeAlias(
        DatabaseClientType.SQLITE3,
        rawTypeName
      ),
      is_nullable: !/\bnot\s+null\b/i.test(remainder),
      default_value: defaultValue,
    },
    primaryKey: /\bprimary\s+key\b/i.test(remainder)
      ? { column: columnName }
      : null,
    foreignKey: reference
      ? {
          column: columnName,
          referenced_column: reference.referencedColumn,
          referenced_table: reference.referencedTable,
          referenced_table_schema: schema,
        }
      : null,
  };
}

function parseTableConstraint(
  definition: string,
  schema: string
): {
  primaryKeys: SchemaPrimaryKey[];
  foreignKeys: SchemaForeignKeyMetadata[];
} {
  const normalized = definition.replace(/^constraint\s+[^\s]+\s+/i, '').trim();
  const primaryKeyMatch = normalized.match(/^primary\s+key\s*\(([^)]+)\)/i);

  if (primaryKeyMatch) {
    return {
      primaryKeys: primaryKeyMatch[1]!
        .split(',')
        .map(column => ({ column: normalizeSqliteIdentifier(column) })),
      foreignKeys: [],
    };
  }

  const foreignKeyMatch = normalized.match(
    /^foreign\s+key\s*\(([^)]+)\)\s+references\s+([^\s(]+)\s*(?:\(([^)]+)\))?/i
  );

  if (!foreignKeyMatch) {
    return { primaryKeys: [], foreignKeys: [] };
  }

  const localColumns = foreignKeyMatch[1]!
    .split(',')
    .map(normalizeSqliteIdentifier);
  const referencedTable = normalizeSqliteIdentifier(foreignKeyMatch[2] ?? '');
  const referencedColumns = (foreignKeyMatch[3] ?? '')
    .split(',')
    .map(normalizeSqliteIdentifier);

  return {
    primaryKeys: [],
    foreignKeys: localColumns.map((column, index) => ({
      column,
      referenced_column:
        referencedColumns[index] || referencedColumns[0] || 'id',
      referenced_table: referencedTable,
      referenced_table_schema: schema,
    })),
  };
}

export function buildTableDetailFromCreateSql(
  schema: string,
  tableName: string,
  sql: string | null
): TableDetailMetadata {
  const body = extractCreateSqlBody(sql || '');
  const segments = splitTopLevelSql(body);
  const columns: SchemaColumnMetadata[] = [];
  const primaryKeys: SchemaPrimaryKey[] = [];
  const foreignKeys: SchemaForeignKeyMetadata[] = [];

  segments.forEach(segment => {
    const columnDefinition = parseColumnDefinition(
      segment,
      schema,
      columns.length + 1
    );

    if (columnDefinition) {
      columns.push(columnDefinition.column);

      if (
        columnDefinition.primaryKey &&
        !primaryKeys.some(k => k.column === columnDefinition.primaryKey?.column)
      ) {
        primaryKeys.push(columnDefinition.primaryKey);
      }

      if (columnDefinition.foreignKey) {
        foreignKeys.push(columnDefinition.foreignKey);
      }

      return;
    }

    const constraint = parseTableConstraint(segment, schema);

    constraint.primaryKeys.forEach(pk => {
      if (!primaryKeys.some(k => k.column === pk.column)) {
        primaryKeys.push(pk);
      }
    });

    foreignKeys.push(...constraint.foreignKeys);
  });

  return {
    columns,
    foreign_keys: foreignKeys,
    primary_keys: primaryKeys,
    table_id: `${schema}.${tableName}`,
  };
}

export function parseViewColumnsFromCreateSql(
  sql: string | null,
  schema: string,
  viewName: string
): Pick<ViewMetadata, never> & {
  columns: SchemaColumnMetadata[];
  view_id: string;
  type: ViewSchemaEnum;
} {
  const explicitColumnsMatch = sql?.match(
    /create\s+view\s+(?:if\s+not\s+exists\s+)?(?:[^\s(]+\s*)\(([^)]+)\)/i
  );

  const columns = explicitColumnsMatch
    ? explicitColumnsMatch[1]!
        .split(',')
        .map(normalizeSqliteIdentifier)
        .filter(Boolean)
        .map((name, index) => ({
          raw_type_name: 'TEXT',
          name,
          ordinal_position: index + 1,
          type: 'TEXT',
          short_type_name: resolveMetadataTypeAlias(
            DatabaseClientType.SQLITE3,
            'TEXT'
          ),
          is_nullable: true,
          default_value: null,
        }))
    : [];

  return {
    columns,
    view_id: `${schema}.${viewName}`,
    type: ViewSchemaEnum.View,
  };
}
