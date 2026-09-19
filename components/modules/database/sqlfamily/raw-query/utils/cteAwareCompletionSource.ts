import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { CompletionIcon } from '~/components/base/code-editor/constants';
import type { Schema } from '~/core/stores';
import type {
  SchemaColumnMetadata as ColumnShortMetadata,
  SchemaForeignKeyMetadata as ForeignKeyMetadata,
  TableDetailMetadata,
  TableDetails,
  ViewDetails,
} from '~/core/types';
import {
  createColumnCompletion,
  createVariableInfoTooltip,
} from './getMappedSchemaSuggestion';
import {
  extractTableAliasMappings,
  normalizeIdentifier,
  resolveTableInfoByReference,
  SQL_IDENTIFIER_PART,
} from './sqlMetadata';

interface CteAwareCompletionSourceConfig {
  schemas: Schema[] | null | undefined;
  defaultSchemaName?: string;
  fileVariables?: string;
}

interface ResolvedTableDetails {
  tableName: string;
  schemaName: string;
  tableReference: string;
  columns: ColumnShortMetadata[];
  primaryKeyColumns: Set<string>;
  foreignKeysByColumn: Map<string, ForeignKeyMetadata>;
}

const aliasMemberPattern = new RegExp(
  `(${SQL_IDENTIFIER_PART})\\s*\\.\\s*([A-Za-z_][A-Za-z0-9_$]*)?$`
);

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

function isCompletionBlockedNode(node: SyntaxNode): boolean {
  return /Comment|String/.test(node.type.name);
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
  defaultSchemaName?: string;
}): ResolvedTableDetails | null {
  const resolvedTableInfo = resolveTableInfoByReference({
    tableReference,
    schemas,
    defaultSchemaName,
  });

  if (!resolvedTableInfo) {
    return null;
  }

  return toResolvedTableDetails({
    tableReference,
    tableName: resolvedTableInfo.tableName,
    schemaName: resolvedTableInfo.schemaName,
    tableInfo: resolvedTableInfo.tableInfo,
  });
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
  const aliasMappings = extractTableAliasMappings(statementText);
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

function getVariableCompletion(
  context: CompletionContext,
  config: CteAwareCompletionSourceConfig
): CompletionResult | null {
  if (!config.fileVariables) return null;

  const word = context.matchBefore(/:\w*$/);
  if (!word) return null;

  try {
    const varsJson = JSON.parse(config.fileVariables);
    const options: Completion[] = [];

    for (const key in varsJson) {
      options.push({
        label: `:${key}`,
        type: CompletionIcon.Variable,
        boost: 120,
        detail: 'variable',
        info: () => createVariableInfoTooltip(key, varsJson[key]),
        apply(view, completion, from, to) {
          // Adjust from to include the ':' if the match included it
          const beforeChar = view.state.doc.sliceString(from - 1, from);
          const adjustedFrom = beforeChar === ':' ? from - 1 : from;

          view.dispatch({
            changes: {
              from: adjustedFrom,
              to,
              insert: completion.label,
            },
          });
        },
      });
    }

    return {
      from: word.from,
      options,
      validFor: /^:\w*$/,
    };
  } catch (error) {
    return null;
  }
}

export function createCteAwareCompletionSource(
  config: CteAwareCompletionSourceConfig
): CompletionSource {
  return (context: CompletionContext) => {
    // 1. Check for variable completion (starting with :)
    const variableCompletion = getVariableCompletion(context, config);
    if (variableCompletion) return variableCompletion;

    // 2. Fallback to alias/column completion
    const aliasCompletion = getAliasColumnCompletion(context, config);
    return aliasCompletion;
  };
}
