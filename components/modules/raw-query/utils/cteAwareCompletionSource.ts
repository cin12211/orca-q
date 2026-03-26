import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import type { Schema } from '~/core/stores';
import type {
  SchemaColumnMetadata as ColumnShortMetadata,
  SchemaForeignKeyMetadata as ForeignKeyMetadata,
  TableDetailMetadata,
  TableDetails,
  ViewDetails,
} from '~/core/types';
import { createColumnCompletion } from './getMappedSchemaSuggestion';

interface CteAwareCompletionSourceConfig {
  schemas: Schema[] | null | undefined;
  defaultSchemaName: string;
}

interface ResolvedTableDetails {
  tableName: string;
  schemaName: string;
  tableReference: string;
  columns: ColumnShortMetadata[];
  primaryKeyColumns: Set<string>;
  foreignKeysByColumn: Map<string, ForeignKeyMetadata>;
}

const SQL_IDENTIFIER_PART = '(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)';
const aliasMemberPattern = new RegExp(
  `(${SQL_IDENTIFIER_PART})\\s*\\.\\s*([A-Za-z_][A-Za-z0-9_$]*)?$`
);
const tableAliasPattern = new RegExp(
  `\\b(?:FROM|JOIN)\\s+(${SQL_IDENTIFIER_PART}(?:\\s*\\.\\s*${SQL_IDENTIFIER_PART})*)(?:\\s+(?:AS\\s+)?(${SQL_IDENTIFIER_PART}))?`,
  'gi'
);

const aliasStopWords = new Set([
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

function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed.toLowerCase();
}

function splitIdentifierPath(reference: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < reference.length; i++) {
    const char = reference[i];

    if (char === '"') {
      current += char;

      // Handle escaped quotes inside quoted identifiers ("")
      if (inQuotes && reference[i + 1] === '"') {
        current += reference[i + 1];
        i++;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === '.') {
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

function findCurrentStatementNode(
  state: EditorState,
  pos: number
): SyntaxNode | null {
  const tree = syntaxTree(state);
  let node: SyntaxNode | null = tree.resolveInner(pos, -1);

  while (node) {
    if (node.type.name === 'Statement') {
      return node;
    }
    node = node.parent;
  }

  return null;
}

function extractAliasMappings(statementText: string): Map<string, string> {
  const aliasMappings = new Map<string, string>();
  let match = tableAliasPattern.exec(statementText);

  while (match !== null) {
    const tableReference = match[1];
    const rawAlias = match[2];

    if (tableReference) {
      const tableParts = splitIdentifierPath(tableReference);
      const tableName = tableParts.at(-1);

      if (tableName) {
        aliasMappings.set(normalizeIdentifier(tableName), tableReference);
      }

      if (rawAlias) {
        const normalizedAlias = normalizeIdentifier(rawAlias);
        if (!aliasStopWords.has(normalizedAlias)) {
          aliasMappings.set(normalizedAlias, tableReference);
        }
      }
    }

    match = tableAliasPattern.exec(statementText);
  }

  return aliasMappings;
}

function isCompletionBlockedNode(node: SyntaxNode): boolean {
  return /Comment|String/.test(node.type.name);
}

function findColumnsInSchema(
  schema: Schema,
  normalizedTableName: string
): {
  tableName: string;
  schemaName: string;
  tableInfo: TableDetailMetadata;
} | null {
  if (!schema.tableDetails) {
    return null;
  }

  for (const [tableName, tableInfo] of Object.entries(schema.tableDetails)) {
    if (normalizeIdentifier(tableName) === normalizedTableName) {
      return { tableName, schemaName: schema.name, tableInfo };
    }
  }

  return null;
}

function toResolvedTableDetails({
  tableReference,
  tableName,
  schemaName,
  tableInfo,
}: {
  tableReference: string;
  tableName: string;
  schemaName: string;
  tableInfo: TableDetailMetadata;
}): ResolvedTableDetails {
  return {
    tableName,
    schemaName,
    tableReference,
    columns: tableInfo.columns || [],
    primaryKeyColumns: new Set(
      tableInfo.primary_keys?.map(primaryKey => primaryKey.column) || []
    ),
    foreignKeysByColumn: new Map(
      tableInfo.foreign_keys?.map(foreignKey => [
        foreignKey.column,
        foreignKey,
      ]) || []
    ),
  };
}

function resolveColumnsByTableReference({
  tableReference,
  schemas,
  defaultSchemaName,
}: {
  tableReference: string;
  schemas: Schema[] | null | undefined;
  defaultSchemaName: string;
}): ResolvedTableDetails | null {
  if (!schemas?.length) {
    return null;
  }

  const normalizedParts = splitIdentifierPath(tableReference).map(part =>
    normalizeIdentifier(part)
  );

  if (!normalizedParts.length) {
    return null;
  }

  const normalizedTableName = normalizedParts[normalizedParts.length - 1];
  const normalizedSchemaName =
    normalizedParts.length > 1
      ? normalizedParts[normalizedParts.length - 2]
      : undefined;

  if (normalizedSchemaName) {
    const exactSchema = schemas.find(
      schema => normalizeIdentifier(schema.name) === normalizedSchemaName
    );
    if (exactSchema) {
      const exactTableInfo = findColumnsInSchema(
        exactSchema,
        normalizedTableName
      );
      if (exactTableInfo) {
        return toResolvedTableDetails({
          tableReference,
          tableName: exactTableInfo.tableName,
          schemaName: exactTableInfo.schemaName,
          tableInfo: exactTableInfo.tableInfo,
        });
      }
    }
  }

  const normalizedDefaultSchema = normalizeIdentifier(defaultSchemaName);
  if (normalizedDefaultSchema) {
    const defaultSchema = schemas.find(
      schema => normalizeIdentifier(schema.name) === normalizedDefaultSchema
    );
    if (defaultSchema) {
      const defaultTableInfo = findColumnsInSchema(
        defaultSchema,
        normalizedTableName
      );
      if (defaultTableInfo) {
        return toResolvedTableDetails({
          tableReference,
          tableName: defaultTableInfo.tableName,
          schemaName: defaultTableInfo.schemaName,
          tableInfo: defaultTableInfo.tableInfo,
        });
      }
    }
  }

  for (const schema of schemas) {
    const tableInfo = findColumnsInSchema(schema, normalizedTableName);
    if (tableInfo) {
      return toResolvedTableDetails({
        tableReference,
        tableName: tableInfo.tableName,
        schemaName: tableInfo.schemaName,
        tableInfo: tableInfo.tableInfo,
      });
    }
  }

  return null;
}

function buildColumnCompletions(
  resolvedTableDetails: ResolvedTableDetails
): Completion[] {
  const orderedColumns = [...resolvedTableDetails.columns].sort(
    (a, b) => (a.ordinal_position || 0) - (b.ordinal_position || 0)
  );

  return orderedColumns.map(column =>
    createColumnCompletion({
      column,
      tableName: resolvedTableDetails.tableName,
      schemaName: resolvedTableDetails.schemaName,
      isPrimaryKey: resolvedTableDetails.primaryKeyColumns.has(column.name),
      foreignKey: resolvedTableDetails.foreignKeysByColumn.get(column.name),
    })
  );
}

function getAliasColumnCompletion(
  context: CompletionContext,
  config: CteAwareCompletionSourceConfig
): CompletionResult | null {
  const nodeAtCursor = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (isCompletionBlockedNode(nodeAtCursor)) {
    return null;
  }

  const statementNode = findCurrentStatementNode(context.state, context.pos);
  if (!statementNode) {
    return null;
  }

  const statementBeforeCursor = context.state.doc.sliceString(
    statementNode.from,
    context.pos
  );
  const aliasMatch = aliasMemberPattern.exec(statementBeforeCursor);
  if (!aliasMatch) {
    return null;
  }

  const rawAlias = aliasMatch[1];
  const columnPrefix = aliasMatch[2] || '';
  const normalizedAlias = normalizeIdentifier(rawAlias);

  const statementText = context.state.doc.sliceString(
    statementNode.from,
    statementNode.to
  );
  const aliasMappings = extractAliasMappings(statementText);
  const tableReference = aliasMappings.get(normalizedAlias) || rawAlias;

  const resolvedTableDetails = resolveColumnsByTableReference({
    tableReference,
    schemas: config.schemas,
    defaultSchemaName: config.defaultSchemaName,
  });

  if (!resolvedTableDetails) {
    return null;
  }

  return {
    from: context.pos - columnPrefix.length,
    options: buildColumnCompletions(resolvedTableDetails),
    validFor: /^[A-Za-z0-9_$]*$/,
  };
}

export function createCteAwareCompletionSource(
  config: CteAwareCompletionSourceConfig
): CompletionSource {
  return (context: CompletionContext) => {
    const aliasCompletion = getAliasColumnCompletion(context, config);
    return aliasCompletion;
  };
}
