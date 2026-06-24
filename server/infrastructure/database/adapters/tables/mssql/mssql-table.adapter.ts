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

export class MssqlTableAdapter
  extends BaseDomainAdapter
  implements IDatabaseTableAdapter
{
  readonly dbType = DatabaseClientType.MSSQL;

  static async create(
    params: DatabaseTableAdapterParams
  ): Promise<MssqlTableAdapter> {
    const adapter = await MssqlTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.MSSQL
    );
    return new MssqlTableAdapter(adapter);
  }

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
    return this.adapter.rawQuery<TableOverviewMetadata>(
      `
        SELECT
          TABLE_NAME AS name,
          TABLE_SCHEMA AS [schema],
          'TABLE' AS kind,
          TABLE_SCHEMA AS owner,
          NULL AS estimated_row,
          '0 B' AS total_size,
          '0 B' AS data_size,
          '0 B' AS index_size,
          NULL AS comment
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `,
      [schema]
    );
  }

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    const columns = await this.adapter.rawQuery<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      default_value: string | null;
    }>(
      `
        SELECT
          COLUMN_NAME AS column_name,
          DATA_TYPE AS data_type,
          IS_NULLABLE AS is_nullable,
          COLUMN_DEFAULT AS default_value
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `,
      [schema, tableName]
    );

    return columns.map<TableStructure>(column => ({
      column_name: column.column_name,
      data_type: column.data_type,
      is_nullable: column.is_nullable as 'YES' | 'NO',
      default_value: column.default_value,
      foreign_keys: '',
      column_comment: '',
    }));
  }

  async getTableSize(_schema: string, _tableName: string): Promise<TableSize> {
    return {
      tableSize: '0 B',
      dataSize: '0 B',
      indexSize: '0 B',
    };
  }

  async getTableMeta(schema: string, tableName: string): Promise<TableMeta> {
    const [countRow] = await this.adapter.rawQuery<{ row_count: number }>(
      `SELECT COUNT(*) AS row_count FROM [${schema}].[${tableName}]`
    );

    return {
      type: 'TABLE',
      owner: schema,
      rowEstimate: countRow?.row_count || 0,
      totalSize: '0 B',
      tableSize: '0 B',
      indexSize: '0 B',
    };
  }

  async getTableDdl(schema: string, tableName: string): Promise<string> {
    const columns = await this.getTableStructure(schema, tableName);
    if (columns.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    const ddlColumns = columns.map(column => {
      let line = `  [${column.column_name}] ${column.data_type}`;

      if (column.default_value) {
        line += ` DEFAULT ${column.default_value}`;
      }

      if (column.is_nullable === 'NO') {
        line += ' NOT NULL';
      }

      return line;
    });

    return `CREATE TABLE [${schema}].[${tableName}] (\n${ddlColumns.join(',\n')}\n);`;
  }

  async getTableIndexes(
    _schema: string,
    _tableName: string
  ): Promise<TableIndex[]> {
    return [];
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
    _schema: string,
    _tableName: string
  ): Promise<TableTrigger[]> {
    return [];
  }

  private async executeStatements(
    statements: string[]
  ): Promise<BulkUpdateResponse> {
    const BULK_CHUNK_SIZE = 500;
    const startTime = performance.now();

    try {
      const data = [] as NonNullable<BulkUpdateResponse['data']>;

      for (let i = 0; i < statements.length; i += BULK_CHUNK_SIZE) {
        const chunk = statements.slice(i, i + BULK_CHUNK_SIZE);
        for (const statement of chunk) {
          const result = await this.adapter.rawOut(statement);
          data.push({
            query: statement,
            affectedRows: result.rowCount || 0,
            results: result.rows as Record<string, unknown>[],
          });
        }
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
    return this.adapter.rawQuery(`SELECT * FROM [${schema}].[${tableName}]`);
  }
}
