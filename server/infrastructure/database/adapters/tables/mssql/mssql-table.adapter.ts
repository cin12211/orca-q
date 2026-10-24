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
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';
import { MssqlAdapter } from '~/server/infrastructure/driver/mssql.adapter';
import { formatMssqlType } from '../../metadata/mssql/mssql-catalog';
import { resolveMetadataTypeAlias } from '../../metadata/type-alias.constants';
import { BaseDomainAdapter, createDatabaseHttpError } from '../../shared';
import type {
  DatabaseTableAdapterParams,
  IDatabaseTableAdapter,
} from '../types';
import { buildMssqlTableDdl, type MssqlDdlColumn } from './mssql-table-ddl';
import {
  OVERVIEW_TABLES_QUERY,
  TABLE_CHECKS_QUERY,
  TABLE_COLUMNS_QUERY,
  TABLE_FOREIGN_KEYS_QUERY,
  TABLE_INDEXES_QUERY,
  TABLE_META_QUERY,
  TABLE_TRIGGERS_QUERY,
} from './mssql-table.queries';

interface SizeRow {
  total_kb: number | null;
  data_kb: number | null;
  index_kb: number | null;
}

interface ColumnRow extends MssqlDdlColumn {
  column_comment: string | null;
  fk_text: string | null;
  on_delete: string | null;
  on_update: string | null;
}

interface IndexRow {
  index_name: string;
  is_unique: boolean;
  is_primary_key: boolean;
  is_unique_constraint: boolean;
  type_desc: string;
  key_columns: string;
  included_columns: string | null;
  filter_definition: string | null;
}

function formatKilobytes(value: number | null | undefined): string {
  const kilobytes = Number(value ?? 0);

  if (kilobytes >= 1024 * 1024) {
    return `${(kilobytes / 1024 / 1024).toFixed(2)} GB`;
  }

  if (kilobytes >= 1024) {
    return `${(kilobytes / 1024).toFixed(2)} MB`;
  }

  return `${kilobytes} kB`;
}

function quoteName(name: string): string {
  return `[${name.replace(/\]/g, ']]')}]`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  // Binary values are already rendered as 0x… hex literals by the driver.
  if (typeof value === 'string' && /^0x[0-9A-F]*$/.test(value)) return value;
  return `N'${String(value).replace(/'/g, "''")}'`;
}

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

  private get mssql(): MssqlAdapter {
    return MssqlTableAdapter.asMssqlAdapter(this.adapter);
  }

  private static asMssqlAdapter(adapter: IDatabaseAdapter): MssqlAdapter {
    if (!(adapter instanceof MssqlAdapter)) {
      throw createError({
        statusCode: 500,
        statusMessage:
          'SQL Server table adapter requires a SQL Server connection',
      });
    }

    return adapter;
  }

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
    const rows = await this.adapter.rawQuery<
      Omit<TableOverviewMetadata, 'total_size' | 'data_size' | 'index_size'> &
        SizeRow
    >(OVERVIEW_TABLES_QUERY, [schema]);

    return rows.map(({ total_kb, data_kb, index_kb, ...row }) => ({
      ...row,
      estimated_row:
        row.estimated_row != null ? Number(row.estimated_row) : null,
      total_size: formatKilobytes(total_kb),
      data_size: formatKilobytes(data_kb),
      index_size: formatKilobytes(index_kb),
    }));
  }

  private async getSizeRow(schema: string, tableName: string) {
    const [row] = await this.adapter.rawQuery<
      SizeRow & { owner: string; row_count: number | string | null }
    >(TABLE_META_QUERY, [schema, tableName]);

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    return row;
  }

  async getTableMeta(schema: string, tableName: string): Promise<TableMeta> {
    const row = await this.getSizeRow(schema, tableName);

    return {
      type: 'table',
      owner: row.owner,
      rowEstimate: row.row_count != null ? Number(row.row_count) : undefined,
      totalSize: formatKilobytes(row.total_kb),
      tableSize: formatKilobytes(row.data_kb),
      indexSize: formatKilobytes(row.index_kb),
    };
  }

  async getTableSize(schema: string, tableName: string): Promise<TableSize> {
    const row = await this.getSizeRow(schema, tableName);

    return {
      tableSize: formatKilobytes(row.total_kb),
      dataSize: formatKilobytes(row.data_kb),
      indexSize: formatKilobytes(row.index_kb),
    };
  }

  private getColumns(schema: string, tableName: string) {
    return this.adapter.rawQuery<ColumnRow>(TABLE_COLUMNS_QUERY, [
      schema,
      tableName,
    ]);
  }

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    const rows = await this.getColumns(schema, tableName);

    return rows.map(row => {
      const rawType = formatMssqlType(row);
      const shortType = resolveMetadataTypeAlias(this.dbType, rawType);

      return {
        column_name: row.column_name,
        raw_type_name: rawType,
        short_type_name: shortType,
        data_type: shortType,
        is_nullable: row.is_nullable ? 'YES' : 'NO',
        default_value: row.is_identity
          ? `IDENTITY(${row.identity_seed ?? 1},${row.identity_increment ?? 1})`
          : (row.computed_definition ?? row.default_value),
        foreign_keys: row.fk_text ?? '',
        on_delete: row.on_delete ?? undefined,
        on_update: row.on_update ?? undefined,
        column_comment: row.column_comment ?? '',
      };
    });
  }

  async getTableDdl(schema: string, tableName: string): Promise<string> {
    const [columns, indexes, checks, foreignKeys] = await Promise.all([
      this.getColumns(schema, tableName),
      this.adapter.rawQuery<IndexRow>(TABLE_INDEXES_QUERY, [schema, tableName]),
      this.adapter.rawQuery<{ name: string; definition: string }>(
        TABLE_CHECKS_QUERY,
        [schema, tableName]
      ),
      this.adapter.rawQuery<{
        name: string;
        columns: string;
        referenced_table: string;
        referenced_columns: string;
        on_delete: string;
        on_update: string;
      }>(TABLE_FOREIGN_KEYS_QUERY, [schema, tableName]),
    ]);

    if (!columns.length) {
      throw createError({
        statusCode: 404,
        message: `Table ${schema}.${tableName} not found`,
      });
    }

    return buildMssqlTableDdl({
      schema,
      tableName,
      columns,
      indexes: indexes.map(index => ({
        name: index.index_name,
        isPrimaryKey: Boolean(index.is_primary_key),
        isUnique: Boolean(index.is_unique),
        isUniqueConstraint: Boolean(index.is_unique_constraint),
        typeDesc: index.type_desc,
        keyColumns: index.key_columns,
        includedColumns: index.included_columns,
        filter: index.filter_definition,
      })),
      checks,
      foreignKeys,
    });
  }

  async getTableIndexes(
    schema: string,
    tableName: string
  ): Promise<TableIndex[]> {
    const rows = await this.adapter.rawQuery<IndexRow>(TABLE_INDEXES_QUERY, [
      schema,
      tableName,
    ]);
    const table = `${quoteName(schema)}.${quoteName(tableName)}`;

    return rows.map(row => {
      const include = row.included_columns
        ? ` INCLUDE (${row.included_columns})`
        : '';
      const where = row.filter_definition
        ? ` WHERE ${row.filter_definition}`
        : '';

      return {
        indexName: row.index_name,
        isUnique: Boolean(row.is_unique),
        isPrimary: Boolean(row.is_primary_key),
        method: row.type_desc.toLowerCase(),
        definition: `CREATE ${row.is_unique ? 'UNIQUE ' : ''}${row.type_desc} INDEX ${quoteName(row.index_name)} ON ${table} (${row.key_columns})${include}${where}`,
      };
    });
  }

  // Row-level security in SQL Server uses security policies, which are not
  // surfaced yet.
  async getTableRlsStatus(): Promise<RLSStatus> {
    return { enabled: false };
  }

  async getTableRlsPolicies(): Promise<RLSPolicy[]> {
    return [];
  }

  // SQL Server has no rewrite rules.
  async getTableRules(): Promise<TableRule[]> {
    return [];
  }

  async getTableTriggers(
    schema: string,
    tableName: string
  ): Promise<TableTrigger[]> {
    const rows = await this.adapter.rawQuery<{
      trigger_name: string;
      is_disabled: boolean;
      is_instead_of_trigger: boolean;
      events: string | null;
      definition: string | null;
    }>(TABLE_TRIGGERS_QUERY, [schema, tableName]);

    return rows.map(row => ({
      triggerName: row.trigger_name,
      enabled: !row.is_disabled,
      timing: row.is_instead_of_trigger ? 'INSTEAD OF' : 'AFTER',
      events: (row.events ?? '').split(',').filter(Boolean),
      orientation: 'STATEMENT',
      definition: row.definition ?? '',
    }));
  }

  private async executeStatements(
    statements: string[]
  ): Promise<BulkUpdateResponse> {
    const startTime = performance.now();

    try {
      const results = await this.mssql.executeInTransaction(statements);

      return {
        success: true,
        data: statements.map((query, index) => ({
          query,
          affectedRows: results[index]?.rowsAffected ?? 0,
          results: [],
        })),
        queryTime: Number((performance.now() - startTime).toFixed(2)),
      };
    } catch (error) {
      throw createDatabaseHttpError(this.dbType, error);
    }
  }

  async executeBulkDelete(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeStatements(statements);
  }

  async executeBulkUpdate(statements: string[]): Promise<BulkUpdateResponse> {
    return this.executeStatements(statements);
  }

  async exportTableData(
    schema: string,
    tableName: string,
    format: string
  ): Promise<string> {
    const table = `${quoteName(schema)}.${quoteName(tableName)}`;
    const result = await this.adapter.rawOut<unknown[]>(
      `SELECT * FROM ${table}`
    );
    const fields = (result.fields ?? []) as Array<{ name: string }>;
    const names = fields.map(field => field.name);

    if (format === 'csv') {
      const lines = [
        names.map(csvCell).join(','),
        ...result.rows.map(row => row.map(csvCell).join(',')),
      ];
      return `${lines.join('\n')}\n`;
    }

    if (format === 'json') {
      const objects = result.rows.map(row =>
        Object.fromEntries(names.map((name, index) => [name, row[index]]))
      );
      return JSON.stringify(objects, null, 2);
    }

    if (format === 'sql') {
      const columns = names.map(quoteName).join(', ');
      const inserts = result.rows.map(
        row =>
          `INSERT INTO ${table} (${columns}) VALUES (${row.map(sqlLiteral).join(', ')});`
      );

      return [
        `-- Export of ${schema}.${tableName}`,
        `-- Generated at ${new Date().toISOString()}`,
        '',
        ...inserts,
        '',
        `-- Total rows exported: ${result.rows.length}`,
        '',
      ].join('\n');
    }

    throw createError({ statusCode: 400, message: 'Invalid format' });
  }
}
