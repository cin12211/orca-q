import { render, h } from 'vue';
import type { Completion } from '@codemirror/autocomplete';
import type { SQLNamespace } from '@codemirror/lang-sql';
import { CompletionIcon } from '~/components/base/code-editor/constants';
import type { TableDetailMetadata } from '~/server/api/get-schema-meta-data';
import type { Schema } from '~/shared/stores';
import SuggestionTableInfo from '../components/SuggestionTableInfo.vue';
import SuggetionColumnInfo from '../components/SuggetionColumnInfo.vue';

/**
 * Hierarchical schema structure for SQL completion
 */
export interface HierarchicalSchemaCompletion {
  [schemaName: string]: SQLNamespace;
}

/**
 * Result type for mappedSchemaSuggestion
 */
export interface MappedSchemaSuggestion {
  schema: HierarchicalSchemaCompletion;
  variableCompletions: Completion[];
  defaultSchema?: string;
}

/**
 * Generates a short alias for a table name
 * e.g., "user_orders" -> "uo", "UserOrders" -> "uo"
 */
export function generateTableAlias(tableName: string): string {
  // convert to lowercase
  let name = tableName.toLowerCase();

  // remove prefix like 'tbl_', 'table_'
  const prefixes = ['tbl_', 'table_'];
  for (const prefix of prefixes) {
    if (name?.startsWith(prefix)) {
      name = name.slice(prefix.length);
    }
  }

  // remote extra suffix like '_v1', '_2023'
  name = name.replace(/(_v\d+|_\d+)$/, '');

  // split by _ or -
  let words = name.split(/[_-]/);

  // parser camelCase/PascalCase
  if (words.length === 1) {
    words = name.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)/g) || [name];
  }

  // get the first letter of each word
  let alias = words
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('');

  if (!alias && name) {
    alias = name[0];
  }

  return alias;
}

/**
 * Creates an HTML tooltip for table information using Vue render
 */
export function createTableInfoTooltip(
  tableName: string,
  tableInfo: TableDetailMetadata,
  schemaName?: string
): HTMLElement {
  const container = document.createElement('div');

  const pkColumns = tableInfo.primary_keys?.map(pk => pk.column) || [];
  const fkColumns = tableInfo.foreign_keys?.map(fk => fk.column) || [];

  // Use Vue's render function to mount the SuggestionTableInfo component
  const vnode = h(SuggestionTableInfo, {
    tableName,
    columns: tableInfo.columns,
    pkColumns,
    fkColumns,
    schemaName,
  });

  render(vnode, container);

  return container;
}

/**
 * Creates an HTML tooltip for column information using Vue render
 */
export function createColumnInfoTooltip(
  columnName: string,
  dataType: string,
  tableName: string,
  isPrimaryKey: boolean,
  foreignKey?: { referenced_table: string; referenced_column: string },
  schemaName?: string
): HTMLElement {
  const container = document.createElement('div');

  // Use Vue's render function to mount the SuggetionColumnInfo component
  const vnode = h(SuggetionColumnInfo, {
    columnName,
    dataType,
    tableName: schemaName ? `${schemaName}.${tableName}` : tableName,
    isPrimaryKey,
    foreignKey,
  });

  render(vnode, container);

  return container;
}

/**
 * Maps column data type to appropriate CompletionIcon
 */
function getColumnTypeIcon(typeName: string): CompletionIcon {
  const lowerType = typeName.toLowerCase();

  // Numeric types
  if (
    lowerType.includes('int') ||
    lowerType.includes('numeric') ||
    lowerType.includes('decimal') ||
    lowerType.includes('float') ||
    lowerType.includes('double') ||
    lowerType.includes('real') ||
    lowerType.includes('serial') ||
    lowerType.includes('money')
  ) {
    return CompletionIcon.Numberic;
  }

  // String types
  if (
    lowerType.includes('char') ||
    lowerType.includes('text') ||
    lowerType.includes('varchar') ||
    lowerType.includes('string') ||
    lowerType.includes('uuid') ||
    lowerType.includes('citext')
  ) {
    return CompletionIcon.String;
  }

  // Date/Time types
  if (
    lowerType.includes('date') ||
    lowerType.includes('time') ||
    lowerType.includes('timestamp') ||
    lowerType.includes('interval')
  ) {
    return CompletionIcon.Calendar;
  }

  // Array/JSON types
  if (
    lowerType.includes('array') ||
    lowerType.includes('json') ||
    lowerType.includes('jsonb') ||
    lowerType.includes('[]')
  ) {
    return CompletionIcon.Brackets;
  }

  // Vector types
  if (lowerType.includes('vector')) {
    return CompletionIcon.Vector;
  }

  // Default to Field
  return CompletionIcon.Field;
}

/**
 * Creates a combined completion configuration with all enhancements
 * Supports multiple schemas from a connection
 * Returns a hierarchical structure with self/children pattern
 */
export function mappedSchemaSuggestion({
  schemas,
  defaultSchemaName = 'public',
  fileVariables,
}: {
  schemas: Schema[] | null | undefined;
  defaultSchemaName?: string;
  fileVariables?: string;
}): MappedSchemaSuggestion {
  const hierarchicalSchema: HierarchicalSchemaCompletion = {};

  if (schemas && schemas.length > 0) {
    for (const schema of schemas) {
      if (!schema.tableDetails) continue;

      const schemaName = schema.name;
      const tableChildren: Record<string, SQLNamespace> = {};

      for (const tableName in schema.tableDetails) {
        const tableInfo = schema.tableDetails[tableName];
        const columnChildren: Record<string, SQLNamespace> = {};

        // Build primary key and foreign key lookup
        const pkColumns = new Set(
          tableInfo.primary_keys?.map(pk => pk.column) || []
        );
        const fkMap = new Map(
          tableInfo.foreign_keys?.map(fk => [fk.column, fk]) || []
        );

        // Process columns
        for (const col of tableInfo.columns) {
          const isPrimaryKey = pkColumns.has(col.name);
          const foreignKey = fkMap.get(col.name);

          // Determine icon type based on column role and data type
          let columnType: CompletionIcon;
          if (isPrimaryKey) {
            columnType = CompletionIcon.Keyword;
          } else if (foreignKey) {
            columnType = CompletionIcon.ForeignKey;
          } else {
            columnType = getColumnTypeIcon(col.short_type_name);
          }

          columnChildren[col.name] = {
            self: {
              label: col.name,
              type: columnType,
              detail: col.short_type_name,
              boost: -col.ordinal_position,
              info: () =>
                createColumnInfoTooltip(
                  col.name,
                  col.short_type_name,
                  tableName,
                  isPrimaryKey,
                  foreignKey,
                  schemaName
                ),
            },
            children: {},
          };
        }

        // Add wildcard completion for all columns
        columnChildren['*'] = {
          self: {
            label: '*',
            type: CompletionIcon.Function,
            detail: 'All columns',
            boost: 50,
            info: () =>
              createColumnInfoTooltip(
                '* All columns',
                'Selects all columns',
                tableName,
                false,
                undefined,
                schemaName
              ),
          },
          children: {},
        };

        // Add table node with column children
        const alias = generateTableAlias(tableName);
        tableChildren[tableName] = {
          self: {
            label: tableName,
            displayLabel: `${tableName} AS ${alias}`,
            type: CompletionIcon.Table,
            detail: `${tableInfo.columns.length} columns`,
            apply: `${tableName} AS ${alias}`,
            boost: 100,
            info: () =>
              createTableInfoTooltip(tableName, tableInfo, schemaName),
          },
          children: columnChildren,
        };
      }

      // Add schema node with table children
      hierarchicalSchema[schemaName] = {
        self: {
          label: schemaName,
          type: CompletionIcon.Database,
          detail: `${Object.keys(tableChildren).length} tables`,
        },
        children: tableChildren,
      };
    }
  }

  // Add file variables as completions
  const variableCompletions: Completion[] = [];

  if (fileVariables) {
    try {
      const varsJson = JSON.parse(fileVariables);
      for (const key in varsJson) {
        variableCompletions.push({
          label: `:${key}`,
          type: CompletionIcon.Variable,
          boost: 120,
          detail: 'variable',
          apply(view, completion, from, to) {
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
    } catch (error) {
      console.error('🚀 ~ mappedSchemaSuggestion ~ error:', error);
    }
  }

  return {
    schema: hierarchicalSchema,
    variableCompletions,
    defaultSchema: defaultSchemaName,
  };
}

// Re-export from other modules for backwards compatibility
// export {
//   createEnhancedSchema,
//   combineSchemaTableDetails,
//   createColumnCompletions,
//   type EnhancedSchemaConfig,
//   type CombinedTableDetails,
// } from './schemaCompletion';

// export {
//   extractTableAliases,
//   extractCTEDefinitions,
//   createAliasCompletionSource,
//   createCTECompletionSource,
//   type SchemasRef,
//   type TableAliasMap,
//   type CTEDefinition,
// } from './aliasCompletion';

// export { getMappedSchemaSuggestion } from './legacySchema';
