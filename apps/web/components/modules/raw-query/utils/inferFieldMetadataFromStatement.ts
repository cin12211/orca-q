import type { FieldDef } from 'pg';
import type { Schema } from '~/core/stores';
import type {
  DatabaseField,
  SchemaColumnMetadata as ColumnShortMetadata,
  TableDetailMetadata,
} from '~/core/types';
import {
  extractOrderedTableReferences,
  extractTableAliasMappings,
  isSqlAliasStopWord,
  normalizeIdentifier,
  resolveTableInfoByReference,
  splitIdentifierPath,
  SQL_IDENTIFIER_PART,
  stripIdentifierQuotes,
  type ResolvedTableInfo as ResolvedTableDetails,
} from './sqlMetadata';

type RawResultField = FieldDef & Partial<DatabaseField>;

type InferredFieldMetadata = Pick<
  DatabaseField,
  'schemaName' | 'tableName' | 'sourceColumnName'
> & {
  outputName?: string;
};

const directColumnPattern = new RegExp(
  `^${SQL_IDENTIFIER_PART}(?:\\s*\\.\\s*${SQL_IDENTIFIER_PART}){0,2}$`,
  'i'
);

const explicitAliasPattern = new RegExp(
  `^([\\s\\S]*?)(?:\\s+AS\\s+)(${SQL_IDENTIFIER_PART})$`,
  'i'
);

const implicitAliasPattern = new RegExp(
  `^([\\s\\S]*\\S)\\s+(${SQL_IDENTIFIER_PART})$`,
  'i'
);

const tableWildcardPattern = new RegExp(
  `^(${SQL_IDENTIFIER_PART}(?:\\s*\\.\\s*${SQL_IDENTIFIER_PART}){0,2})\\s*\\.\\s*\\*$`,
  'i'
);

function isWordBoundary(char?: string) {
  return !char || !/[A-Za-z0-9_$]/.test(char);
}

function matchesKeyword(sql: string, index: number, keyword: string) {
  const upperKeyword = keyword.toUpperCase();
  const slice = sql.slice(index, index + upperKeyword.length).toUpperCase();

  if (slice !== upperKeyword) {
    return false;
  }

  return (
    isWordBoundary(sql[index - 1]) &&
    isWordBoundary(sql[index + keyword.length])
  );
}

function advanceQuotedOrComment(sql: string, index: number) {
  const char = sql[index];
  const next = sql[index + 1];

  if (char === '-' && next === '-') {
    let cursor = index + 2;

    while (cursor < sql.length && sql[cursor] !== '\n') {
      cursor++;
    }

    return cursor;
  }

  if (char === '/' && next === '*') {
    const endIndex = sql.indexOf('*/', index + 2);
    return endIndex === -1 ? sql.length : endIndex + 2;
  }

  if (char === "'" || char === '"' || char === '`') {
    let cursor = index + 1;

    while (cursor < sql.length) {
      if (sql[cursor] === char) {
        if (sql[cursor + 1] === char) {
          cursor += 2;
          continue;
        }

        return cursor + 1;
      }

      cursor++;
    }

    return sql.length;
  }

  return index + 1;
}

function findTopLevelKeyword(
  sql: string,
  keyword: string,
  startIndex = 0
): number {
  let depth = 0;

  for (let index = startIndex; index < sql.length; ) {
    const char = sql[index];
    const next = sql[index + 1];

    if (
      char === "'" ||
      char === '"' ||
      char === '`' ||
      (char === '-' && next === '-') ||
      (char === '/' && next === '*')
    ) {
      index = advanceQuotedOrComment(sql, index);
      continue;
    }

    if (char === '(') {
      depth++;
      index++;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      index++;
      continue;
    }

    if (depth === 0 && matchesKeyword(sql, index, keyword)) {
      return index;
    }

    index++;
  }

  return -1;
}

function splitTopLevelCommaList(sql: string) {
  const items: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < sql.length; ) {
    const char = sql[index];
    const next = sql[index + 1];

    if (
      char === "'" ||
      char === '"' ||
      char === '`' ||
      (char === '-' && next === '-') ||
      (char === '/' && next === '*')
    ) {
      index = advanceQuotedOrComment(sql, index);
      continue;
    }

    if (char === '(') {
      depth++;
      index++;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      index++;
      continue;
    }

    if (depth === 0 && char === ',') {
      const item = sql.slice(start, index).trim();
      if (item) {
        items.push(item);
      }
      start = index + 1;
    }

    index++;
  }

  const lastItem = sql.slice(start).trim();
  if (lastItem) {
    items.push(lastItem);
  }

  return items;
}

function extractTopLevelSelectItems(statementQuery: string) {
  const selectIndex = findTopLevelKeyword(statementQuery, 'SELECT');
  if (selectIndex === -1) {
    return [];
  }

  const fromIndex = findTopLevelKeyword(
    statementQuery,
    'FROM',
    selectIndex + 6
  );
  if (fromIndex === -1) {
    return [];
  }

  const selectClause = statementQuery.slice(selectIndex + 6, fromIndex);
  return splitTopLevelCommaList(selectClause);
}

function getOrderedColumns(tableInfo: TableDetailMetadata) {
  return [...(tableInfo.columns || [])].sort(
    (left, right) =>
      (left.ordinal_position || 0) - (right.ordinal_position || 0)
  );
}

function findMatchingColumn(
  columns: ColumnShortMetadata[],
  sourceColumnName: string
) {
  const normalizedSourceColumnName = normalizeIdentifier(sourceColumnName);

  return columns.find(
    column => normalizeIdentifier(column.name) === normalizedSourceColumnName
  );
}

function parseSelectItem(selectItem: string) {
  const trimmedItem = selectItem.trim();
  const explicitAliasMatch = explicitAliasPattern.exec(trimmedItem);

  if (explicitAliasMatch) {
    return {
      expression: explicitAliasMatch[1].trim(),
      outputName: stripIdentifierQuotes(explicitAliasMatch[2]),
    };
  }

  if (
    trimmedItem === '*' ||
    tableWildcardPattern.test(trimmedItem) ||
    directColumnPattern.test(trimmedItem)
  ) {
    return {
      expression: trimmedItem,
      outputName: undefined,
    };
  }

  const implicitAliasMatch = implicitAliasPattern.exec(trimmedItem);

  if (implicitAliasMatch) {
    const aliasCandidate = normalizeIdentifier(implicitAliasMatch[2]);

    if (!isSqlAliasStopWord(aliasCandidate)) {
      return {
        expression: implicitAliasMatch[1].trim(),
        outputName: stripIdentifierQuotes(implicitAliasMatch[2]),
      };
    }
  }

  return {
    expression: trimmedItem,
    outputName: undefined,
  };
}

function createColumnMetadata({
  resolvedTableDetails,
  columnName,
  outputName,
}: {
  resolvedTableDetails: ResolvedTableDetails;
  columnName: string;
  outputName?: string;
}): InferredFieldMetadata | undefined {
  const column = findMatchingColumn(
    resolvedTableDetails.tableInfo.columns || [],
    columnName
  );

  if (!column) {
    return undefined;
  }

  return {
    outputName,
    schemaName: resolvedTableDetails.schemaName,
    tableName: resolvedTableDetails.tableName,
    sourceColumnName: column.name,
  };
}

function resolveUnqualifiedColumn({
  sourceColumnName,
  resolvedTables,
  outputName,
}: {
  sourceColumnName: string;
  resolvedTables: ResolvedTableDetails[];
  outputName?: string;
}) {
  const matches = resolvedTables
    .map(resolvedTableDetails =>
      createColumnMetadata({
        resolvedTableDetails,
        columnName: sourceColumnName,
        outputName,
      })
    )
    .filter(Boolean) as InferredFieldMetadata[];

  if (matches.length !== 1) {
    return undefined;
  }

  return matches[0];
}

function resolveColumnReference({
  expression,
  outputName,
  aliasMappings,
  resolvedTables,
  schemas,
}: {
  expression: string;
  outputName?: string;
  aliasMappings: Map<string, string>;
  resolvedTables: ResolvedTableDetails[];
  schemas: Schema[];
}) {
  if (!directColumnPattern.test(expression)) {
    return undefined;
  }

  const parts = splitIdentifierPath(expression);
  if (!parts.length) {
    return undefined;
  }

  const sourceColumnName = stripIdentifierQuotes(parts[parts.length - 1]);

  if (parts.length === 1) {
    return resolveUnqualifiedColumn({
      sourceColumnName,
      resolvedTables,
      outputName,
    });
  }

  const rawTableReference = parts.slice(0, -1).join('.');
  const aliasKey = normalizeIdentifier(parts[parts.length - 2] || parts[0]);
  const tableReference = aliasMappings.get(aliasKey) || rawTableReference;
  const resolvedTableDetails = resolveTableInfoByReference({
    tableReference,
    schemas,
  });

  if (!resolvedTableDetails) {
    return undefined;
  }

  return createColumnMetadata({
    resolvedTableDetails,
    columnName: sourceColumnName,
    outputName,
  });
}

function expandTableWildcard({
  expression,
  aliasMappings,
  schemas,
}: {
  expression: string;
  aliasMappings: Map<string, string>;
  schemas: Schema[];
}) {
  const tableWildcardMatch = tableWildcardPattern.exec(expression);
  if (!tableWildcardMatch) {
    return [];
  }

  const rawTableReference = tableWildcardMatch[1].trim();
  const parts = splitIdentifierPath(rawTableReference);
  const aliasKey = normalizeIdentifier(
    parts[parts.length - 1] || rawTableReference
  );
  const tableReference = aliasMappings.get(aliasKey) || rawTableReference;
  const resolvedTableDetails = resolveTableInfoByReference({
    tableReference,
    schemas,
  });

  if (!resolvedTableDetails) {
    return [];
  }

  return getOrderedColumns(resolvedTableDetails.tableInfo).map(column => ({
    outputName: column.name,
    schemaName: resolvedTableDetails.schemaName,
    tableName: resolvedTableDetails.tableName,
    sourceColumnName: column.name,
  }));
}

function inferFieldMetadata({
  statementQuery,
  schemas,
}: {
  statementQuery: string;
  schemas: Schema[];
}) {
  const aliasMappings = extractTableAliasMappings(statementQuery);
  const resolvedTables = extractOrderedTableReferences(statementQuery)
    .map(tableReference =>
      resolveTableInfoByReference({
        tableReference,
        schemas,
      })
    )
    .filter(Boolean) as ResolvedTableDetails[];

  return extractTopLevelSelectItems(statementQuery).flatMap(selectItem => {
    const { expression, outputName } = parseSelectItem(selectItem);

    if (expression === '*') {
      return resolvedTables.flatMap(resolvedTableDetails =>
        getOrderedColumns(resolvedTableDetails.tableInfo).map(column => ({
          outputName: column.name,
          schemaName: resolvedTableDetails.schemaName,
          tableName: resolvedTableDetails.tableName,
          sourceColumnName: column.name,
        }))
      );
    }

    if (tableWildcardPattern.test(expression)) {
      return expandTableWildcard({
        expression,
        aliasMappings,
        schemas,
      });
    }

    const inferredField = resolveColumnReference({
      expression,
      outputName,
      aliasMappings,
      resolvedTables,
      schemas,
    });

    if (!inferredField) {
      return outputName ? [{ outputName }] : [];
    }

    return [
      {
        ...inferredField,
        outputName: outputName || inferredField.sourceColumnName,
      },
    ];
  });
}

function mergeFieldMetadata(
  field: RawResultField,
  inferredField?: InferredFieldMetadata
) {
  if (!inferredField) {
    return field;
  }

  return {
    ...field,
    schemaName: field.schemaName ?? inferredField.schemaName,
    tableName: field.tableName ?? inferredField.tableName,
    sourceColumnName: field.sourceColumnName ?? inferredField.sourceColumnName,
  } satisfies RawResultField;
}

export function inferFieldMetadataFromStatement({
  fieldDefs,
  statementQuery,
  schemas,
}: {
  fieldDefs: RawResultField[];
  statementQuery?: string;
  schemas: Schema[];
}) {
  if (!fieldDefs.length || !statementQuery || !schemas.length) {
    return fieldDefs;
  }

  const inferredFieldMetadata = inferFieldMetadata({
    statementQuery,
    schemas,
  });

  if (!inferredFieldMetadata.length) {
    return fieldDefs;
  }

  if (inferredFieldMetadata.length === fieldDefs.length) {
    return fieldDefs.map((field, index) =>
      mergeFieldMetadata(field, inferredFieldMetadata[index])
    );
  }

  const inferredByOutputName = new Map<string, InferredFieldMetadata[]>();

  inferredFieldMetadata.forEach(inferredField => {
    const outputName = inferredField.outputName;

    if (!outputName) {
      return;
    }

    const normalizedOutputName = normalizeIdentifier(outputName);
    const existingItems = inferredByOutputName.get(normalizedOutputName) || [];
    existingItems.push(inferredField);
    inferredByOutputName.set(normalizedOutputName, existingItems);
  });

  return fieldDefs.map(field => {
    const normalizedFieldName = normalizeIdentifier(field.name);
    const matchingFields = inferredByOutputName.get(normalizedFieldName);
    const inferredField = matchingFields?.shift();

    return mergeFieldMetadata(field, inferredField);
  });
}
