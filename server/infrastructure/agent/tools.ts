import { generateText, tool, Output, type LanguageModel } from 'ai';
import { z } from 'zod/v4';
import type {
  AgentDescribeTableResult,
  AgentExplainQueryResult,
  AgentGenerateQueryResult,
  AgentVisualizeTableResult,
  DbAgentRequestBody,
  DbAgentSchemaSnapshot,
} from '~/components/modules/agent/types';
import { AgentToolName } from '~/components/modules/agent/types';
import {
  getQualifiedTableName,
  isMutationSql,
  MAX_RENDER_LIMIT,
  normalizeSql,
} from './core/sql';
import type { DatabaseAdapter, QueryPlan, RawQueryResult } from './core/types';
import {
  buildExplainSuggestions,
  buildExplainSummary,
  findSlowestPlanNode,
  formatPlanTree,
} from './renderers/explain';
import {
  getCountFromRows,
  renderTableResult,
  rowsToRecords,
  visualizeTableResult,
} from './renderers/render';
import {
  assertDatabaseAdapter,
  buildDuplicateCandidates,
  buildSchemaContext,
  buildTableSummary,
  calculateCleanScore,
  getIssueSeverity,
  getNumericColumns,
  resolveTableDetail,
  toColumnsForDescribe,
  toQuotedColumnName,
} from './schema/schema';

// ─── Helper: tìm snapshot chứa table cần tìm ─────────────────────────────────
// detect_anomaly và describe_table cần single snapshot đúng schema
// Ưu tiên: snapshot nào có tableName trong tables list → dùng cái đó
// Fallback: snapshot đầu tiên
function findSnapshotForTable(
  schemaSnapshots: DbAgentSchemaSnapshot[] | undefined,
  schemaName: string
): DbAgentSchemaSnapshot | undefined {
  if (!schemaSnapshots?.length) return undefined;

  const snapshot =
    schemaSnapshots.find(
      s => s.name.toLowerCase() === schemaName.toLowerCase()
    ) || schemaSnapshots[0];

  return snapshot;
}

// ─── Active tools resolver ────────────────────────────────────────────────────
export function resolveActiveTools(
  adapter: DatabaseAdapter | null,
  schemaSnapshots?: DbAgentSchemaSnapshot[]
): AgentToolName[] {
  const hasSnapshot = !!schemaSnapshots?.length;

  if (adapter) {
    return [
      AgentToolName.GenerateQuery,
      AgentToolName.RenderTable,
      AgentToolName.VisualizeTable,
      AgentToolName.ExplainQuery,
      ...(hasSnapshot
        ? [AgentToolName.DetectAnomaly, AgentToolName.DescribeTable]
        : []),
      AgentToolName.AskClarification,
    ];
  }

  // Không có adapter: chỉ schema-based tools
  return hasSnapshot
    ? [
        AgentToolName.GenerateQuery,
        AgentToolName.DescribeTable,
        AgentToolName.AskClarification,
      ]
    : [AgentToolName.GenerateQuery, AgentToolName.AskClarification];
}

// ─── Tools ────────────────────────────────────────────────────────────────────
export function createDbAgentTools({
  model,
  adapter,
  dialect,
  schemaSnapshots,
}: {
  model: LanguageModel;
  adapter: DatabaseAdapter | null;
  dialect: DbAgentRequestBody['dialect'];
  schemaSnapshots?: DbAgentSchemaSnapshot[];
}) {
  // Full schema context từ tất cả snapshots — dùng trong descriptions và generate_query
  const resolvedSchemaContext = buildSchemaContext(schemaSnapshots);

  return {
    generate_query: tool({
      description:
        'Convert a natural language request into SQL for the active database schema. Always call this first before render_table.',
      inputSchema: z.object({
        prompt: z.string().min(1),
        // schema override per-call nếu agent muốn pass schema cụ thể
        schema: z.string().optional(),
        dialect: z
          .enum(['postgresql', 'mysql', 'sqlite'])
          .default('postgresql'),
      }),
      execute: async input => {
        const result = await generateText({
          model,
          system: [
            `You convert user requests into ${input.dialect || dialect || 'postgresql'} SQL.`,
            'Return a single SQL statement only.',
            'Default to SELECT queries. Only generate mutation SQL (INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER) when the user EXPLICITLY and clearly requests a data change.',
            'If the intent is ambiguous, generate a SELECT instead.',
            'Never reference tables or columns outside the provided schema context.',
            'Set isMutation: true for ANY statement that modifies data or schema.',
          ].join('\n'),
          prompt: [
            // input.schema (per-call override) → full snapshot context → fallback
            `Schema:\n${input.schema || resolvedSchemaContext}`,
            `User request: ${input.prompt}`,
          ].join('\n\n'),
          output: Output.object({
            schema: z.object({
              sql: z.string().describe('A single valid SQL statement.'),
              isMutation: z
                .boolean()
                .describe(
                  'True if the SQL modifies data (INSERT/UPDATE/DELETE/DROP etc).'
                ),
              explanation: z
                .string()
                .describe(
                  'A short plain-English explanation of what the query does.'
                ),
            }),
          }),
        });

        const parsed = result.output;
        const sql = normalizeSql(parsed.sql);
        const isMutation = parsed.isMutation || isMutationSql(sql);

        return {
          sql,
          isMutation,
          explanation: parsed.explanation,
        } satisfies AgentGenerateQueryResult;
      },
    }),

    render_table: tool({
      description:
        'Execute SQL and return results. For SELECT queries, call immediately after generate_query. ' +
        'For mutation SQL (INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER), this tool requires explicit user approval — ' +
        'NEVER call it with mutation SQL unless the user has confirmed after seeing the SQL.',
      inputSchema: z.object({
        sql: z.string().min(1),
        limit: z.number().int().min(1).max(MAX_RENDER_LIMIT).default(100),
      }),
      needsApproval: (input: { sql: string }) => isMutationSql(input.sql),
      execute: async input => {
        assertDatabaseAdapter(adapter);
        return renderTableResult(adapter, input.sql, input.limit);
      },
    }),

    visualize_table: tool({
      description:
        'Execute a read-only SQL query and render a chart. Use this when the user wants a visualization and has chosen one of these chart types: bar, line, pie, or scatter. Ask the user to choose a chart type before calling this tool if they did not specify one.',
      inputSchema: z.object({
        sql: z.string().min(1),
        chartType: z.enum(['bar', 'line', 'pie', 'scatter']),
      }),
      execute: async input => {
        assertDatabaseAdapter(adapter);

        const result = await visualizeTableResult(
          adapter,
          input.sql,
          input.chartType
        );

        return result satisfies AgentVisualizeTableResult;
      },
    }),

    explain_query: tool({
      description:
        'Run EXPLAIN on a query and return a readable summary of the execution plan. Use this when the user asks about query performance, slow queries, or indexes.',
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
        'Scan a table for data quality issues: nulls, duplicate identifiers, orphan foreign keys, and numeric outliers. Use when the user asks about data quality or cleanliness.',
      inputSchema: z.object({
        tableName: z.string().min(1),
        schemaName: z.string().min(1),
        checks: z
          .array(z.enum(['nulls', 'duplicates', 'orphan_fk', 'outliers']))
          .default(['nulls', 'duplicates', 'orphan_fk']),
      }),
      execute: async input => {
        assertDatabaseAdapter(adapter);

        // Tìm snapshot chứa table này, không hardcode snapshot đầu tiên
        const snapshot = findSnapshotForTable(
          schemaSnapshots,
          input.schemaName
        );
        const { tableName, detail } = resolveTableDetail(
          snapshot,
          input.tableName
        );
        const qualifiedTable = getQualifiedTableName(
          snapshot?.name || 'public',
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

            if (nullCount <= 0) continue;

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

            if (duplicateGroups <= 0) continue;

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

            if (orphanCount <= 0) continue;

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

            if (outlierCount <= 0) continue;

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
        'Summarize a table, its columns, and its direct relationships using schema metadata. Use this when the user asks about table structure, columns, or relationships.',
      inputSchema: z.object({
        tableName: z.string().min(1),
        schemaName: z.string().min(1),
      }),
      execute: async input => {
        // Tìm đúng snapshot chứa table này
        const snapshot = findSnapshotForTable(
          schemaSnapshots,
          input.schemaName
        );
        const { tableName, detail } = resolveTableDetail(
          snapshot,
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

    askClarification: tool({
      description:
        'Ask the user clarifying questions when their request is genuinely ambiguous. ' +
        'Call this tool at most ONCE per user message. ' +
        'Never call it again after the conversation contains a "[Quiz answers]" message.',
      inputSchema: z.object({
        context: z
          .string()
          .describe('One sentence explaining why clarification is needed.'),
        questions: z
          .array(
            z.object({
              id: z
                .string()
                .describe('Short camelCase identifier, e.g. "lang"'),
              question: z.string(),
              type: z.enum(['single', 'multiple', 'open']),
              suggestions: z
                .array(z.string())
                .min(0)
                .max(5)
                .describe('3–5 suggestion chips shown to the user'),
              required: z.boolean(),
            })
          )
          .min(1)
          .max(5),
      }),
      execute: async () => ({ acknowledged: true }) as const,
    }),
  };
}
