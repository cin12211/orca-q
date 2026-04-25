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
  const bytes = Number(value || 0);
  return `${bytes} B`;
}

function escapeMySqlIdentifier(identifier: string) {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

export class MysqlTableAdapter
  extends BaseDomainAdapter
  implements IDatabaseTableAdapter
{
  readonly dbType: DatabaseClientType;

  constructor(
    adapter: Awaited<ReturnType<typeof MysqlTableAdapter.resolveAdapter>>,
    dbType: DatabaseClientType
  ) {
    super(adapter);
    this.dbType = dbType;
  }

  static async create(
    params: DatabaseTableAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlTableAdapter> {
    const adapter = await MysqlTableAdapter.resolveAdapter(params, dbType);
    return new MysqlTableAdapter(adapter, dbType);
  }

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
    return this.adapter.rawQuery<TableOverviewMetadata>(
      `
        SELECT
          table_name AS name,
          table_schema AS schema,
          'TABLE' AS kind,
          '' AS owner,
          table_rows AS estimated_row,
          CONCAT(data_length + index_length, ' B') AS total_size,
          CONCAT(data_length, ' B') AS data_size,
          CONCAT(index_length, ' B') AS index_size,
          NULLIF(table_comment, '') AS comment
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `,
      [schema]
    );
  }

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    return this.adapter.rawQuery<TableStructure>(
      `
        SELECT
          c.column_name,
          c.column_type AS data_type,
          c.is_nullable,
          c.column_default AS default_value,
          COALESCE(
            GROUP_CONCAT(
              CONCAT('-> ', k.referenced_table_name, '.', k.referenced_column_name)
              SEPARATOR '\n'
            ),
            ''
          ) AS foreign_keys,
          NULLIF(c.column_comment, '') AS column_comment,
          MAX(rc.update_rule) AS on_update,
          MAX(rc.delete_rule) AS on_delete
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage k
          ON k.table_schema = c.table_schema
          AND k.table_name = c.table_name
          AND k.column_name = c.column_name
          AND k.referenced_table_name IS NOT NULL
        LEFT JOIN information_schema.referential_constraints rc
          ON rc.constraint_schema = k.constraint_schema
          AND rc.constraint_name = k.constraint_name
        WHERE c.table_schema = ?
          AND c.table_name = ?
        GROUP BY
          c.column_name,
          c.column_type,
          c.is_nullable,
          c.column_default,
          c.column_comment,
          c.ordinal_position
        ORDER BY c.ordinal_position
      `,
      [schema, tableName]
    );
  }

  async getTableSize(schema: string, tableName: string): Promise<TableSize> {
    const [row] = await this.adapter.rawQuery<{
      total_bytes: number | null;
      data_bytes: number | null;
      index_bytes: number | null;
    }>(
      `
        SELECT
          (data_length + index_length) AS total_bytes,
          data_length AS data_bytes,
          index_length AS index_bytes
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_name = ?
        LIMIT 1
      `,
      [schema, tableName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    return {
      tableSize: formatBytes(row.total_bytes),
      dataSize: formatBytes(row.data_bytes),
      indexSize: formatBytes(row.index_bytes),
    };
  }

  async getTableMeta(schema: string, tableName: string): Promise<TableMeta> {
    const [row] = await this.adapter.rawQuery<{
      table_type: string;
      engine: string | null;
      table_rows: number | null;
      total_bytes: number | null;
      data_bytes: number | null;
      index_bytes: number | null;
    }>(
      `
        SELECT
          table_type,
          engine,
          table_rows,
          (data_length + index_length) AS total_bytes,
          data_length AS data_bytes,
          index_length AS index_bytes
        FROM information_schema.tables
        WHERE table_schema = ?
          AND table_name = ?
        LIMIT 1
      `,
      [schema, tableName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    return {
      type: row.table_type || row.engine || 'table',
      owner: '',
      rowEstimate: row.table_rows || 0,
      totalSize: formatBytes(row.total_bytes),
      tableSize: formatBytes(row.data_bytes),
      indexSize: formatBytes(row.index_bytes),
    };
  }

  async getTableDdl(schema: string, tableName: string): Promise<string> {
    const qualifiedTable = `${escapeMySqlIdentifier(schema)}.${escapeMySqlIdentifier(tableName)}`;
    const result = await this.adapter.rawQuery<Record<string, string>>(
      `SHOW CREATE TABLE ${qualifiedTable}`
    );

    const createTableStatement = result[0]?.['Create Table'];

    if (!createTableStatement) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    return createTableStatement;
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
          index_name,
          non_unique AS is_unique,
          CASE WHEN index_name = 'PRIMARY' THEN 1 ELSE 0 END AS is_primary,
          index_type AS method,
          column_name
        FROM information_schema.statistics
        WHERE table_schema = ?
          AND table_name = ?
        ORDER BY index_name, seq_in_index
      `,
      [schema, tableName]
    );

    const grouped = new Map<string, TableIndex>();

    rows.forEach(row => {
      const existing = grouped.get(row.index_name);
      const definitionPart = row.column_name;

      if (existing) {
        existing.definition = `${existing.definition}, ${definitionPart}`;
        return;
      }

      grouped.set(row.index_name, {
        indexName: row.index_name,
        isUnique: row.is_unique === 0,
        isPrimary: row.is_primary === 1,
        method: row.method,
        definition: definitionPart,
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
    return this.adapter.rawQuery<TableTrigger>(
      `
        SELECT
          trigger_name AS triggerName,
          1 AS enabled,
          action_timing AS timing,
          JSON_ARRAY(event_manipulation) AS events,
          action_orientation AS orientation,
          action_statement AS definition
        FROM information_schema.triggers
        WHERE trigger_schema = ?
          AND event_object_table = ?
        ORDER BY trigger_name
      `,
      [schema, tableName]
    );
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
    const qualifiedTable = `${escapeMySqlIdentifier(schema)}.${escapeMySqlIdentifier(tableName)}`;
    return this.adapter.rawQuery(`SELECT * FROM ${qualifiedTable}`);
  }
}
