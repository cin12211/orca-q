import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
  generateObject,
  stepCountIs,
  tool,
} from 'ai';
import { createError, defineEventHandler, readBody } from 'h3';
import { z } from 'zod/v4';
import type {
  AgentAnomalyCheck,
  AgentAnomalyIssue,
  AgentDescribeColumn,
  AgentDescribeTableResult,
  AgentExplainQueryResult,
  AgentGenerateQueryResult,
  AgentRenderTableResult,
  DbAgentRequestBody,
  DbAgentSchemaSnapshot,
} from '~/components/modules/agent/db-agent.types';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getDatabaseSource } from '~/server/infrastructure/driver/db-connection';

type AIProvider = 'openai' | 'google' | 'anthropic' | 'xai';
type DatabaseAdapter = Awaited<ReturnType<typeof getDatabaseSource>>;

const DEFAULT_RENDER_LIMIT = 100;
const MAX_RENDER_LIMIT = 500;
const SELECT_PATTERN = /^(select|with|values|table)\b/i;
const MUTATION_PATTERN =
  /^(insert|update|delete|drop|truncate|alter|create|grant|revoke|comment|refresh|vacuum)\b/i;
const NUMERIC_COLUMN_PATTERN =
  /(smallint|integer|bigint|decimal|numeric|real|double precision|float|serial)/i;

const POSTGRES_OID_TYPE_MAP: Record<number, string> = {
  16: 'bool',
  20: 'int8',
  21: 'int2',
  23: 'int4',
  25: 'text',
  114: 'json',
  700: 'float4',
  701: 'float8',
  1043: 'varchar',
  1082: 'date',
  1114: 'timestamp',
  1184: 'timestamptz',
  1700: 'numeric',
  2950: 'uuid',
  3802: 'jsonb',
};

function createProviderModel(
  provider: AIProvider,
  apiKey: string,
  model: string
) {
  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai(model);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(model);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model);
    }
    case 'xai': {
      const xai = createXai({ apiKey });
      return xai(model);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function stripMarkdownCodeFence(sql: string) {
  const trimmed = sql.trim();
  const match = trimmed.match(/^```(?:sql)?\s*([\s\S]*?)```$/i);
  return match?.[1]?.trim() || trimmed;
}

function normalizeSql(sql: string) {
  return stripSqlComments(stripMarkdownCodeFence(sql))
    .trim()
    .replace(/;+\s*$/, '');
}

function isSelectLikeSql(sql: string) {
  return SELECT_PATTERN.test(normalizeSql(sql));
}

function isMutationSql(sql: string) {
  return MUTATION_PATTERN.test(normalizeSql(sql));
}

function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_RENDER_LIMIT;
  }

  return Math.max(1, Math.min(limit, MAX_RENDER_LIMIT));
}

function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }

  return `"${identifier.replace(/"/g, '""')}"`;
}

function getQualifiedTableName(schemaName: string, tableName: string) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

function resolveFieldType(field: Record<string, any>) {
  const oid = Number(field?.dataTypeID);
  return POSTGRES_OID_TYPE_MAP[oid] || String(field?.dataTypeID || 'unknown');
}

function rowsToRecords(
  rows: unknown[],
  fields: Array<Record<string, any>> = []
): Record<string, unknown>[] {
  return rows.map(row => {
    if (Array.isArray(row)) {
      return row.reduce<Record<string, unknown>>((record, value, index) => {
        const name = fields[index]?.name || `column_${index + 1}`;
        record[name] = value;
        return record;
      }, {});
    }

    return (row || {}) as Record<string, unknown>;
  });
}

function getCountFromRows(rows: Record<string, unknown>[]) {
  const firstRow = rows[0];
  if (!firstRow) {
    return 0;
  }

  const countValue = Object.values(firstRow)[0];
  const parsed = Number(countValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findCanonicalTableName(
  snapshot: DbAgentSchemaSnapshot | undefined,
  requestedTableName: string
) {
  const trimmed = requestedTableName.trim();

  if (!snapshot) {
    return trimmed;
  }

  const exactMatch = snapshot.tables.find(name => name === trimmed);
  if (exactMatch) {
    return exactMatch;
  }

  const lowerCaseMatch = snapshot.tables.find(
    name => name.toLowerCase() === trimmed.toLowerCase()
  );

  if (!lowerCaseMatch) {
    throw new Error(
      `Table "${requestedTableName}" does not exist in schema ${snapshot.schemaName}.`
    );
  }

  return lowerCaseMatch;
}

function resolveTableDetail(
  snapshot: DbAgentSchemaSnapshot | undefined,
  requestedTableName: string
) {
  if (!snapshot?.tableDetails) {
    throw new Error('Schema metadata is not available for this workspace.');
  }

  const tableName = findCanonicalTableName(snapshot, requestedTableName);
  const detail = snapshot.tableDetails[tableName];

  if (!detail) {
    throw new Error(`Missing metadata for table "${tableName}".`);
  }

  return { tableName, detail };
}

function assertDatabaseAdapter(
  adapter: DatabaseAdapter | null
): asserts adapter is DatabaseAdapter {
  if (!adapter) {
    throw new Error('A database connection is required for this tool.');
  }
}

function toColumnsForDescribe(
  detail: NonNullable<DbAgentSchemaSnapshot['tableDetails']>[string]
): AgentDescribeColumn[] {
  const primaryKeys = new Set(detail.primary_keys.map(key => key.column));
  const foreignKeys = new Map(
    detail.foreign_keys.map(key => [key.column, key] as const)
  );

  return detail.columns.map(column => {
    const foreignKey = foreignKeys.get(column.name);

    return {
      name: column.name,
      type: column.short_type_name || column.type,
      isPrimaryKey: primaryKeys.has(column.name),
      isForeignKey: !!foreignKey,
      isNullable: column.is_nullable,
      referencesTable: foreignKey?.referenced_table,
      description: buildColumnDescription(column.name),
    };
  });
}

function buildColumnDescription(columnName: string) {
  const normalized = columnName.toLowerCase();

  if (normalized === 'id') {
    return 'Primary identifier for each row.';
  }

  if (normalized.endsWith('_id')) {
    return 'Reference to a related record.';
  }

  if (normalized.includes('created_at')) {
    return 'Timestamp when the row was created.';
  }

  if (normalized.includes('updated_at')) {
    return 'Timestamp when the row was last updated.';
  }

  if (normalized.includes('status')) {
    return 'Lifecycle or state marker for the row.';
  }

  return undefined;
}

function buildTableSummary(
  tableName: string,
  columns: AgentDescribeColumn[],
  relatedTables: string[]
) {
  const readableName = tableName.replace(/_/g, ' ');
  const summaryLines = [`Table ${tableName} stores ${readableName} records.`];

  if (relatedTables.length > 0) {
    summaryLines.push(
      `It is directly related to ${relatedTables.slice(0, 4).join(', ')}.`
    );
  }

  const importantColumns = columns
    .filter(column => column.isPrimaryKey || column.isForeignKey)
    .map(column => column.name);

  if (importantColumns.length > 0) {
    summaryLines.push(
      `Key columns include ${importantColumns.slice(0, 4).join(', ')}.`
    );
  }

  return summaryLines.join(' ');
}

function formatPlanTree(node: Record<string, any>, depth = 0): string[] {
  const indent = '  '.repeat(depth);
  const relationSuffix = node['Relation Name']
    ? ` on ${node['Relation Name']}`
    : '';
  const cost = `${Number(node['Startup Cost'] || 0).toFixed(2)}..${Number(
    node['Total Cost'] || 0
  ).toFixed(2)}`;
  const actual = node['Actual Total Time']
    ? ` actual=${Number(node['Actual Total Time']).toFixed(2)}ms`
    : '';

  const currentLine = `${indent}${node['Node Type']}${relationSuffix} (cost=${cost}${actual})`;
  const childLines = Array.isArray(node.Plans)
    ? node.Plans.flatMap((child: Record<string, any>) =>
        formatPlanTree(child, depth + 1)
      )
    : [];

  return [currentLine, ...childLines];
}

function findSlowestPlanNode(node: Record<string, any>): Record<string, any> {
  const children = Array.isArray(node.Plans) ? node.Plans : [];

  return children.reduce((slowest, child) => {
    const nestedSlowest = findSlowestPlanNode(child);
    const slowestCost = Number(
      slowest['Actual Total Time'] || slowest['Total Cost'] || 0
    );
    const nestedCost = Number(
      nestedSlowest['Actual Total Time'] || nestedSlowest['Total Cost'] || 0
    );

    return nestedCost > slowestCost ? nestedSlowest : slowest;
  }, node);
}

function buildExplainSuggestions(slowestNode: Record<string, any>) {
  const suggestions: string[] = [];
  const nodeType = String(slowestNode['Node Type'] || '');
  const relationName = String(slowestNode['Relation Name'] || '').trim();
  const filter = String(slowestNode.Filter || '').trim();
  const sortKey = Array.isArray(slowestNode['Sort Key'])
    ? slowestNode['Sort Key'].join(', ')
    : '';

  if (nodeType.includes('Seq Scan') && relationName) {
    suggestions.push(
      `Consider an index on ${relationName}${filter ? ` for filter ${filter}` : ''}.`
    );
  }

  if (nodeType.includes('Sort') && sortKey) {
    suggestions.push(`Consider an index that supports ORDER BY ${sortKey}.`);
  }

  if (nodeType.includes('Nested Loop') || nodeType.includes('Hash Join')) {
    suggestions.push(
      'Review join predicates and ensure join keys are indexed.'
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      'Review the slowest plan node, filter predicates, and row estimates before tuning.'
    );
  }

  return suggestions;
}

function buildExplainSummary(slowestNode: Record<string, any>) {
  const nodeType = String(slowestNode['Node Type'] || 'Plan node');
  const relationName = String(slowestNode['Relation Name'] || '').trim();
  const cost = Number(
    slowestNode['Actual Total Time'] || slowestNode['Total Cost'] || 0
  );

  if (relationName) {
    return `${nodeType} on ${relationName} is the dominant cost in this plan (${cost.toFixed(2)}).`;
  }

  return `${nodeType} is the dominant cost in this plan (${cost.toFixed(2)}).`;
}

function getIssueSeverity(ratio: number): AgentAnomalyIssue['severity'] {
  if (ratio >= 0.2) {
    return 'high';
  }

  if (ratio >= 0.05) {
    return 'medium';
  }

  return 'low';
}

function calculateCleanScore(issues: AgentAnomalyIssue[]) {
  const score = issues.reduce((currentScore, issue) => {
    if (issue.severity === 'high') {
      return currentScore - 25;
    }

    if (issue.severity === 'medium') {
      return currentScore - 12;
    }

    return currentScore - 5;
  }, 100);

  return Math.max(0, score);
}

function buildDuplicateCandidates(
  detail: NonNullable<DbAgentSchemaSnapshot['tableDetails']>[string]
) {
  const primaryKeys = new Set(detail.primary_keys.map(key => key.column));

  return detail.columns
    .filter(column => {
      if (primaryKeys.has(column.name)) {
        return false;
      }

      if (column.is_nullable) {
        return false;
      }

      const name = column.name.toLowerCase();

      return (
        name === 'email' ||
        name === 'slug' ||
        name === 'code' ||
        name.endsWith('_code') ||
        name.endsWith('_number')
      );
    })
    .slice(0, 3);
}

async function renderTableResult(
  adapter: DatabaseAdapter,
  sql: string,
  limit: number
): Promise<AgentRenderTableResult> {
  const normalizedSql = normalizeSql(sql);

  if (!normalizedSql) {
    throw new Error('SQL is required.');
  }

  if (!isSelectLikeSql(normalizedSql)) {
    const mutationResult = await adapter.rawOut(normalizedSql);

    return {
      columns: [
        { name: 'operation', type: 'text' },
        { name: 'affected_rows', type: 'integer' },
      ],
      rows: [
        {
          operation: mutationResult.command || 'MUTATION',
          affected_rows: mutationResult.rowCount || 0,
        },
      ],
      rowCount: 1,
      truncated: false,
    };
  }

  const safeLimit = clampLimit(limit);
  const wrappedSql = `SELECT * FROM (${normalizedSql}) AS agent_result LIMIT ${safeLimit + 1}`;
  const result = await adapter.rawOut(wrappedSql);
  const rows = rowsToRecords(result.rows || [], result.fields || []);
  const truncated = rows.length > safeLimit;
  const visibleRows = truncated ? rows.slice(0, safeLimit) : rows;

  return {
    columns: (result.fields || []).map(field => ({
      name: field.name,
      type: resolveFieldType(field),
    })),
    rows: visibleRows,
    rowCount: visibleRows.length,
    truncated,
  };
}

function createDbAgentTools({
  model,
  adapter,
  dialect,
  schemaContext,
  schemaSnapshot,
}: {
  model: ReturnType<typeof createProviderModel>;
  adapter: DatabaseAdapter | null;
  dialect: DbAgentRequestBody['dialect'];
  schemaContext?: string;
  schemaSnapshot?: DbAgentSchemaSnapshot;
}) {
  return {
    generate_query: tool({
      description:
        'Convert a natural language request into SQL for the active database schema.',
      inputSchema: z.object({
        prompt: z.string().min(1),
        schema: z.string().optional(),
        dialect: z
          .enum(['postgresql', 'mysql', 'sqlite'])
          .default('postgresql'),
      }),
      execute: async input => {
        const result = await generateObject({
          model,
          schema: z.object({
            sql: z.string().min(1),
            isMutation: z.boolean(),
            explanation: z.string().min(1),
          }),
          prompt: [
            `You convert user requests into ${input.dialect || dialect || 'postgresql'} SQL.`,
            'Return a single SQL statement only.',
            'Prefer SELECT queries unless the user explicitly requests a mutation.',
            'Never reference tables or columns outside the provided schema context.',
            input.schema || schemaContext || 'No schema context is available.',
            `User request: ${input.prompt}`,
          ].join('\n\n'),
        });

        const sql = normalizeSql(result.object.sql);
        const isMutation = result.object.isMutation || isMutationSql(sql);

        return {
          sql,
          isMutation,
          explanation: result.object.explanation,
        } satisfies AgentGenerateQueryResult;
      },
    }),
    render_table: tool({
      description:
        'Execute SQL and return a structured table result for the current database.',
      inputSchema: z.object({
        sql: z.string().min(1),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_RENDER_LIMIT)
          .default(DEFAULT_RENDER_LIMIT),
      }),
      needsApproval: input => isMutationSql(input.sql),
      execute: async input => {
        assertDatabaseAdapter(adapter);
        return renderTableResult(adapter, input.sql, input.limit);
      },
    }),
    explain_query: tool({
      description:
        'Run EXPLAIN on a query and return a readable summary of the plan.',
      inputSchema: z.object({
        sql: z.string().min(1),
      }),
      execute: async input => {
        assertDatabaseAdapter(adapter);

        const normalizedSql = normalizeSql(input.sql);
        const explainPrefix = isMutationSql(normalizedSql)
          ? 'EXPLAIN (FORMAT JSON)'
          : 'EXPLAIN (ANALYZE, FORMAT JSON)';
        const result = await adapter.rawOut(
          `${explainPrefix} ${normalizedSql}`
        );
        const rows = rowsToRecords(result.rows || [], result.fields || []);
        const planValue = rows[0]?.['QUERY PLAN'];
        const planJson = Array.isArray(planValue) ? planValue[0] : planValue;
        const rootPlan = (planJson as Record<string, any> | undefined)?.Plan;

        if (!rootPlan) {
          throw new Error('Could not parse the EXPLAIN plan.');
        }

        const slowestNode = findSlowestPlanNode(rootPlan);
        const rawPlan = formatPlanTree(rootPlan).join('\n');

        return {
          rawPlan,
          summary: buildExplainSummary(slowestNode),
          slowestNode: String(slowestNode['Node Type'] || 'Unknown'),
          estimatedCost: Number(rootPlan['Total Cost'] || 0),
          suggestions: buildExplainSuggestions(slowestNode),
        } satisfies AgentExplainQueryResult;
      },
    }),
    detect_anomaly: tool({
      description:
        'Scan a table for nulls, duplicate identifiers, orphan foreign keys, and numeric outliers.',
      inputSchema: z.object({
        tableName: z.string().min(1),
        checks: z
          .array(z.enum(['nulls', 'duplicates', 'orphan_fk', 'outliers']))
          .default(['nulls', 'duplicates', 'orphan_fk']),
      }),
      execute: async input => {
        assertDatabaseAdapter(adapter);

        const { tableName, detail } = resolveTableDetail(
          schemaSnapshot,
          input.tableName
        );
        const qualifiedTable = getQualifiedTableName(
          schemaSnapshot?.schemaName || 'public',
          tableName
        );
        const issues: AgentAnomalyIssue[] = [];
        const countResult = await adapter.rawOut(
          `SELECT COUNT(*)::int AS total FROM ${qualifiedTable}`
        );
        const totalRows = getCountFromRows(
          rowsToRecords(countResult.rows || [], countResult.fields || [])
        );

        if (input.checks.includes('nulls') && totalRows > 0) {
          const nullableCandidates = detail.columns
            .filter(column => column.is_nullable)
            .slice(0, 8);

          for (const column of nullableCandidates) {
            const result = await adapter.rawOut(
              `SELECT COUNT(*)::int AS count FROM ${qualifiedTable} WHERE ${quoteIdentifier(column.name)} IS NULL`
            );
            const nullCount = getCountFromRows(
              rowsToRecords(result.rows || [], result.fields || [])
            );

            if (nullCount <= 0) {
              continue;
            }

            const ratio = totalRows === 0 ? 0 : nullCount / totalRows;

            issues.push({
              type: 'nulls',
              severity: getIssueSeverity(ratio),
              column: column.name,
              description: `${column.name} has ${nullCount} NULL values (${(ratio * 100).toFixed(1)}% of scanned rows).`,
              fixSql: `UPDATE ${qualifiedTable} SET ${quoteIdentifier(column.name)} = /* default value */ WHERE ${quoteIdentifier(column.name)} IS NULL;`,
            });
          }
        }

        if (input.checks.includes('duplicates') && totalRows > 0) {
          for (const column of buildDuplicateCandidates(detail)) {
            const result = await adapter.rawOut(
              `SELECT COUNT(*)::int AS duplicate_groups FROM (
                SELECT ${quoteIdentifier(column.name)}
                FROM ${qualifiedTable}
                WHERE ${quoteIdentifier(column.name)} IS NOT NULL
                GROUP BY ${quoteIdentifier(column.name)}
                HAVING COUNT(*) > 1
              ) duplicate_values`
            );

            const duplicateGroups = getCountFromRows(
              rowsToRecords(result.rows || [], result.fields || [])
            );

            if (duplicateGroups <= 0) {
              continue;
            }

            issues.push({
              type: 'duplicates',
              severity: duplicateGroups > 10 ? 'high' : 'medium',
              column: column.name,
              description: `${duplicateGroups} duplicate value groups were found in ${column.name}.`,
              fixSql: `SELECT ${quoteIdentifier(column.name)}, COUNT(*) FROM ${qualifiedTable} GROUP BY ${quoteIdentifier(column.name)} HAVING COUNT(*) > 1;`,
            });
          }
        }

        if (input.checks.includes('orphan_fk') && totalRows > 0) {
          for (const foreignKey of detail.foreign_keys) {
            const referencedTable = getQualifiedTableName(
              foreignKey.referenced_table_schema,
              foreignKey.referenced_table
            );
            const result = await adapter.rawOut(
              `SELECT COUNT(*)::int AS count
               FROM ${qualifiedTable} source
               LEFT JOIN ${referencedTable} target
                 ON source.${quoteIdentifier(foreignKey.column)} = target.${quoteIdentifier(foreignKey.referenced_column)}
               WHERE source.${quoteIdentifier(foreignKey.column)} IS NOT NULL
                 AND target.${quoteIdentifier(foreignKey.referenced_column)} IS NULL`
            );
            const orphanCount = getCountFromRows(
              rowsToRecords(result.rows || [], result.fields || [])
            );

            if (orphanCount <= 0) {
              continue;
            }

            const ratio = totalRows === 0 ? 0 : orphanCount / totalRows;

            issues.push({
              type: 'orphan_fk',
              severity: getIssueSeverity(ratio),
              column: foreignKey.column,
              description: `${orphanCount} rows in ${tableName}.${foreignKey.column} reference missing ${foreignKey.referenced_table}.${foreignKey.referenced_column} rows.`,
              fixSql: `DELETE FROM ${qualifiedTable} WHERE ${quoteIdentifier(foreignKey.column)} IS NOT NULL AND ${quoteIdentifier(foreignKey.column)} NOT IN (SELECT ${quoteIdentifier(foreignKey.referenced_column)} FROM ${referencedTable});`,
            });
          }
        }

        if (input.checks.includes('outliers') && totalRows > 0) {
          const numericColumns = detail.columns
            .filter(column => NUMERIC_COLUMN_PATTERN.test(column.type))
            .slice(0, 4);

          for (const column of numericColumns) {
            const result = await adapter.rawOut(
              `WITH stats AS (
                 SELECT
                   percentile_cont(0.25) WITHIN GROUP (ORDER BY ${quoteIdentifier(column.name)}) AS q1,
                   percentile_cont(0.75) WITHIN GROUP (ORDER BY ${quoteIdentifier(column.name)}) AS q3
                 FROM ${qualifiedTable}
                 WHERE ${quoteIdentifier(column.name)} IS NOT NULL
               )
               SELECT COUNT(*)::int AS count
               FROM ${qualifiedTable}, stats
               WHERE ${quoteIdentifier(column.name)} IS NOT NULL
                 AND (
                   ${quoteIdentifier(column.name)} < q1 - 1.5 * (q3 - q1)
                   OR ${quoteIdentifier(column.name)} > q3 + 1.5 * (q3 - q1)
                 )`
            );

            const outlierCount = getCountFromRows(
              rowsToRecords(result.rows || [], result.fields || [])
            );

            if (outlierCount <= 0) {
              continue;
            }

            const ratio = totalRows === 0 ? 0 : outlierCount / totalRows;

            issues.push({
              type: 'outliers',
              severity: getIssueSeverity(ratio),
              column: column.name,
              description: `${outlierCount} potential outliers were found in ${column.name}.`,
              fixSql: `SELECT * FROM ${qualifiedTable} ORDER BY ${quoteIdentifier(column.name)} DESC LIMIT 20;`,
            });
          }
        }

        return {
          issues,
          scannedRows: totalRows,
          cleanScore: calculateCleanScore(issues),
        };
      },
    }),
    describe_table: tool({
      description:
        'Summarize a table, its columns, and its direct relationships using schema metadata.',
      inputSchema: z.object({
        tableName: z.string().min(1),
      }),
      execute: async input => {
        const { tableName, detail } = resolveTableDetail(
          schemaSnapshot,
          input.tableName
        );
        const columns = toColumnsForDescribe(detail);
        const relatedTables = Array.from(
          new Set(detail.foreign_keys.map(key => key.referenced_table))
        );

        return {
          tableName,
          summary: buildTableSummary(tableName, columns, relatedTables),
          columns,
          relatedTables,
        } satisfies AgentDescribeTableResult;
      },
    }),
  };
}

export default defineEventHandler(async event => {
  const body = await readBody<DbAgentRequestBody>(event);
  const {
    provider,
    model,
    apiKey,
    messages,
    systemPrompt,
    dbConnectionString,
    dialect,
    schemaContext,
    schemaSnapshot,
  } = body;

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      message: 'API key is required',
    });
  }

  if (!provider || !model) {
    throw createError({
      statusCode: 400,
      message: 'Provider and model are required',
    });
  }

  try {
    const providerModel = createProviderModel(
      provider as AIProvider,
      apiKey,
      model
    );
    const adapter = dbConnectionString
      ? await getDatabaseSource({
          dbConnectionString,
          type: DatabaseClientType.POSTGRES,
        })
      : null;

    const agent = new ToolLoopAgent({
      model: providerModel,
      instructions: systemPrompt,
      tools: createDbAgentTools({
        model: providerModel,
        adapter,
        dialect,
        schemaContext,
        schemaSnapshot,
      }),
      stopWhen: stepCountIs(5),
    });

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: messages || [],
    });
  } catch (error: any) {
    console.error('DB Agent API Error:', error);
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process DB agent request',
    });
  }
});
