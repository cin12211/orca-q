import type { Schema } from '~/core/stores';
import type { TableDetailMetadata } from '~/core/types';

export type ResolvedTableInfo = {
  schemaName: string;
  tableName: string;
  tableInfo: TableDetailMetadata;
};

export const SQL_IDENTIFIER_PART =
  '(?:`[^`]+`|"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)';

const TABLE_REFERENCE_PATTERN = `\\b(?:FROM|JOIN)\\s+(${SQL_IDENTIFIER_PART}(?:\\s*\\.\\s*${SQL_IDENTIFIER_PART})*)(?:\\s+(?:AS\\s+)?(${SQL_IDENTIFIER_PART}))?`;

const SQL_ALIAS_STOP_WORDS = new Set([
  'all',
  'cross',
  'except',
  'fetch',
  'for',
  'from',
  'full',
  'group',
  'having',
  'inner',
  'intersect',
  'join',
  'left',
  'limit',
  'offset',
  'on',
  'order',
  'outer',
  'right',
  'select',
  'union',
  'where',
]);

export function isSqlAliasStopWord(identifier: string) {
  return SQL_ALIAS_STOP_WORDS.has(normalizeIdentifier(identifier));
}

export function stripIdentifierQuotes(identifier: string): string {
  const trimmed = identifier.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }

  if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
    return trimmed.slice(1, -1).replace(/``/g, '`');
  }

  return trimmed;
}

export function normalizeIdentifier(identifier: string): string {
  if (!identifier) {
    return '';
  }

  const trimmed = identifier.trim();
  const unquoted = stripIdentifierQuotes(trimmed);

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return unquoted;
  }

  return unquoted.toLowerCase();
}

export function splitIdentifierPath(reference: string): string[] {
  if (!reference) {
    return [];
  }

  const parts: string[] = [];
  let current = '';
  let quoteChar: '"' | '`' | null = null;

  for (let index = 0; index < reference.length; index++) {
    const char = reference[index];

    if (quoteChar) {
      current += char;

      if (char === quoteChar && reference[index + 1] === quoteChar) {
        current += reference[index + 1];
        index++;
        continue;
      }

      if (char === quoteChar) {
        quoteChar = null;
      }

      continue;
    }

    if (char === '"' || char === '`') {
      quoteChar = char;
      current += char;
      continue;
    }

    if (char === '.') {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

export function findTableInfoByName({
  schemas,
  tableName,
  schemaName,
}: {
  schemas: Schema[] | null | undefined;
  tableName?: string;
  schemaName?: string;
}): ResolvedTableInfo | undefined {
  if (!schemas?.length || !tableName) {
    return undefined;
  }

  const normalizedTableName = normalizeIdentifier(tableName);
  const normalizedSchemaName = schemaName
    ? normalizeIdentifier(schemaName)
    : undefined;

  for (const schema of schemas) {
    if (
      normalizedSchemaName &&
      normalizeIdentifier(schema.name) !== normalizedSchemaName
    ) {
      continue;
    }

    for (const [key, tableInfo] of Object.entries(schema.tableDetails || {})) {
      if (normalizeIdentifier(key) === normalizedTableName) {
        return {
          schemaName: schema.name,
          tableName: key,
          tableInfo,
        };
      }
    }
  }

  return undefined;
}

export function resolveTableInfoByReference({
  tableReference,
  schemas,
  defaultSchemaName,
}: {
  tableReference: string;
  schemas: Schema[] | null | undefined;
  defaultSchemaName?: string;
}): ResolvedTableInfo | undefined {
  if (!schemas?.length) {
    return undefined;
  }

  const normalizedParts = splitIdentifierPath(tableReference).map(part =>
    normalizeIdentifier(part)
  );

  if (!normalizedParts.length) {
    return undefined;
  }

  const normalizedTableName = normalizedParts[normalizedParts.length - 1];
  const normalizedSchemaName =
    normalizedParts.length > 1
      ? normalizedParts[normalizedParts.length - 2]
      : undefined;

  if (normalizedSchemaName) {
    const exactTableInfo = findTableInfoByName({
      schemas,
      tableName: normalizedTableName,
      schemaName: normalizedSchemaName,
    });

    if (exactTableInfo) {
      return exactTableInfo;
    }
  }

  if (defaultSchemaName) {
    const defaultTableInfo = findTableInfoByName({
      schemas,
      tableName: normalizedTableName,
      schemaName: defaultSchemaName,
    });

    if (defaultTableInfo) {
      return defaultTableInfo;
    }
  }

  return findTableInfoByName({
    schemas,
    tableName: normalizedTableName,
  });
}

function forEachTableReference(
  statementText: string,
  visitor: (match: { tableReference?: string; rawAlias?: string }) => void
) {
  const tableReferencePattern = new RegExp(TABLE_REFERENCE_PATTERN, 'gi');
  let match = tableReferencePattern.exec(statementText);

  while (match !== null) {
    visitor({
      tableReference: match[1]?.trim(),
      rawAlias: match[2],
    });
    match = tableReferencePattern.exec(statementText);
  }
}

export function extractTableAliasMappings(statementText: string) {
  const aliasMappings = new Map<string, string>();

  forEachTableReference(statementText, ({ tableReference, rawAlias }) => {
    if (!tableReference) {
      return;
    }

    const tableParts = splitIdentifierPath(tableReference);
    const tableName = tableParts.at(-1);

    if (tableName) {
      aliasMappings.set(normalizeIdentifier(tableName), tableReference);
    }

    if (!rawAlias) {
      return;
    }

    const normalizedAlias = normalizeIdentifier(rawAlias);

    if (!SQL_ALIAS_STOP_WORDS.has(normalizedAlias)) {
      aliasMappings.set(normalizedAlias, tableReference);
    }
  });

  return aliasMappings;
}

export function extractOrderedTableReferences(statementText: string) {
  const orderedReferences: string[] = [];
  const seenReferences = new Set<string>();

  forEachTableReference(statementText, ({ tableReference }) => {
    if (!tableReference || seenReferences.has(tableReference)) {
      return;
    }

    seenReferences.add(tableReference);
    orderedReferences.push(tableReference);
  });

  return orderedReferences;
}
