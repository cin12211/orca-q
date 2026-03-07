import { generateObject, tool, type LanguageModel } from 'ai';
import { z } from 'zod/v4';
import type {
  AgentDescribeTableResult,
  AgentExplainQueryResult,
  AgentGenerateQueryResult,
  DbAgentRequestBody,
  DbAgentSchemaSnapshot,
} from '~/components/modules/agent/types';
import {
  buildExplainSuggestions,
  buildExplainSummary,
  findSlowestPlanNode,
  formatPlanTree,
} from './explain';
import { getCountFromRows, renderTableResult, rowsToRecords } from './render';
import {
  assertDatabaseAdapter,
  buildDuplicateCandidates,
  buildTableSummary,
  calculateCleanScore,
  getIssueSeverity,
  getNumericColumns,
  resolveTableDetail,
  toColumnsForDescribe,
  toQuotedColumnName,
} from './schema';
import {
  getQualifiedTableName,
  isMutationSql,
  MAX_RENDER_LIMIT,
  normalizeSql,
} from './sql';
import type { DatabaseAdapter, QueryPlan, RawQueryResult } from './types';

export function createDbAgentTools({
  model,
  adapter,
  dialect,
  schemaContext,
  schemaSnapshot,
}: {
  model: LanguageModel;
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
        limit: z.number().int().min(1).max(MAX_RENDER_LIMIT).default(100),
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
        const result = (await adapter.rawOut(
          `${explainPrefix} ${normalizedSql}`
        )) as RawQueryResult;
        const rows = rowsToRecords(result.rows || [], result.fields || []);
        const planValue = rows[0]?.['QUERY PLAN'];
        const planJson = Array.isArray(planValue) ? planValue[0] : planValue;
        const rootPlan = (planJson as Record<string, unknown> | undefined)
          ?.Plan as QueryPlan | undefined;

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
        const issues = [] as Array<{
          type: 'nulls' | 'duplicates' | 'orphan_fk' | 'outliers';
          severity: 'high' | 'medium' | 'low';
          column?: string;
          description: string;
          fixSql?: string;
        }>;
        const countResult = (await adapter.rawOut(
          `SELECT COUNT(*)::int AS total FROM ${qualifiedTable}`
        )) as RawQueryResult;
        const totalRows = getCountFromRows(
          rowsToRecords(countResult.rows || [], countResult.fields || [])
        );

        if (input.checks.includes('nulls') && totalRows > 0) {
          const nullableCandidates = detail.columns
            .filter(column => column.is_nullable)
            .slice(0, 8);

          for (const column of nullableCandidates) {
            const result = (await adapter.rawOut(
              `SELECT COUNT(*)::int AS count FROM ${qualifiedTable} WHERE ${toQuotedColumnName(column.name)} IS NULL`
            )) as RawQueryResult;
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
              fixSql: `UPDATE ${qualifiedTable} SET ${toQuotedColumnName(column.name)} = /* default value */ WHERE ${toQuotedColumnName(column.name)} IS NULL;`,
            });
          }
        }

        if (input.checks.includes('duplicates') && totalRows > 0) {
          for (const column of buildDuplicateCandidates(detail)) {
            const result = (await adapter.rawOut(
              `SELECT COUNT(*)::int AS duplicate_groups FROM (
                SELECT ${toQuotedColumnName(column.name)}
                FROM ${qualifiedTable}
                WHERE ${toQuotedColumnName(column.name)} IS NOT NULL
                GROUP BY ${toQuotedColumnName(column.name)}
                HAVING COUNT(*) > 1
              ) duplicate_values`
            )) as RawQueryResult;
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
              fixSql: `SELECT ${toQuotedColumnName(column.name)}, COUNT(*) FROM ${qualifiedTable} GROUP BY ${toQuotedColumnName(column.name)} HAVING COUNT(*) > 1;`,
            });
          }
        }

        if (input.checks.includes('orphan_fk') && totalRows > 0) {
          for (const foreignKey of detail.foreign_keys ?? []) {
            const referencedTable = getQualifiedTableName(
              foreignKey.referenced_table_schema,
              foreignKey.referenced_table
            );
            const result = (await adapter.rawOut(
              `SELECT COUNT(*)::int AS count
               FROM ${qualifiedTable} source
               LEFT JOIN ${referencedTable} target
                 ON source.${toQuotedColumnName(foreignKey.column)} = target.${toQuotedColumnName(foreignKey.referenced_column)}
               WHERE source.${toQuotedColumnName(foreignKey.column)} IS NOT NULL
                 AND target.${toQuotedColumnName(foreignKey.referenced_column)} IS NULL`
            )) as RawQueryResult;
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
              fixSql: `DELETE FROM ${qualifiedTable} WHERE ${toQuotedColumnName(foreignKey.column)} IS NOT NULL AND ${toQuotedColumnName(foreignKey.column)} NOT IN (SELECT ${toQuotedColumnName(foreignKey.referenced_column)} FROM ${referencedTable});`,
            });
          }
        }

        if (input.checks.includes('outliers') && totalRows > 0) {
          for (const column of getNumericColumns(detail)) {
            const result = (await adapter.rawOut(
              `WITH stats AS (
                 SELECT
                   percentile_cont(0.25) WITHIN GROUP (ORDER BY ${toQuotedColumnName(column.name)}) AS q1,
                   percentile_cont(0.75) WITHIN GROUP (ORDER BY ${toQuotedColumnName(column.name)}) AS q3
                 FROM ${qualifiedTable}
                 WHERE ${toQuotedColumnName(column.name)} IS NOT NULL
               )
               SELECT COUNT(*)::int AS count
               FROM ${qualifiedTable}, stats
               WHERE ${toQuotedColumnName(column.name)} IS NOT NULL
                 AND (
                   ${toQuotedColumnName(column.name)} < q1 - 1.5 * (q3 - q1)
                   OR ${toQuotedColumnName(column.name)} > q3 + 1.5 * (q3 - q1)
                 )`
            )) as RawQueryResult;
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
              fixSql: `SELECT * FROM ${qualifiedTable} ORDER BY ${toQuotedColumnName(column.name)} DESC LIMIT 20;`,
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
          new Set((detail.foreign_keys ?? []).map(key => key.referenced_table))
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
