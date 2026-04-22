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

function escapeSqliteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteSqliteString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildQualifiedTable(schema: string, tableName: string) {
  return `${escapeSqliteIdentifier(schema)}.${escapeSqliteIdentifier(tableName)}`;
}

interface SqliteTableInfoRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface SqliteForeignKeyRow {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
}

export class SqliteTableAdapter
  extends BaseDomainAdapter
  implements IDatabaseTableAdapter
{
  readonly dbType = DatabaseClientType.SQLITE3;

  static async create(
    params: DatabaseTableAdapterParams
  ): Promise<SqliteTableAdapter> {
    const adapter = await SqliteTableAdapter.resolveAdapter(
      params,
      DatabaseClientType.SQLITE3
    );

    return new SqliteTableAdapter(adapter);
  }

  private async getTableInfo(schema: string, tableName: string) {
    return this.adapter.rawQuery<SqliteTableInfoRow>(
      `PRAGMA ${escapeSqliteIdentifier(schema)}.table_info(${quoteSqliteString(tableName)})`
    );
  }

  private async getForeignKeys(schema: string, tableName: string) {
    return this.adapter.rawQuery<SqliteForeignKeyRow>(
      `PRAGMA ${escapeSqliteIdentifier(schema)}.foreign_key_list(${quoteSqliteString(tableName)})`
    );
  }

  async getOverviewTables(schema: string): Promise<TableOverviewMetadata[]> {
    return this.adapter.rawQuery<TableOverviewMetadata>(
      `
        SELECT
          name,
          ${quoteSqliteString(schema)} AS schema,
          'TABLE' AS kind,
          ${quoteSqliteString(schema)} AS owner,
          NULL AS estimated_row,
          '0 B' AS total_size,
          '0 B' AS data_size,
          '0 B' AS index_size,
          NULL AS comment
        FROM ${escapeSqliteIdentifier(schema)}.sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
    );
  }

  async getTableStructure(
    schema: string,
    tableName: string
  ): Promise<TableStructure[]> {
    const [columns, foreignKeys] = await Promise.all([
      this.getTableInfo(schema, tableName),
      this.getForeignKeys(schema, tableName),
    ]);

    const foreignKeyMap = new Map<string, SqliteForeignKeyRow[]>();

    foreignKeys.forEach(foreignKey => {
      const list = foreignKeyMap.get(foreignKey.from) || [];
      list.push(foreignKey);
      foreignKeyMap.set(foreignKey.from, list);
    });

    return columns.map<TableStructure>(column => ({
      column_name: column.name,
      data_type: column.type,
      is_nullable: column.notnull === 0 ? 'YES' : 'NO',
      default_value: column.dflt_value,
      foreign_keys: (foreignKeyMap.get(column.name) || [])
        .map(foreignKey => ` -> ${foreignKey.table}(${foreignKey.to})`)
        .join('\n'),
      column_comment: '',
      on_update: (foreignKeyMap.get(column.name) || [])[0]?.on_update,
      on_delete: (foreignKeyMap.get(column.name) || [])[0]?.on_delete,
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
      `SELECT COUNT(*) AS row_count FROM ${buildQualifiedTable(schema, tableName)}`
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
    const [row] = await this.adapter.rawQuery<{ sql: string | null }>(
      `
        SELECT sql
        FROM ${escapeSqliteIdentifier(schema)}.sqlite_master
        WHERE type = 'table'
          AND name = ?
      `,
      [tableName]
    );

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Table not found' });
    }

    if (row.sql) {
      return row.sql;
    }

    const columns = await this.getTableStructure(schema, tableName);
    const ddlColumns = columns.map(column => {
      let line = `  ${escapeSqliteIdentifier(column.column_name)} ${column.data_type}`;

      if (column.default_value) {
        line += ` DEFAULT ${column.default_value}`;
      }

      if (column.is_nullable === 'NO') {
        line += ' NOT NULL';
      }

      return line;
    });

    return `CREATE TABLE ${buildQualifiedTable(schema, tableName)} (\n${ddlColumns.join(',\n')}\n);`;
  }

  async getTableIndexes(
    schema: string,
    tableName: string
  ): Promise<TableIndex[]> {
    const indexes = await this.adapter.rawQuery<{
      name: string;
      unique: number;
      origin: string;
    }>(
      `PRAGMA ${escapeSqliteIdentifier(schema)}.index_list(${quoteSqliteString(tableName)})`
    );

    const results: TableIndex[] = [];

    for (const index of indexes) {
      const columns = await this.adapter.rawQuery<{ name: string }>(
        `PRAGMA ${escapeSqliteIdentifier(schema)}.index_info(${quoteSqliteString(index.name)})`
      );

      results.push({
        indexName: index.name,
        isUnique: index.unique === 1,
        isPrimary: index.origin === 'pk',
        method: 'BTREE',
        definition: columns.map(column => column.name).join(', '),
      });
    }

    return results;
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
      name: string;
      sql: string | null;
    }>(
      `
        SELECT name, sql
        FROM ${escapeSqliteIdentifier(schema)}.sqlite_master
        WHERE type = 'trigger'
          AND tbl_name = ?
        ORDER BY name
      `,
      [tableName]
    );

    return rows.map<TableTrigger>(row => {
      const definition = row.sql || '';
      const timingMatch = definition.match(/\b(BEFORE|AFTER|INSTEAD OF)\b/i);
      const events = definition.match(/\b(INSERT|UPDATE|DELETE)\b/gi) || [];

      return {
        triggerName: row.name,
        enabled: true,
        timing: timingMatch?.[1]?.toUpperCase() || 'AFTER',
        events: events.map(event => event.toUpperCase()),
        orientation: 'ROW',
        definition,
      };
    });
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
