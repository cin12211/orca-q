import type {
  AgentAnomalyIssue,
  AgentDescribeColumn,
  DbAgentSchemaSnapshot,
} from '~/components/modules/agent/types';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~/core/types';
import { quoteIdentifier } from '../core/sql';
import type { DatabaseAdapter } from '../core/types';

const NUMERIC_COLUMN_PATTERN =
  /(smallint|integer|bigint|decimal|numeric|real|double precision|float|serial)/i;

type TableDetail = NonNullable<DbAgentSchemaSnapshot['tableDetails']>[string];

export function findCanonicalTableName(
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
      `Table "${requestedTableName}" does not exist in schema ${snapshot.name}.`
    );
  }

  return lowerCaseMatch;
}

export function resolveTableDetail(
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

export function assertDatabaseAdapter(
  adapter: DatabaseAdapter | null
): asserts adapter is DatabaseAdapter {
  if (!adapter) {
    throw new Error('A database connection is required for this tool.');
  }
}

export function buildColumnDescription(columnName: string) {
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

export function toColumnsForDescribe(
  detail: TableDetail
): AgentDescribeColumn[] {
  const primaryKeys = new Set(
    (detail.primary_keys ?? []).map(key => key.column)
  );
  const foreignKeys = new Map(
    (detail.foreign_keys ?? []).map(key => [key.column, key])
  );

  return (detail.columns ?? []).map(column => {
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

export function buildTableSummary(
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

export function getIssueSeverity(ratio: number): AgentAnomalyIssue['severity'] {
  if (ratio >= 0.2) {
    return 'high';
  }

  if (ratio >= 0.05) {
    return 'medium';
  }

  return 'low';
}

export function calculateCleanScore(issues: AgentAnomalyIssue[]) {
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

export function buildDuplicateCandidates(detail: TableDetail) {
  const primaryKeys = new Set(
    (detail.primary_keys ?? []).map(key => key.column)
  );

  return (detail.columns ?? [])
    .filter(column => {
      if (primaryKeys.has(column.name) || column.is_nullable) {
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

export function getNumericColumns(detail: TableDetail) {
  return (detail.columns ?? [])
    .filter(column => NUMERIC_COLUMN_PATTERN.test(column.type))
    .slice(0, 4);
}

export function toQuotedColumnName(columnName: string) {
  return quoteIdentifier(columnName);
}

export function serializeSingleSnapshot(
  schema: DbAgentSchemaSnapshot
): string[] {
  const { name, tables, tableDetails, views, viewDetails, functions } = schema;
  const lines: string[] = [];

  const parts: string[] = [`${tables.length} tables`];
  if (views.length) parts.push(`${views.length} views`);
  if (functions.length) parts.push(`${functions.length} functions`);
  lines.push(`Schema: ${name} (${parts.join(', ')})`);

  if (tables.length && tableDetails) {
    lines.push('');
    lines.push('  Tables:');

    for (const tableName of tables) {
      const detail = tableDetails[tableName];
      if (!detail) {
        lines.push(`    - ${name}.${tableName}`);
        continue;
      }

      lines.push('');
      lines.push(`    Table: ${name}.${tableName}`);

      if (detail.columns?.length) {
        const pkSet = new Set((detail.primary_keys ?? []).map(k => k.column));
        const fkSet = new Set((detail.foreign_keys ?? []).map(k => k.column));

        for (const c of detail.columns) {
          const flags: string[] = [];
          if (pkSet.has(c.name)) flags.push('PK');
          if (fkSet.has(c.name)) flags.push('FK');
          if (!c.is_nullable) flags.push('NOT NULL');

          const typeName = c.short_type_name || c.type;
          const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
          lines.push(`      - ${c.name}: ${typeName}${flagStr}`);
        }
      }

      if (detail.foreign_keys?.length) {
        lines.push('      References:');
        for (const fk of detail.foreign_keys) {
          lines.push(
            `        ${tableName}.${fk.column} → ${fk.referenced_table_schema}.${fk.referenced_table}.${fk.referenced_column}`
          );
        }
      }
    }
  }

  if (views.length) {
    lines.push('');
    lines.push('  Views:');

    for (const view of views) {
      const typeLabel =
        view.type === ViewSchemaEnum.MaterializedView
          ? 'MATERIALIZED VIEW'
          : 'VIEW';
      const detail = viewDetails?.[view.name];

      if (!detail?.columns?.length) {
        lines.push(`    - ${name}.${view.name} (${typeLabel})`);
        continue;
      }

      lines.push('');
      lines.push(`    View: ${name}.${view.name} (${typeLabel})`);
      for (const c of detail.columns) {
        const typeName = c.short_type_name || c.type;
        const nullable = c.is_nullable ? '' : ' NOT NULL';
        lines.push(`      - ${c.name}: ${typeName}${nullable}`);
      }
    }
  }

  if (functions.length) {
    lines.push('');
    lines.push('  Functions:');

    for (const fn of functions) {
      const typeLabel =
        fn.type === FunctionSchemaEnum.Procedure ? 'PROCEDURE' : 'FUNCTION';
      const params = fn.parameters || 'none';
      lines.push(`    - ${fn.name} (${typeLabel}) params: ${params}`);
    }
  }

  return lines;
}

export function buildSchemaContext(
  schemaSnapshot?: DbAgentSchemaSnapshot | DbAgentSchemaSnapshot[]
): string {
  const snapshots = !schemaSnapshot
    ? []
    : Array.isArray(schemaSnapshot)
      ? schemaSnapshot
      : [schemaSnapshot];

  if (snapshots.length === 0) {
    return 'No schema context is currently loaded.';
  }

  const lines: string[] = [];

  if (snapshots.length > 0) {
    lines.push(`Available schemas (${snapshots.length}):`);
    for (const snapshot of snapshots) {
      lines.push('');
      lines.push(...serializeSingleSnapshot(snapshot));
    }
  }

  return lines.join('\n');
}
