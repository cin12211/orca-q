import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  BulkUpdateResponse,
  RLSPolicy,
  RLSStatus,
  TableIndex,
  TableMeta,
  TableOverviewMetadata,
  TableRule,
  TableSize,
  TableStructure,
  TableTrigger,
} from '~/core/types';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseTableAdapterParams,
  IDatabaseTableAdapter,
} from '../types';

function formatBytes(value?: number | null) {
  return `${Number(value || 0)} B`;
}

function escapeOracleIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function buildQualifiedTable(schema: string, tableName: string) {
  return `${escapeOracleIdentifier(schema)}.${escapeOracleIdentifier(tableName)}`;
}

function formatOracleType(column: {
  data_type: string;
  data_length: number | null;
  data_precision: number | null;
  data_scale: number | null;
}) {
  if (column.data_type === 'NUMBER' && column.data_precision !== null) {
    return column.data_scale !== null
      ? `NUMBER(${column.data_precision}, ${column.data_scale})`
      : `NUMBER(${column.data_precision})`;
  }

  if (
    ['VARCHAR2', 'NVARCHAR2', 'CHAR', 'NCHAR', 'RAW'].includes(
      column.data_type
    ) &&
    column.data_length !== null
  ) {
    return `${column.data_type}(${column.data_length})`;
  }

  return column.data_type;
}

interface OracleColumnRow {
  column_name: string;
  column_id: number;
  data_type: string;
  data_length: number | null;
  data_precision: number | null;
  data_scale: number | null;
  nullable: 'Y' | 'N';
  default_value: string | null;
  column_comment: string | null;
}

interface OracleForeignKeyConstraintRow {
  constraint_name: string;
  column_name: string;
  referenced_owner: string;
  referenced_table_name: string;
  referenced_column_name: string;
  delete_rule: string;
}

interface OraclePrimaryKeyRow {
  column_name: string;
}

export class OracleTableAdapter
  extends BaseDomainAdapter
  implements IDatabaseTableAdapter
{
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseTableAdapterParams
  ): Promise<OracleTableAdapter> {
    const adapter = await OracleTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.ORACLE
    );

    return new OracleTableAdapter(adapter);
  }

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
    return this.adapter.rawQuery<TableOverviewMetadata>(
      `
        SELECT
          t.table_name AS name,
          t.owner AS schema,
          'TABLE' AS kind,
          t.owner AS owner,
          t.num_rows AS estimated_row,
          TO_CHAR(NVL(tb.table_bytes, 0) + NVL(ix.index_bytes, 0)) || ' B' AS total_size,
          TO_CHAR(NVL(tb.table_bytes, 0)) || ' B' AS data_size,
          TO_CHAR(NVL(ix.index_bytes, 0)) || ' B' AS index_size,
          c.comments AS comment
        FROM all_tables t
        LEFT JOIN (
          SELECT owner, segment_name, SUM(bytes) AS table_bytes
          FROM all_segments
          WHERE segment_type LIKE 'TABLE%'
          GROUP BY owner, segment_name
        ) tb
          ON tb.owner = t.owner
          AND tb.segment_name = t.table_name
        LEFT JOIN (
          SELECT ai.table_owner AS owner, ai.table_name, SUM(NVL(s.bytes, 0)) AS index_bytes
          FROM all_indexes ai
          LEFT JOIN all_segments s
            ON s.owner = ai.owner
            AND s.segment_name = ai.index_name
          GROUP BY ai.table_owner, ai.table_name
        ) ix
          ON ix.owner = t.owner
          AND ix.table_name = t.table_name
        LEFT JOIN all_tab_comments c
          ON c.owner = t.owner
          AND c.table_name = t.table_name
        WHERE t.owner = :1
        ORDER BY t.table_name
      `,
      [schema]
    );
  }

  private async getForeignKeyConstraints(schema: string, tableName: string) {
    return this.adapter.rawQuery<OracleForeignKeyConstraintRow>(
      `
        SELECT
          ac.constraint_name,
          acc.column_name,
          r_acc.owner AS referenced_owner,
          r_acc.table_name AS referenced_table_name,
          r_acc.column_name AS referenced_column_name,
          ac.delete_rule
        FROM all_constraints ac
        JOIN all_cons_columns acc
          ON acc.owner = ac.owner
          AND acc.constraint_name = ac.constraint_name
        JOIN all_constraints r_ac
          ON r_ac.owner = ac.r_owner
          AND r_ac.constraint_name = ac.r_constraint_name
        JOIN all_cons_columns r_acc
          ON r_acc.owner = r_ac.owner
          AND r_acc.constraint_name = r_ac.constraint_name
          AND r_acc.position = acc.position
        WHERE ac.constraint_type = 'R'
          AND ac.owner = :1
          AND ac.table_name = :2
        ORDER BY acc.position
      `,
      [schema, tableName]
    );
  }

  private async getPrimaryKeyColumns(schema: string, tableName: string) {
    return this.adapter.rawQuery<OraclePrimaryKeyRow>(
      `
        SELECT acc.column_name
        FROM all_constraints ac
        JOIN all_cons_columns acc
          ON acc.owner = ac.owner
          AND acc.constraint_name = ac.constraint_name
        WHERE ac.constraint_type = 'P'
          AND ac.owner = :1
          AND ac.table_name = :2
        ORDER BY acc.position
      `,
      [schema, tableName]
    );
  }

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    const [columns, foreignKeys] = await Promise.all([
      this.adapter.rawQuery<OracleColumnRow>(
        `
          SELECT
            c.column_name,
            c.column_id,
            c.data_type,
            c.data_length,
            c.data_precision,
            c.data_scale,
            c.nullable,
            TRIM(c.data_default) AS default_value,
            col.comments AS column_comment
          FROM all_tab_columns c
          LEFT JOIN all_col_comments col
            ON col.owner = c.owner
            AND col.table_name = c.table_name
            AND col.column_name = c.column_name
          WHERE c.owner = :1
            AND c.table_name = :2
          ORDER BY c.column_id
        `,
        [schema, tableName]
      ),
      this.getForeignKeyConstraints(schema, tableName),
    ]);

    const foreignKeyMap = new Map<string, OracleForeignKeyConstraintRow[]>();

    foreignKeys.forEach(foreignKey => {
      const list = foreignKeyMap.get(foreignKey.column_name) || [];
      list.push(foreignKey);
      foreignKeyMap.set(foreignKey.column_name, list);
    });

    return columns.map<TableStructure>(column => ({
      column_name: column.column_name,
      data_type: formatOracleType(column),
      is_nullable: column.nullable === 'Y' ? 'YES' : 'NO',
      default_value: column.default_value,
      foreign_keys: (foreignKeyMap.get(column.column_name) || [])
        .map(
          foreignKey =>
            ` -> ${foreignKey.referenced_owner}.${foreignKey.referenced_table_name}(${foreignKey.referenced_column_name})`
        )
        .join('\n'),
      column_comment: column.column_comment || '',
      on_delete: (foreignKeyMap.get(column.column_name) || [])[0]?.delete_rule,
    }));
  }

  async getTableSize(schema: string, tableName: string): Promise<TableSize> {
    const [row] = await this.adapter.rawQuery<{
      table_bytes: number | null;
      index_bytes: number | null;
    }>(
      `
        SELECT
          NVL(tb.table_bytes, 0) AS table_bytes,
          NVL(ix.index_bytes, 0) AS index_bytes
        FROM dual
        LEFT JOIN (
          SELECT SUM(bytes) AS table_bytes
          FROM all_segments
          WHERE owner = :1
            AND segment_name = :2
            AND segment_type LIKE 'TABLE%'
        ) tb ON 1 = 1
        LEFT JOIN (
          SELECT SUM(NVL(s.bytes, 0)) AS index_bytes
          FROM all_indexes ai
          LEFT JOIN all_segments s
            ON s.owner = ai.owner
            AND s.segment_name = ai.index_name
          WHERE ai.table_owner = :1
            AND ai.table_name = :2
        ) ix ON 1 = 1
      `,
      [schema, tableName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    return {
      tableSize: formatBytes((row.table_bytes || 0) + (row.index_bytes || 0)),
      dataSize: formatBytes(row.table_bytes),
      indexSize: formatBytes(row.index_bytes),
    };
  }

  async getTableMeta(schema: string, tableName: string): Promise<TableMeta> {
    const [row] = await this.adapter.rawQuery<{
      owner: string;
      num_rows: number | null;
      table_bytes: number | null;
      index_bytes: number | null;
    }>(
      `
        SELECT
          t.owner,
          t.num_rows,
          NVL(tb.table_bytes, 0) AS table_bytes,
          NVL(ix.index_bytes, 0) AS index_bytes
        FROM all_tables t
        LEFT JOIN (
          SELECT owner, segment_name, SUM(bytes) AS table_bytes
          FROM all_segments
          WHERE segment_type LIKE 'TABLE%'
          GROUP BY owner, segment_name
        ) tb
          ON tb.owner = t.owner
          AND tb.segment_name = t.table_name
        LEFT JOIN (
          SELECT ai.table_owner AS owner, ai.table_name, SUM(NVL(s.bytes, 0)) AS index_bytes
          FROM all_indexes ai
          LEFT JOIN all_segments s
            ON s.owner = ai.owner
            AND s.segment_name = ai.index_name
          GROUP BY ai.table_owner, ai.table_name
        ) ix
          ON ix.owner = t.owner
          AND ix.table_name = t.table_name
        WHERE t.owner = :1
          AND t.table_name = :2
      `,
      [schema, tableName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    return {
      type: 'TABLE',
      owner: row.owner,
      rowEstimate: row.num_rows || 0,
      totalSize: formatBytes((row.table_bytes || 0) + (row.index_bytes || 0)),
      tableSize: formatBytes(row.table_bytes),
      indexSize: formatBytes(row.index_bytes),
    };
  }

  async getTableDdl(schema: string, tableName: string): Promise<string> {
    const [columns, primaryKeys, foreignKeys] = await Promise.all([
      this.getTableStructure(schema, tableName),
      this.getPrimaryKeyColumns(schema, tableName),
      this.getForeignKeyConstraints(schema, tableName),
    ]);

    if (!columns.length) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    const lines = columns.map(column => {
      let line = `  ${escapeOracleIdentifier(column.column_name)} ${column.data_type}`;

      if (column.default_value) {
        line += ` DEFAULT ${column.default_value}`;
      }

      if (column.is_nullable === 'NO') {
        line += ' NOT NULL';
      }

      return line;
    });

    if (primaryKeys.length) {
      lines.push(
        `  PRIMARY KEY (${primaryKeys
          .map(primaryKey => escapeOracleIdentifier(primaryKey.column_name))
          .join(', ')})`
      );
    }

    foreignKeys.forEach(foreignKey => {
      const deleteClause =
        foreignKey.delete_rule && foreignKey.delete_rule !== 'NO ACTION'
          ? ` ON DELETE ${foreignKey.delete_rule}`
          : '';

      lines.push(
        `  CONSTRAINT ${escapeOracleIdentifier(
          foreignKey.constraint_name
        )} FOREIGN KEY (${escapeOracleIdentifier(
          foreignKey.column_name
        )}) REFERENCES ${buildQualifiedTable(
          foreignKey.referenced_owner,
          foreignKey.referenced_table_name
        )} (${escapeOracleIdentifier(foreignKey.referenced_column_name)})${deleteClause}`
      );
    });

    return `CREATE TABLE ${buildQualifiedTable(schema, tableName)} (\n${lines.join(',\n')}\n);`;
  }

  async getTableIndexes(
    schema: string,
    tableName: string
  ): Promise<TableIndex[]> {
    const rows = await this.adapter.rawQuery<{
      index_name: string;
      is_unique: number;
      is_primary: number;
      method: string;
      column_name: string;
    }>(
      `
        SELECT
          ai.index_name,
          CASE WHEN ai.uniqueness = 'UNIQUE' THEN 1 ELSE 0 END AS is_unique,
          CASE WHEN pk.constraint_name IS NOT NULL THEN 1 ELSE 0 END AS is_primary,
          ai.index_type AS method,
          aic.column_name
        FROM all_indexes ai
        JOIN all_ind_columns aic
          ON aic.index_owner = ai.owner
          AND aic.index_name = ai.index_name
        LEFT JOIN all_constraints pk
          ON pk.owner = ai.table_owner
          AND pk.index_name = ai.index_name
          AND pk.constraint_type = 'P'
        WHERE ai.table_owner = :1
          AND ai.table_name = :2
        ORDER BY ai.index_name, aic.column_position
      `,
      [schema, tableName]
    );

    const grouped = new Map<string, TableIndex>();

    rows.forEach(row => {
      const existing = grouped.get(row.index_name);

      if (existing) {
        existing.definition = `${existing.definition}, ${row.column_name}`;
        return;
      }

      grouped.set(row.index_name, {
        indexName: row.index_name,
        isUnique: row.is_unique === 1,
        isPrimary: row.is_primary === 1,
        method: row.method,
        definition: row.column_name,
      });
    });

    return Array.from(grouped.values());
  }

  async getTableRlsStatus(): Promise<RLSStatus> {
    return { enabled: false };
  }

  async getTableRlsPolicies(): Promise<RLSPolicy[]> {
    return [];
  }

  async getTableRules(): Promise<TableRule[]> {
    return [];
  }

  async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    const rows = await this.adapter.rawQuery<{
      trigger_name: string;
      status: string;
      trigger_type: string;
      triggering_event: string;
      trigger_body: string | null;
      description: string | null;
    }>(
      `
        SELECT
          trigger_name,
          status,
          trigger_type,
          triggering_event,
          trigger_body,
          description
        FROM all_triggers
        WHERE table_owner = :1
          AND table_name = :2
        ORDER BY trigger_name
      `,
      [schema, tableName]
    );

    return rows.map<TableTrigger>(row => ({
      triggerName: row.trigger_name,
      enabled: row.status === 'ENABLED',
      timing: row.trigger_type.split(' ', 1)[0] || row.trigger_type,
      events: row.triggering_event.split(/\s+OR\s+/),
      orientation: row.trigger_type.includes('EACH ROW') ? 'ROW' : 'STATEMENT',
      definition: row.trigger_body || row.description || '',
    }));
  }

  private async executeStatements(
    statements: string[]
  ): Promise<BulkUpdateResponse> {
    const startTime = performance.now();

    try {
      const data = [] as NonNullable<BulkUpdateResponse['data']>;

      for (const statement of statements) {
        const result = await this.adapter.rawOut(statement);
        data.push({
          query: statement,
          affectedRows: result.rowCount || 0,
          results: result.rows as Record<string, unknown>[],
        });
      }

      return {
        success: true,
        data,
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to execute statements',
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      };
    }
  }

  async executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeStatements(statements);
  }

  async executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeStatements(statements);
  }

  async exportTableData(schema: string, tableName: string): Promise<any> {
    return this.adapter.rawQuery(
      `SELECT * FROM ${buildQualifiedTable(schema, tableName)}`
    );
  }
}
